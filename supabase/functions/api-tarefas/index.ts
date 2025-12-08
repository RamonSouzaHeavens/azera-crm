import { createClient } from 'supabase'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseKey)

// Middleware para validar API key e tenant
async function validateApiAccess(req: Request, requiredTenantId: string, action: string): Promise<{ valid: boolean; error?: string; apiKeyId?: string }> {
  const authHeader = req.headers.get('Authorization')

  // Tipagem para informações da chave API
  interface ApiKeyInfo {
    id: string
    tenant_id: string
    name?: string
    permissions: string[]
    is_active: boolean
    expires_at?: string
    server_hash?: string
  }

  // keyInfo precisa estar disponível no escopo da função (usado depois)
  let keyInfo: ApiKeyInfo | null = null

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Authorization header com Bearer token é obrigatório' }
  }

  // Remover prefixo e espaços extras
  const apiKey = authHeader.substring(7).trim() // Remove 'Bearer ' e trim

  // Validar formato base64url (A-Z a-z 0-9 - _)
  const base64urlRe = /^[A-Za-z0-9\-_]+$/
  if (!base64urlRe.test(apiKey)) {
    console.warn('Invalid API key format received')
    return { valid: false, error: 'Authorization token formato inválido' }
  }

  // Validar chave API
  try {
    // Calcular hash no servidor para comparação de debug (não substitui RPC)
    const enc = new TextEncoder()
    const buf = enc.encode(apiKey)
    const digestBuf = await crypto.subtle.digest('SHA-256', buf)
    const digestArray = Array.from(new Uint8Array(digestBuf))
    const digestArray2 = digestArray.map(b => b.toString(16).padStart(2, '0'))
    const serverHash = digestArray2.join('')

    console.log('=== DEBUG SERVIDOR === apiKey length:', apiKey.length)

    // Usar RPC para validar chave API
    const { data: keyData, error: keyError } = await supabase
      .rpc('validate_api_key', {
        p_api_key: apiKey,
        p_required_tenant_id: requiredTenantId
      })

    if (keyError) {
      console.error('RPC validate_api_key error:', keyError)
      return { valid: false, error: 'Erro interno na validação da chave API' }
    }

    if (!keyData || !keyData.is_valid) {
      console.warn('API key validation failed:', keyData?.error_message || 'Unknown error')
      return { valid: false, error: keyData?.error_message || 'Chave API inválida' }
    }

    keyInfo = keyData.key_info as ApiKeyInfo

    if (!keyInfo.is_active) {
      return { valid: false, error: 'Chave API está desativada' }
    }

    if (keyInfo.expires_at && new Date(keyInfo.expires_at) < new Date()) {
      return { valid: false, error: 'Chave API expirou' }
    }

    // Verificar permissões
    const requiredPermission = (action === 'list' || action === 'read') ? 'tasks.read' : 'tasks.write'
    if (!keyInfo.permissions || !keyInfo.permissions.includes(requiredPermission)) {
      return { valid: false, error: `Chave API não tem permissão para ${action === 'list' ? 'ler' : 'modificar'} tarefas` }
    }

    return { valid: true, apiKeyId: keyInfo.id }

  } catch (err) {
    console.error('API key validation error:', err)
    return { valid: false, error: 'Erro interno na validação da chave API' }
  }
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const body = await req.json()
    const { action, tenant_id, task_id, stage_id, data } = body

    let accessValidation: { valid: boolean; error?: string; apiKeyId?: string }

    // Validar acesso API
    accessValidation = await validateApiAccess(req, tenant_id, action)

    if (!accessValidation.valid) {
      return new Response(
        JSON.stringify({
          error: accessValidation.error
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validar parâmetros obrigatórios
    let errorMessage = ''
    if (!action || !tenant_id) {
      errorMessage = 'Parâmetros obrigatórios: action, tenant_id'
    } else if (!['move', 'update', 'read', 'list', 'create'].includes(action)) {
      errorMessage = 'Action deve ser "move", "update", "read", "list" ou "create"'
    } else if (['move', 'update', 'read'].includes(action) && !task_id) {
      errorMessage = 'Para move/update/read: task_id é obrigatório'
    }

    if (errorMessage) {
      return new Response(
        JSON.stringify({
          error: errorMessage
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let result: any = null
    let error: any = null

    // Buscar tarefa se necessário
    let task: any = null
    if (['move', 'update', 'read'].includes(action)) {
      const { data: taskData, error: taskError } = await supabase
        .from('tarefas')
        .select('*')
        .eq('id', task_id)
        .eq('tenant_id', tenant_id)
        .single()

      if (taskError || !taskData) {
        return new Response(
          JSON.stringify({
            error: 'Tarefa não encontrada'
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      task = taskData
    }

    if (action === 'create') {
      // Criar nova tarefa
      if (!data || !data.titulo) {
        return new Response(
          JSON.stringify({
            error: 'Para criar: data com titulo é obrigatório'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const { data: newTask, error: createError } = await supabase
        .from('tarefas')
        .insert({
          ...data,
          tenant_id,
          status: data.status || 'pendente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      result = newTask
      error = createError

    } else if (action === 'list') {
      // Listar tarefas
      const { data: tasks, error: listError } = await supabase
        .from('tarefas')
        .select(`
          *,
          cliente:cliente_id(id, nome),
          produto:produto_id(id, nome),
          responsavel:responsavel_id(display_name),
          equipe:equipe_id(id, nome)
        `)
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })

      result = tasks
      error = listError

    } else if (action === 'read') {
      result = task
      error = null

    } else if (action === 'move') {
      // Mover tarefa para outro estágio
      if (!stage_id) {
        return new Response(
          JSON.stringify({
            error: 'Para mover: stage_id é obrigatório'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Verificar se stage existe (aceitar tanto ID quanto key)
      let stageValue: string
      const { data: stage, error: stageError } = await supabase
        .from('task_stages')
        .select('id, key')
        .or(`id.eq.${stage_id},key.eq.${stage_id}`)
        .eq('tenant_id', tenant_id)
        .single()

      if (stageError || !stage) {
        return new Response(
          JSON.stringify({ error: 'Estágio não encontrado. Use o ID ou key do estágio.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Usar o ID do stage para atualizar o status
      stageValue = stage.id

      // Atualizar status da tarefa
      const { data: updated, error: updateError } = await supabase
        .from('tarefas')
        .update({
          status: stageValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id)
        .eq('tenant_id', tenant_id)
        .select()
        .single()

      result = updated
      error = updateError

    } else if (action === 'update') {
      // Atualizar dados da tarefa
      if (!data || Object.keys(data).length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Para atualizar: data com campos é obrigatório'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from('tarefas')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id)
        .eq('tenant_id', tenant_id)
        .select()
        .single()

      result = updated
      error = updateError
    }

    // Verificar se houve erro na operação
    if (error) {
      console.error('Database operation error:', error)
      return new Response(
        JSON.stringify({
          error: 'Erro interno do servidor'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Resposta de sucesso
    const responseBody = {
      success: true,
      action,
      [action === 'list' ? 'tasks' : 'task']: result
    }

    return new Response(
      JSON.stringify(responseBody),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})