import { supabase } from '../lib/supabase'

export async function syncSubscriptionStatus(subscriptionId: string, supabaseId?: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const url = `${supabaseUrl}/functions/v1/stripe-subscription-status?subscriptionId=${encodeURIComponent(subscriptionId)}${supabaseId ? `&supabaseId=${encodeURIComponent(supabaseId)}` : ''}`

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey || ''
      }
    })

    if (!response.ok) {
      const txt = await response.text()
      throw new Error(`Erro ao consultar Stripe: ${response.status} ${txt}`)
    }

    const data = await response.json()
    if (data.status === 'canceled' && supabaseId) {
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', supabaseId)
    }
    return data
  } catch (err) {
    console.error('Erro ao sincronizar assinatura:', err)
    return null
  }
}
