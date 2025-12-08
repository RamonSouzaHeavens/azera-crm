import { supabase } from '../lib/supabase'

export interface Automacao {
  id: string
  tenant_id: string
  nome: string
  tipo: 'webhook' | 'api'
  url: string
  webhook_secret?: string
  metodo_http: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  body_template?: string
  entidade_alvo: 'produtos' | 'leads' | 'imoveis' | 'tarefas'
  evento: 'criacao' | 'atualizacao' | 'delecao' | 'manual'
  ativo: boolean
  tentativas_falhadas: number
  ultimo_status?: 'sucesso' | 'erro' | 'pendente'
  ultimo_erro?: string
  ultima_execucao?: string
  proxima_execucao?: string
  frequencia_minutos?: number
  created_at: string
  updated_at: string
}

export interface AutomacaoLog {
  id: string
  automacao_id: string
  status: 'sucesso' | 'erro' | 'pendente'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dados_enviados?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resposta?: Record<string, any>
  erro?: string
  codigo_http?: number
  tempo_ms?: number
  created_at: string
}

/**
 * Criar nova automação
 */
export async function criarAutomacao(
  tenantId: string,
  dados: Omit<Automacao, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('automacoes')
    .insert([{
      tenant_id: tenantId,
      ...dados,
      webhook_secret: dados.tipo === 'webhook' ? gerarSecret() : undefined,
      tentativas_falhadas: 0,
      ultimo_status: 'pendente'
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Listar automações da equipe
 */
export async function listarAutomacoes(tenantId: string) {
  const { data, error } = await supabase
    .from('automacoes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Obter detalhes de uma automação
 */
export async function obterAutomacao(id: string) {
  const { data, error } = await supabase
    .from('automacoes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Atualizar automação
 */
export async function atualizarAutomacao(
  id: string,
  dados: Partial<Omit<Automacao, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('automacoes')
    .update(dados)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Deletar automação
 */
export async function deletarAutomacao(id: string) {
  const { error } = await supabase
    .from('automacoes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Testar automação (fazer uma chamada de teste)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function testarAutomacao(automacao: Automacao, dados?: Record<string, any>) {
  try {
    const headers: Record<string, string> = {
      ...automacao.headers,
    }

    if (automacao.tipo === 'webhook' && automacao.webhook_secret) {
      headers['X-Webhook-Secret'] = automacao.webhook_secret
    }

    const payload = dados || { teste: true, timestamp: new Date().toISOString() }

    const inicio = Date.now()
    
    // Obter token de autenticação
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado')
    }

    // Chamar Supabase Edge Function para executar webhook
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        url: automacao.url,
        method: automacao.metodo_http,
        headers,
        payload: automacao.metodo_http !== 'GET' ? payload : undefined,
      }),
    })

    const tempo_ms = Date.now() - inicio
    
    // Tentar parsear resposta como JSON, se falhar usar texto
    let resultado;
    try {
      resultado = await response.json();
    } catch (parseError) {
      console.error('Erro ao parsear resposta da automação:', parseError);
      const responseText = await response.text();
      resultado = {
        sucesso: false,
        status: response.status,
        dados: { error: 'Resposta não é JSON válido', text: responseText },
        error: 'Resposta do webhook não é JSON válido'
      };
    }

    // Registrar tentativa
    await registrarLogAutomacao(automacao.id, {
      status: resultado.sucesso ? 'sucesso' : 'erro',
      codigo_http: resultado.status,
      tempo_ms,
      resposta: resultado.dados,
      dados_enviados: dados,
      erro: !resultado.sucesso ? `HTTP ${resultado.status}` : undefined,
    })

    return {
      sucesso: resultado.sucesso,
      codigo: resultado.status,
      resposta: resultado.dados,
      tempo_ms,
    }
  } catch (err) {
    const erro = err instanceof Error ? err.message : 'Erro desconhecido'
    
    // Registrar erro
    await registrarLogAutomacao(automacao.id, {
      status: 'erro',
      erro,
      dados_enviados: dados,
    })

    return {
      sucesso: false,
      erro,
    }
  }
}

/**
 * Registrar log de execução
 */
export async function registrarLogAutomacao(
  automacaoId: string,
  dados: Omit<AutomacaoLog, 'id' | 'automacao_id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('automacao_logs')
    .insert([{
      automacao_id: automacaoId,
      ...dados,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Obter histórico de logs
 */
export async function obterLogsAutomacao(automacaoId: string, limite = 50) {
  const { data, error } = await supabase
    .from('automacao_logs')
    .select('*')
    .eq('automacao_id', automacaoId)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) throw error
  return data
}

/**
 * Gerar secret para webhook
 */
function gerarSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

/**
 * Sincronizar dados via webhook (chamado pelo backend)
 */
export async function sincronizarDadosViaWebhook(
  automacaoId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dados: Record<string, any>
) {
  const automacao = await obterAutomacao(automacaoId)
  if (!automacao.ativo) {
    throw new Error('Automação inativa')
  }

  return await testarAutomacao(automacao, dados)
}

/**
 * Obter webhook URL para integração
 */
export function obterWebhookUrl(webhookId: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin
  return `${baseUrl}/api/webhook/${webhookId}`
}
