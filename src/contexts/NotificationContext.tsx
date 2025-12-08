import React, { createContext, useState, ReactNode } from 'react'
import { Notification } from '../components/Notification'

interface NotificationData {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface NotificationContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString()
    const newNotification: NotificationData = {
      id,
      message,
      type
    }

    setNotifications(prev => [...prev, newNotification])

    // Remove a notificação após 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  )
}