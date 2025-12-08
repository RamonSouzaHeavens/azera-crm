import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get authenticated user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: userData, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !userData.user) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }

        const user = userData.user

        // Get user's tenant
        const { data: membership } = await supabase
            .from('memberships')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (!membership) {
            return new Response('No active tenant', { status: 403, headers: corsHeaders })
        }

        const { conversationId } = await req.json()

        if (!conversationId) {
            return new Response(JSON.stringify({ success: false, message: 'Missing conversationId' }), { status: 200, headers: corsHeaders })
        }

        // Get conversation and integration
        const { data: conversation } = await supabase
            .from('conversations')
            .select('*, clientes(telefone)')
            .eq('id', conversationId)
            .eq('tenant_id', membership.tenant_id)
            .single()

        if (!conversation) {
            return new Response(JSON.stringify({ success: false, message: 'Conversation not found' }), { status: 200, headers: corsHeaders })
        }

        const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('tenant_id', membership.tenant_id)
            .eq('channel', 'whatsapp')
            .eq('is_active', true)
            .single()

        if (!integration) {
            return new Response(JSON.stringify({ success: false, message: 'No active integration' }), { status: 200, headers: corsHeaders })
        }

        // Fetch messages from external API
        let messages = []

        if (integration.provider === 'zapi') {
            const { instance_id, secret_key, base_url } = integration.credentials
            const chatId = conversation.external_conversation_id || conversation.clientes?.telefone

            if (!chatId) {
                return new Response(JSON.stringify({ success: false, message: 'No chat ID available' }), { status: 200, headers: corsHeaders })
            }

            try {
                const response = await fetch(`${base_url}/api/messages/${instance_id}?chatId=${chatId}&limit=50`, {
                    headers: {
                        'Authorization': `Bearer ${secret_key}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    console.error('Failed to fetch messages from ZAPI', response.status)
                    // Trata 404/4xx como "sem novas mensagens" para evitar 500 no cliente
                    return new Response(JSON.stringify({ success: true, count: 0, message: `ZAPI responded ${response.status}` }), { status: 200, headers: corsHeaders })
                }

                const data = await response.json().catch(() => ({}))
                messages = (data as any).messages || []
            } catch (providerError) {
                console.error('Failed to fetch messages from ZAPI', providerError)
                return new Response(JSON.stringify({ success: true, count: 0, message: 'Failed to fetch messages from ZAPI', error: String(providerError) }), { status: 200, headers: corsHeaders })
            }
        } else {
            return new Response(JSON.stringify({ success: true, count: 0, message: `Backfill skipped for provider ${integration.provider}` }), { status: 200, headers: corsHeaders })
        }

        // Insert messages into database
        for (const msg of messages) {
            // Avoid duplicates
            const existing = await supabase
                .from('messages')
                .select('id')
                .eq('external_message_id', msg.id)
                .eq('tenant_id', membership.tenant_id)
                .single()

            if (existing.data) continue

            await supabase
                .from('messages')
                .insert({
                    tenant_id: membership.tenant_id,
                    conversation_id: conversationId,
                    sent_by_user_id: msg.fromMe ? user.id : null,
                    direction: msg.fromMe ? 'outbound' : 'inbound',
                    message_type: msg.type || 'text',
                    content: msg.content || msg.text,
                    media_url: msg.mediaUrl,
                    media_mime_type: msg.mediaType,
                    external_message_id: msg.id,
                    external_timestamp: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : null,
                    status: 'delivered',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
        }

        return new Response(JSON.stringify({ success: true, count: messages.length }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Fatal error:', error)
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
