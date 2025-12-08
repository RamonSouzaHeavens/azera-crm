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

    const { conversationId, phoneNumber } = await req.json()

    if (!conversationId || !phoneNumber) {
      return new Response(JSON.stringify({ success: false, message: 'Missing conversationId or phoneNumber' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if conversation already has avatar
    const { data: conversation } = await supabase
      .from('conversations')
      .select('avatar_url')
      .eq('id', conversationId)
      .eq('tenant_id', membership.tenant_id)
      .single()

    if (conversation?.avatar_url) {
      // Already has avatar, return it
      return new Response(JSON.stringify({ success: true, avatar_url: conversation.avatar_url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get active WhatsApp integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', membership.tenant_id)
      .eq('channel', 'whatsapp')
      .eq('is_active', true)
      .single()

    if (!integration) {
      return new Response(JSON.stringify({ success: false, message: 'No active WhatsApp integration' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let avatarUrl: string | null = null

    // Fetch avatar from provider
    if (integration.provider === 'zapi' || integration.provider === 'uazapi') {
      const { instance_id, secret_key, base_url } = integration.credentials as any

      // Clean phone number (remove @s.whatsapp.net if present, keep only digits)
      const cleanPhone = phoneNumber.replace('@s.whatsapp.net', '').replace(/\D/g, '')

      // UAZAPI endpoint for profile picture
      // Try different endpoint patterns used by uazapi/zapi
      const endpoints = [
        `${base_url}/api/${instance_id}/profile-picture?phone=${cleanPhone}`,
        `${base_url}/api/profile-picture/${instance_id}?phone=${cleanPhone}`,
        `${base_url}/${instance_id}/profile-picture/${cleanPhone}`,
        `${base_url}/api/${instance_id}/contact/${cleanPhone}`,
      ]

      for (const endpoint of endpoints) {
        try {
          console.log('[FETCH-AVATAR] Trying:', endpoint)

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${secret_key}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            console.log('[FETCH-AVATAR] Response:', JSON.stringify(data))

            // Try to extract avatar URL from various response formats
            avatarUrl = data.profilePictureUrl
              || data.profilePicture
              || data.picture
              || data.imgUrl
              || data.url
              || data.photo
              || data.avatar
              || (data.contact?.profilePictureUrl)
              || null

            if (avatarUrl) {
              console.log('[FETCH-AVATAR] Found avatar:', avatarUrl)
              break
            }
          }
        } catch (err) {
          console.log('[FETCH-AVATAR] Endpoint failed:', endpoint, err)
        }
      }
    }

    // Update conversation with avatar if found
    if (avatarUrl) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ avatar_url: avatarUrl })
        .eq('id', conversationId)
        .eq('tenant_id', membership.tenant_id)

      if (updateError) {
        console.error('[FETCH-AVATAR] Failed to update conversation:', updateError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      avatar_url: avatarUrl,
      message: avatarUrl ? 'Avatar fetched successfully' : 'No avatar found'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[FETCH-AVATAR] Fatal error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
