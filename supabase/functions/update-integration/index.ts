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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get authenticated user
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }

        // Get user's active tenant from memberships
        const { data: memberships } = await supabaseClient
            .from('memberships')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('active', true)
            .order('created_at', { ascending: false })

        if (!memberships || memberships.length === 0) {
            return new Response(JSON.stringify({ error: 'No active membership found' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const tenantId = memberships[0].tenant_id

        // Parse request body
        const { instanceId, token, baseUrl } = await req.json()

        if (!instanceId || !token) {
            return new Response('Missing required fields', { status: 400, headers: corsHeaders })
        }

        // Upsert integration (insert if not exists, update if exists)
        const { error } = await supabaseClient
            .from('integrations')
            .upsert(
                {
                    tenant_id: tenantId,
                    channel: 'whatsapp',
                    // Usamos o provider 'zapi' (Uazapi Ǹ compat��vel)
                    provider: 'zapi',
                    credentials: {
                        instance_id: instanceId,
                        secret_key: token,
                        base_url: baseUrl || 'https://api.uazapi.com'
                    },
                    status: 'active',
                    is_active: true,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'tenant_id,channel,is_active'
                }
            )

        if (error) {
            console.error('Error upserting integration:', error)
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ success: true }), {
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
