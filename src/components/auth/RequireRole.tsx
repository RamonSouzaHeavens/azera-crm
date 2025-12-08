import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface RequireRoleProps {
  roles: string[]
  children: React.ReactNode
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const navigate = useNavigate()
  const { member } = useAuthStore()

  useEffect(() => {
    if (!member || !roles.includes(member.role)) {
      toast.error('Acesso restrito a administradores e gerentes')
      navigate('/app/clientes')
    }
  }, [member, roles, navigate])

  if (!member || !roles.includes(member.role)) {
    return null
  }

  return <>{children}</>
}