import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('Evolution webhook received:', req.body)

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const payload = req.body
    const instanceName = payload.instance

    // Buscar integração
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'evolution_api')
      .eq('config->>instance_name', instanceName)
      .eq('is_active', true)

    if (!integrations || integrations.length === 0) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    const integration = integrations[0]
    const tenantId = integration.tenant_id

    // Processar webhook (simplificado - em produção usar o ProviderFactory)
    if (payload.event === 'messages.upsert') {
      const message = payload.data

      if (message.key.fromMe) {
        return res.status(200).json({ status: 'ignored' })
      }

      const externalContactId = message.key.remoteJid
      const externalMessageId = message.key.id
      const content = message.message?.conversation || ''

      // Buscar ou criar contato
      let contactId: string

      const { data: existingContact } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('telefone', externalContactId.replace('@s.whatsapp.net', ''))
        .single()

      if (existingContact) {
        contactId = existingContact.id
      } else {
        const { data: newContact } = await supabase
          .from('clientes')
          .insert({
            tenant_id: tenantId,
            nome: 'Contato WhatsApp',
            telefone: externalContactId.replace('@s.whatsapp.net', ''),
          })
          .select('id')
          .single()

        if (!newContact) throw new Error('Failed to create contact')
        contactId = newContact.id
      }

      // Buscar ou criar conversa
      let conversationId: string

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .single()

      if (existingConversation) {
        conversationId = existingConversation.id
      } else {
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            tenant_id: tenantId,
            contact_id: contactId,
            channel: 'whatsapp',
            last_message_content: content,
            last_activity_at: new Date().toISOString(),
            unread_count: 1,
          })
          .select('id')
          .single()

        if (!newConversation) throw new Error('Failed to create conversation')
        conversationId = newConversation.id
      }

      // Inserir mensagem
      await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          external_message_id: externalMessageId,
          direction: 'inbound',
          message_type: 'text',
          content: content,
          status: 'delivered',
        })

      // Atualizar conversa
      await supabase
        .from('conversations')
        .update({
          last_message_content: content,
          last_activity_at: new Date().toISOString(),
          unread_count: existingConversation ? existingConversation.unread_count + 1 : 1,
        })
        .eq('id', conversationId)
    }

    res.status(200).json({ status: 'processed' })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}