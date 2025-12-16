import { supabase } from '../lib/supabase'

export interface Despesa {
  id: string
  tenant_id: string
  categoria: string
  descricao: string
  valor: number
  tipo: 'fixa' | 'variavel' | 'pontual' | 'mensal' | 'pessoal'
  status?: 'ativa' | 'pausada' | 'finalizada'
  data_vencimento?: string | null
  data_pagamento?: string | null
  data_inicio?: string | null
  data_fim?: string | null
  ativa: boolean
  responsavel_id?: string | null
  created_at: string
  updated_at: string
}

export interface NovaDespesa {
  categoria: string
  descricao: string
  valor: number
  tipo: 'fixa' | 'variavel' | 'pontual' | 'mensal' | 'pessoal'
  data_vencimento?: string | null
  ativa?: boolean
  responsavel_id?: string | null
}

class ExpenseService {
  private ensureTenant(tenantId?: string) {
    if (!tenantId) {
      throw new Error('Tenant não definido para operação de despesas')
    }
  }

  // Buscar todas as despesas do tenant
  async getDespesas(tenantId: string): Promise<Despesa[]> {
    this.ensureTenant(tenantId)
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('categoria', { ascending: true })
      .order('descricao', { ascending: true })

    if (error) {
      console.error('Erro ao buscar despesas:', error)
      throw error
    }

    return data || []
  }

  // Buscar despesas ativas
  async getDespesasAtivas(tenantId: string): Promise<Despesa[]> {
    this.ensureTenant(tenantId)
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ativa', true)
      .order('categoria', { ascending: true })
      .order('descricao', { ascending: true })

    if (error) {
      console.error('Erro ao buscar despesas ativas:', error)
      throw error
    }

    return data || []
  }

  // Calcular total de despesas fixas ativas
  async getTotalDespesasFixas(tenantId: string): Promise<number> {
    this.ensureTenant(tenantId)
    const { data, error } = await supabase
      .from('despesas')
      .select('valor')
      .eq('tenant_id', tenantId)
      .eq('ativa', true)
      .eq('tipo', 'fixa')

    if (error) {
      console.error('Erro ao calcular despesas fixas:', error)
      throw error
    }

    return data?.reduce((total, despesa) => total + despesa.valor, 0) || 0
  }

  // Calcular total de despesas por categoria
  async getTotalPorCategoria(tenantId: string): Promise<Record<string, number>> {
    this.ensureTenant(tenantId)
    const { data, error } = await supabase
      .from('despesas')
      .select('categoria, valor')
      .eq('tenant_id', tenantId)
      .eq('ativa', true)

    if (error) {
      console.error('Erro ao calcular despesas por categoria:', error)
      throw error
    }

    const totais: Record<string, number> = {}
    data?.forEach(despesa => {
      const categoria = despesa.categoria ?? 'Outros'
      if (!totais[categoria]) {
        totais[categoria] = 0
      }
      totais[categoria] += despesa.valor
    })

    return totais
  }

  // Criar nova despesa
  async criarDespesa(tenantId: string, novaDespesa: NovaDespesa): Promise<Despesa> {
    this.ensureTenant(tenantId)

    const dadosParaInsercao = {
      ...novaDespesa,
      tenant_id: tenantId,
      ativa: novaDespesa.ativa ?? true,
      data_vencimento:
        novaDespesa.data_vencimento && novaDespesa.data_vencimento.trim() !== ''
          ? novaDespesa.data_vencimento
          : null,
    }

    const { data, error } = await supabase
      .from('despesas')
      .insert([dadosParaInsercao])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar despesa:', error.message || error)
      throw error
    }

    return data
  }

  // Atualizar despesa
  async atualizarDespesa(tenantId: string, id: string, dados: Partial<NovaDespesa>): Promise<Despesa> {
    this.ensureTenant(tenantId)

    const dadosParaAtualizacao = {
      ...dados,
      ...(dados.data_vencimento !== undefined && {
        data_vencimento:
          dados.data_vencimento && dados.data_vencimento.trim() !== ''
            ? dados.data_vencimento
            : null,
      }),
    }

    const { data, error } = await supabase
      .from('despesas')
      .update(dadosParaAtualizacao)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar despesa:', error.message || error)
      throw error
    }

    return data
  }

  // Deletar despesa
  async deletarDespesa(tenantId: string, id: string): Promise<void> {
    this.ensureTenant(tenantId)
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Erro ao deletar despesa:', error.message || error)
      throw error
    }
  }

  // Ativar/desativar despesa
  async toggleAtivaDespesa(tenantId: string, id: string, ativa: boolean): Promise<Despesa> {
    return this.atualizarDespesa(tenantId, id, { ativa })
  }
}

export const expenseService = new ExpenseService()
