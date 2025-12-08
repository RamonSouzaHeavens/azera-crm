import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface Message {
  id: string
  conversation_id: string
  content: string | null
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document'
  media_url?: string | null
  external_message_id?: string | null
  created_at: string
}

// Mapa para rastrear IDs externos já processados
const processedExternalIds = new Set<string>()

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        // Garantir que não haja duplicados
        const map = new Map<string, Message>()
        data.forEach((m) => {
          const key = m.external_message_id ? `${m.direction}-${m.external_message_id}` : m.id
          if (!map.has(key)) {
            map.set(key, m as Message)
            // Registrar IDs externos já carregados
            if (m.external_message_id) {
              processedExternalIds.add(m.external_message_id)
            }
          }
        })
        setMessages(Array.from(map.values()))
        setTimeout(scrollToBottom, 100)
      }
      setLoading(false)
    }

    loadMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as Message

          // Evitar duplicatas com external_message_id
          if (newMsg.external_message_id) {
            if (processedExternalIds.has(newMsg.external_message_id)) {
              console.log('[REALTIME] Duplicata detectada, ignorando:', newMsg.external_message_id)
              return
            }
            processedExternalIds.add(newMsg.external_message_id)
          }

          setMessages((prev) => {
            // Remover otimista duplicada (pending)
            const cleaned = prev.filter(
              m => !(m.status === 'pending' && m.direction === newMsg.direction && m.content === newMsg.content)
            )

            // Verificar se mensagem já existe
            const key = newMsg.external_message_id ? `${newMsg.direction}-${newMsg.external_message_id}` : newMsg.id
            const exists = cleaned.some(m => {
              const existingKey = m.external_message_id ? `${m.direction}-${m.external_message_id}` : m.id
              return existingKey === key
            })

            if (exists) {
              console.log('[REALTIME] Mensagem já existe:', newMsg.id)
              return cleaned
            }

            console.log('[REALTIME] Nova mensagem:', newMsg.id, newMsg.direction)
            return [...cleaned, newMsg]
          })
          setTimeout(scrollToBottom, 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[REALTIME] Atualização de mensagem:', payload.new.id)
          setMessages((prev) =>
            prev.map(m => m.id === payload.new.id ? (payload.new as Message) : m)
          )
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const sendMessage = async (text: string, mediaUrl?: string, mimetype?: string, mediaType?: string) => {
    if (!conversationId || (!text.trim() && !mediaUrl)) return

    setSending(true)

    // Optimistic UI
    const tempId = `temp-${Math.random()}`
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      content: text,
      direction: 'outbound',
      status: 'pending',
      message_type: (mediaType as any) || 'text',
      media_url: mediaUrl,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimisticMsg])
    setTimeout(scrollToBottom, 50)

    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          conversationId,
          message: text,
          mediaUrl,
          mimetype,
          mediaType
        }
      })

      if (error) throw error

      // Remove optimistic message (realtime will add the real one)
      setMessages(prev => prev.filter(m => m.id !== tempId))

    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      toast.error('Falha ao enviar mensagem')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setSending(false)
    }
  }

  return { messages, loading, sending, sendMessage, messagesEndRef }
}
