import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

/**
 * Adiciona um novo responsável externo ao tenant
 * Cria apenas um nome de texto sem criar usuário real
 * Retorna true para indicar sucesso
 */
export const addResponsavel = async (tenantId: string, nome: string): Promise<{ success: boolean; nome?: string }> => {
  if (!tenantId || !nome.trim()) {
    toast.error('Nome do responsável é obrigatório')
    return { success: false }
  }

  // Verificar se já existe uma tarefa com esse responsavel_nome no tenant
  const { data: existing } = await supabase
    .from('tarefas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('responsavel_nome', nome.trim())
    .limit(1)

  if (existing && existing.length > 0) {
    // Já existe, mas não é erro - apenas retorna sucesso
    toast.success(`✅ Responsável "${nome.trim()}" adicionado`)
    return { success: true, nome: nome.trim() }
  }

  toast.success(`✅ Responsável "${nome.trim()}" adicionado`)
  return { success: true, nome: nome.trim() }
}

/**
 * Remove um responsável (membro externo) do tenant
 */
export const removeResponsavel = async (tenantId: string, userId: string): Promise<boolean> => {
  if (!tenantId || !userId) return false

  try {
    // Verificar se é um membro externo
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (membership?.role !== 'membro_externo') {
      toast.error('Apenas membros externos podem ser removidos desta forma')
      return false
    }

    // Remover membership
    const { error: memberError } = await supabase
      .from('memberships')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)

    if (memberError) {
      console.error('Erro ao remover membership:', memberError)
      toast.error('Erro ao remover responsável')
      return false
    }

    // Remover profile (se não tiver outros memberships)
    const { data: otherMemberships } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('user_id', userId)

    if (!otherMemberships || otherMemberships.length === 0) {
      await supabase.from('profiles').delete().eq('id', userId)
    }

    toast.success('Responsável removido')
    return true
  } catch (err) {
    console.error('Erro ao remover responsável:', err)
    toast.error('Erro ao remover responsável')
    return false
  }
}
