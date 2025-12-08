import { useMemo } from 'react'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook para verificar permissões de administração
 * Owner e Administrador têm os mesmos privilégios
 */
export function useCanManage() {
  const { member } = useAuthStore()

  return useMemo(() => {
    const isOwner = member?.role === 'owner'
    const isAdmin = member?.role === 'admin'
    const isAdministrador = member?.role === 'administrador'

    return {
      isOwner,
      isAdmin,
      isAdministrador,
      // Proprietário, Admin ou Administrador podem gerenciar
      canManage: isOwner || isAdmin || isAdministrador,
      // Apenas proprietário pode fazer ações críticas (se necessário)
      isOwnerOnly: isOwner,
    }
  }, [member?.role])
}
