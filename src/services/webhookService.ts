import { supabase } from '../lib/supabase'

export interface WebhookSubscription {
  id: string
  tenant_id: string
  name: string
  url: string
  is_active: boolean
  events: string[]
  secret?: string
  last_triggered_at?: string | null
  created_at?: string
}

export interface WebhookEvent {
  id: string
  tenant_id: string
  event_type: string
  payload: Record<string, unknown>
  status: string
  created_at: string
}

export interface WebhookDelivery {
  id: string
  event_id: string
  subscription_id: string
  attempt_count: number
  status: string
  last_status_code?: number | null
  last_error?: string | null
  response_body?: string | null
  last_attempted_at?: string | null
  next_retry_at?: string | null
  created_at?: string
}

export async function listSubscriptions(tenantId: string) {
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as WebhookSubscription[]
}

export async function createSubscription(tenantId: string, payload: { name: string; url: string; events: string[] }) {
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .insert([{ tenant_id: tenantId, name: payload.name, url: payload.url, events: payload.events, is_active: true }])
    .select()
    .single()

  if (error) throw error
  return data as WebhookSubscription
}

export async function listEvents(tenantId: string, limit = 50) {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as WebhookEvent[]
}

export async function listDeliveriesBySubscription(subscriptionId: string, limit = 50) {
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as WebhookDelivery[]
}

export async function resendDelivery(deliveryId: string) {
  // Marcar a delivery como pending e agendar retry imediato
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .update({ status: 'pending', next_retry_at: new Date().toISOString(), last_error: null })
    .eq('id', deliveryId)
    .select()
    .single()

  if (error) throw error
  return data as WebhookDelivery
}

export async function fetchContactAvatar(conversationId: string) {
  console.log('[AVATAR SERVICE] Iniciando busca para:', conversationId);

  // Buscar conversa com cliente
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select(`
      id, tenant_id, contact_id,
      clientes!inner(telefone)
    `)
    .eq('id', conversationId)
    .single()

  if (convError || !conv) throw convError || new Error('Conversation not found')

  // Fix: Handle clientes as array or object depending on Supabase return type
  const clientData = Array.isArray(conv.clientes) ? conv.clientes[0] : conv.clientes
  const rawPhone = clientData?.telefone
  // Sanitize phone: remove all non-numeric characters
  const phone = rawPhone?.replace(/\D/g, '')

  console.log('[AVATAR SERVICE] Telefone sanitizado:', phone);

  const tenantId = conv.tenant_id

  // Buscar integração ativa para o tenant
  const { data: integration, error: intError } = await supabase
    .from('integrations')
    .select('provider, credentials')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('is_active', true)
    .single()

  if (intError || !integration) throw intError || new Error('Integration not found')

  const provider = integration.provider
  console.log('[AVATAR SERVICE] Provider encontrado:', provider);

  const credentials = integration.credentials

  if (!phone || !provider || !credentials) throw new Error('Missing data')

  let avatarUrl: string | null = null

  if (provider === 'meta_official') {
    // Usar WhatsApp Business API para buscar profile pic
    const accessToken = credentials.access_token
    const phoneNumberId = credentials.phone_number_id
    if (!accessToken || !phoneNumberId) throw new Error('Missing WhatsApp credentials')

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/contacts?profile=${phone}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (response.ok) {
      const data = await response.json()
      avatarUrl = data.contacts?.[0]?.profile?.profile_pic
    }
  } else if (provider === 'zapi') {
    // Usar Z-API / Uazapi
    const instanceId = credentials.instance_id || credentials.instanceId || credentials.instanceName || credentials.instance
    const token = credentials.token || credentials.api_token || credentials.client_token || credentials.secret_key
    // Tentar pegar a URL base das credenciais ou usar a conhecida
    const baseUrl = credentials.baseUrl || credentials.apiUrl || 'https://heavens.uazapi.com'

    if (!instanceId || !token) {
      console.error('Z-API credentials missing:', { instanceId: !!instanceId, token: !!token, credentials })
      throw new Error('Missing Z-API credentials')
    }

    // Tentativa 1: Endpoint padrão Z-API
    // Nota: Algumas versões usam /instances, outras direto na raiz dependendo do proxy
    const urlsToTry = [
      `${baseUrl}/instances/${instanceId}/contacts/profile-picture?phone=${phone}`,
      `${baseUrl}/contact/getProfilePicture?phone=${phone}&instanceId=${instanceId}`,
      // Padrão Evolution API (muito comum em white-labels)
      `${baseUrl}/chat/fetchProfilePictureUrl/${instanceId}`
    ]

    for (const url of urlsToTry) {
      try {
        console.log('[AVATAR SERVICE] Tentando URL:', url);

        // Se for Evolution, é POST
        const isEvolution = url.includes('fetchProfilePictureUrl');
        const options: RequestInit = {
          method: isEvolution ? 'POST' : 'GET',
          headers: {
            'Client-Token': token,
            'Authorization': `Bearer ${token}`,
            'apikey': token,
            'Content-Type': 'application/json'
          }
        };

        if (isEvolution) {
          options.body = JSON.stringify({ number: phone });
        }

        const response = await fetch(url, options)

        if (response.ok) {
          const data = await response.json()
          console.log('[AVATAR SERVICE] Resposta Sucesso:', data);
          avatarUrl = data.profilePicture || data.profilePictureUrl || data.link || data.url || data.pictureUrl
          if (avatarUrl) break;
        } else {
          console.log('[AVATAR SERVICE] Falha na URL:', url, response.status);
        }
      } catch (e) {
        console.error('[AVATAR SERVICE] Erro na tentativa:', e);
      }
    }
  }

  if (avatarUrl) {
    // Atualizar conversations com ambos os campos para compatibilidade
    await supabase
      .from('conversations')
      .update({
        avatar: avatarUrl,      // Campo antigo (para compatibilidade)
        avatar_url: avatarUrl   // Campo novo (padrão)
      })
      .eq('id', conversationId)

    await supabase
      .from('clientes')
      .update({ avatar_url: avatarUrl })
      .eq('id', conv.contact_id)
  }

  return avatarUrl
}
