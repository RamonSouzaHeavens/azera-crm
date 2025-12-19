import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const origin = req.headers.get('Origin') || '*'
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com a chave de serviço para operações admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Criar cliente normal para validar o token do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Validar intenção com confirmação de email
    const { confirmation_email } = await req.json()
    if (!confirmation_email || confirmation_email.trim().toLowerCase() !== user.email?.trim().toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email confirmation failed. Please provide your email to confirm deletion.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Deletar membros da equipe (members)
    const { error: membersError } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('user_id', userId)

    if (membersError) {
      console.error('Erro ao deletar members:', membersError)
    }

    // 2. Deletar memberships
    const { error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', userId)

    if (membershipsError) {
      console.error('Erro ao deletar memberships:', membershipsError)
    }

    // 3. Deletar convites pendentes
    const { error: invitesError } = await supabaseAdmin
      .from('team_invites')
      .delete()
      .eq('invitee_email', user.email)

    if (invitesError) {
      console.error('Erro ao deletar team_invites:', invitesError)
    }

    // 4. Marcar perfil como desabilitado
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ disabled: true })
      .eq('user_id', userId)

    if (profileError) {
      console.error('Erro ao desabilitar profile:', profileError)
    }

    const { error: userProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        disabled: true
      })

    if (userProfileError) {
      console.error('Erro ao desabilitar user_profile:', userProfileError)
    }

    // 5. Deletar usuário do auth.users via Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Erro ao deletar usuário do auth:', deleteError)
      return new Response(
        JSON.stringify({
          error: 'Erro ao deletar usuário',
          details: deleteError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conta deletada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
