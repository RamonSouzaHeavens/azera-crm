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
    const serverHash = digestArray.map(b => b.toString(16).padStart(2, '0')).join('')

    console.log('=== DEBUG SERVIDOR === apiKey length:', apiKey.length)
    console.log('=== DEBUG SERVIDOR === apiKey (first10):', apiKey.slice(0, 10))
    console.log('=== DEBUG SERVIDOR === serverHash:', serverHash)

    console.log('Calling RPC validate_api_key with input_key (first10):', apiKey.slice(0, 10), 'length:', apiKey.length)
    const { data: keyData, error: keyError } = await supabase
      .rpc('validate_api_key', { input_key: apiKey })

    if (keyError) {
      console.error('validate_api_key rpc error:', keyError)
    }

    console.log('validate_api_key returned (raw):', keyData)

    if (keyError || !keyData || keyData.length === 0) {
      return { valid: false, error: 'Chave API inválida ou expirada' }
    }

    const found = keyData[0] as ApiKeyInfo
    // attach serverHash for potential future use
    found.server_hash = serverHash
    keyInfo = found
  } catch (rpcErr) {
    console.error('Erro ao validar chave via RPC:', rpcErr)
    return { valid: false, error: 'Erro ao validar chave API' }
  }

  // Segurança: garantir que keyInfo foi definido
  if (!keyInfo) {
    return { valid: false, error: 'Chave API inválida ou expirada' }
  }

  if (!keyInfo.is_active) {
    return { valid: false, error: 'Chave API inativa' }
  }

  if (keyInfo.tenant_id !== requiredTenantId) {
    return { valid: false, error: 'Chave API não pertence ao tenant especificado' }
  }

  // Verificar permissões baseado na ação
  const requiredPermission = (action === 'list' || action === 'read') ? 'leads.read' : 'leads.write'
  if (!keyInfo.permissions.includes(requiredPermission)) {
    return { valid: false, error: `Chave API não tem permissão para ${action === 'list' ? 'ler' : 'modificar'} leads` }
  }

  return { valid: true, apiKeyId: keyInfo.id }
}

// Função para logar requisição API
async function logApiRequest(
  tenantId: string,
  apiKeyId: string | undefined,
  endpoint: string,
  method: string,
  statusCode: number,
  requestBody: unknown,
  responseBody: unknown,
  errorMessage: string | null,
  processingTimeMs: number,
  request: Request
) {
  await supabase.from('api_logs').insert({
    tenant_id: tenantId,
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    request_ip: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
    user_agent: request.headers.get('User-Agent'),
    request_body: requestBody,
    response_body: responseBody,
    error_message: errorMessage,
    processing_time_ms: processingTimeMs
  })
}

interface LeadUpdateRequest {
  action: 'move' | 'update' | 'read' | 'list' | 'create'
  tenant_id: string
  lead_id?: string
  stage_id?: string // Para mover o lead
  data?: Record<string, unknown> // Para atualizar outros dados
}

serve(async (req: Request) => {
  const startTime = Date.now()

  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Use POST.' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  let responseBody: unknown = null
  let errorMessage: string | null = null
  let statusCode = 200

  // Declarar variáveis no escopo externo para serem acessíveis no finally
  let body: LeadUpdateRequest | null = null
  let accessValidation: { valid: boolean; error?: string; apiKeyId?: string } | null = null

  try {
    body = await req.json() as LeadUpdateRequest
    const { action, tenant_id, lead_id, stage_id, data } = body

    // Validar acesso via API key
    accessValidation = await validateApiAccess(req, tenant_id, action)
    if (!accessValidation.valid) {
      statusCode = 401
      errorMessage = accessValidation.error!
      return new Response(
        JSON.stringify({ error: accessValidation.error }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validações básicas
    if (!action || !tenant_id) {
      statusCode = 400
      errorMessage = 'Parâmetros obrigatórios: action, tenant_id'
      return new Response(
        JSON.stringify({
          error: 'Parâmetros obrigatórios: action, tenant_id'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['move', 'update', 'read', 'list', 'create'].includes(action)) {
      return new Response(
        JSON.stringify({
          error: 'Action deve ser "move", "update", "read", "list" ou "create"'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Para ações que precisam de lead_id (exceto create)
    if (['move', 'update', 'read'].includes(action) && !lead_id) {
      return new Response(
        JSON.stringify({
          error: 'lead_id é obrigatório para esta ação'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar se tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant não encontrado' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let result
    let error

    if (action === 'create') {
      // Criar novo lead
      if (!data || Object.keys(data).length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Para criar: data com campos é obrigatório'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Campos permitidos para criação
      const allowedFields = [
        'nome',
        'name',
        'email',
        'telefone',
        'phone',
        'status',
        'notas',
        'valor_potencial',
        'valor',
        'origem'
      ]

      // Filtrar apenas campos permitidos
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedFields.includes(key))
      )

      if (Object.keys(filteredData).length === 0) {
        return new Response(
          JSON.stringify({
            error: `Campos não permitidos. Permitidos: ${allowedFields.join(', ')}`
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Verificar se telefone já existe (único por tenant)
      if (filteredData.telefone || filteredData.phone) {
        const phoneToCheck = filteredData.telefone || filteredData.phone
        const { data: existingLead } = await supabase
          .from('clientes')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('telefone', phoneToCheck)
          .single()

        if (existingLead) {
          return new Response(
            JSON.stringify({
              error: 'Lead com este telefone já existe'
            }),
            {
              status: 409,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }

      // Criar lead
      const { data: created, error: createError } = await supabase
        .from('clientes')
        .insert({
          ...filteredData,
          tenant_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      result = created
      error = createError

    } else if (action === 'list') {
      // Listar todos os leads do tenant
      const { data, error: listError } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })

      result = data
      error = listError
    } else {
      // Para ações que precisam de lead específico
      const { data: lead, error: leadError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', lead_id)
        .eq('tenant_id', tenant_id)
        .single()

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ error: 'Lead não encontrado' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      if (action === 'read') {
        result = lead
        error = null
      } else if (action === 'move') {
      // Mover lead para outra etapa
      if (!stage_id) {
        return new Response(
          JSON.stringify({
            error: 'Para mover: stage_id é obrigatório'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Verificar se stage existe (aceitar tanto ID quanto key)
      let stageValue: string
      const { data: stage, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id, key')
        .or(`id.eq.${stage_id},key.eq.${stage_id}`)
        .eq('tenant_id', tenant_id)
        .single()

      if (stageError || !stage) {
        return new Response(
          JSON.stringify({ error: 'Estágio não encontrado. Use o ID ou key do estágio.' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Usar o ID do stage para atualizar o status
      stageValue = stage.id

      // Atualizar status do lead
      const { data: updated, error: updateError } = await supabase
        .from('clientes')
        .update({
          status: stageValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead_id)
        .eq('tenant_id', tenant_id)
        .select()
        .single()

      result = updated
      error = updateError

    } else if (action === 'update') {
      // Atualizar dados do lead
      if (!data || Object.keys(data).length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Para atualizar: data com campos é obrigatório'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Campos permitidos (segurança)
      const allowedFields = [
        'nome',
        'name',
        'email',
        'telefone',
        'phone',
        'status',
        'notas',
        'valor_potencial',
        'valor',
        'origem'
      ]

      // Filtrar apenas campos permitidos
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedFields.includes(key))
      )

      if (Object.keys(filteredData).length === 0) {
        return new Response(
          JSON.stringify({
            error: `Campos não permitidos. Permitidos: ${allowedFields.join(', ')}`
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Atualizar lead
      const { data: updated, error: updateError } = await supabase
        .from('clientes')
        .update({
          ...filteredData,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead_id)
        .eq('tenant_id', tenant_id)
        .select()
        .single()

      result = updated
      error = updateError
    }
    }

    if (error) {
      console.error('Erro na operação:', error)
      statusCode = 500
      errorMessage = error.message
      responseBody = { error: 'Erro ao processar lead', details: error.message }
      return new Response(
        JSON.stringify(responseBody),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    statusCode = 200
    responseBody = { success: true, action, [action === 'list' ? 'leads' : 'lead']: result }

    return new Response(
      JSON.stringify(responseBody),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Erro interno:', err)
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    statusCode = 500
    errorMessage = msg
    responseBody = { error: 'Erro interno do servidor', details: msg }

    return new Response(
      JSON.stringify(responseBody),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } finally {
    // Log sempre, independente do resultado
    const processingTime = Date.now() - startTime
    await logApiRequest(
      body?.tenant_id || 'unknown',
      accessValidation?.apiKeyId,
      '/api-leads',
      'POST',
      statusCode,
      body,
      responseBody,
      errorMessage,
      processingTime,
      req
    )
  }
})