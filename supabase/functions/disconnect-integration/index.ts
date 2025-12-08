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
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRole) {
            console.error('[disconnect] Missing envs', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey, supabaseServiceRole: !!supabaseServiceRole })
            return new Response('Server not configured', { status: 500, headers: corsHeaders })
        }

        // Auth client (respect user session)
        const supabaseAuth = createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization') ?? '' },
                },
            }
        )

        // DB client with service role to bypass RLS for updates, but we still validate user/tenant via auth
        const supabaseService = createClient(supabaseUrl, supabaseServiceRole)

        // Get authenticated user
        const { data: userData, error: authError } = await supabaseAuth.auth.getUser()
        if (authError) {
            console.error('[disconnect] auth.getUser error', authError)
            return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }

        const user = userData?.user
        if (!user) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }

        // Get user's active tenant from memberships
        const { data: memberships, error: membershipError } = await supabaseService
            .from('memberships')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('active', true)
            .order('created_at', { ascending: false })

        if (membershipError) {
            console.error('[disconnect] membership error', membershipError)
            return new Response(JSON.stringify({ error: `Membership error: ${membershipError.message}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!memberships || memberships.length === 0) {
            console.error('[disconnect] No active membership for user', user.id)
            return new Response(JSON.stringify({ error: 'No active membership found' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const tenantId = memberships[0].tenant_id

        // Disconnect integration (delete all whatsapp integrations for the tenant)
        const { error: deleteError } = await supabaseService
            .from('integrations')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('channel', 'whatsapp')

        if (deleteError) {
            console.error('[disconnect] Error deleting integrations', deleteError)
            return new Response(JSON.stringify({ error: `Delete error: ${deleteError.message}` }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('[disconnect] Fatal error:', error)
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
