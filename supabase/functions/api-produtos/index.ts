import { createClient } from 'supabase'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseKey)

interface ProdutoData {
  // Campos obrigatórios para criação
  nome?: string
  preco?: number

  // Campos opcionais
  descricao?: string
  tipo?: string
  finalidade?: string
  area_total?: number
  area_construida?: number
  quartos?: number
  banheiros?: number
  vagas_garagem?: number
  endereco?: string
  bairro?: string
  cidade?: string
  cep?: string
  destaque?: boolean
  ativo?: boolean
  tags?: string[]
  capa_url?: string
  galeria_urls?: string[]
  arquivo_urls?: string[]
  filtros?: Record<string, unknown>
  proprietario_id?: string
}

interface ApiRequest {
  action: 'create' | 'update'
  tenant_id: string
  produto_id?: string // necessário apenas para update
  produto: ProdutoData
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
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

  try {
    const body = await req.json() as ApiRequest
    const { action, tenant_id, produto_id, produto } = body

    // Validações básicas
    if (!action || !tenant_id || !produto) {
      return new Response(
        JSON.stringify({
          error: 'Parâmetros obrigatórios: action, tenant_id, produto'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['create', 'update'].includes(action)) {
      return new Response(
        JSON.stringify({
          error: 'Action deve ser "create" ou "update"'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'update' && !produto_id) {
      return new Response(
        JSON.stringify({
          error: 'produto_id é obrigatório para update'
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
      // Criar produto
      if (!produto.nome || produto.preco === undefined) {
        return new Response(
          JSON.stringify({
            error: 'Para criar produto: nome e preco são obrigatórios'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      const { data, error: createError } = await supabase
        .from('produtos')
        .insert({
          tenant_id,
          nome: produto.nome,
          preco: produto.preco,
          descricao: produto.descricao,
          tipo: produto.tipo,
          finalidade: produto.finalidade,
          area_total: produto.area_total,
          area_construida: produto.area_construida,
          quartos: produto.quartos,
          banheiros: produto.banheiros,
          vagas_garagem: produto.vagas_garagem,
          endereco: produto.endereco,
          bairro: produto.bairro,
          cidade: produto.cidade,
          cep: produto.cep,
          destaque: produto.destaque ?? false,
          ativo: produto.ativo ?? true,
          tags: produto.tags || [],
          capa_url: produto.capa_url,
          galeria_urls: produto.galeria_urls || [],
          arquivo_urls: produto.arquivo_urls || [],
          filtros: produto.filtros || {},
          proprietario_id: produto.proprietario_id
        })
        .select()
        .single()

      result = data
      error = createError

    } else if (action === 'update') {
      // Atualizar produto
      const { data, error: updateError } = await supabase
        .from('produtos')
        .update({
          nome: produto.nome,
          preco: produto.preco,
          descricao: produto.descricao,
          tipo: produto.tipo,
          finalidade: produto.finalidade,
          area_total: produto.area_total,
          area_construida: produto.area_construida,
          quartos: produto.quartos,
          banheiros: produto.banheiros,
          vagas_garagem: produto.vagas_garagem,
          endereco: produto.endereco,
          bairro: produto.bairro,
          cidade: produto.cidade,
          cep: produto.cep,
          destaque: produto.destaque,
          ativo: produto.ativo,
          tags: produto.tags,
          capa_url: produto.capa_url,
          galeria_urls: produto.galeria_urls,
          arquivo_urls: produto.arquivo_urls,
          filtros: produto.filtros,
          proprietario_id: produto.proprietario_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', produto_id!)
        .eq('tenant_id', tenant_id)
        .select()
        .single()

      result = data
      error = updateError
    }

    if (error) {
      console.error('Erro na operação:', error)
      return new Response(
        JSON.stringify({
          error: 'Erro ao processar produto',
          details: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        produto: result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Erro interno:', err)
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: msg
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})