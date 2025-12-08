import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FACEBOOK_APP_ID = '1201882808362468'
const FACEBOOK_APP_SECRET = 'ac07a8060037a9a6ebb3c0fb312dbcc7'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { shortToken } = await req.json()

    if (!shortToken) throw new Error('Token não fornecido')

    // 1. Trocar por token de longa duração
    const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortToken}`
    const exchangeRes = await fetch(exchangeUrl)
    const exchangeData = await exchangeRes.json()

    if (exchangeData.error) throw new Error(exchangeData.error.message)
    const longLivedToken = exchangeData.access_token

    // 2. Buscar Páginas e Contas do Instagram conectadas
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${longLivedToken}`
    const pagesRes = await fetch(pagesUrl)
    const pagesData = await pagesRes.json()

    if (pagesData.error) throw new Error(pagesData.error.message)

    // 3. Buscar Contas de Anúncios
    const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${longLivedToken}`
    const adAccountsRes = await fetch(adAccountsUrl)
    const adAccountsData = await adAccountsRes.json()

    return new Response(JSON.stringify({
      longLivedToken,
      pages: pagesData.data || [],
      adAccounts: adAccountsData.data || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
