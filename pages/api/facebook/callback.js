export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing code' })

  const clientId = process.env.FB_CLIENT_ID
  const clientSecret = process.env.FB_CLIENT_SECRET
  const redirectUri = process.env.FB_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ error: 'Facebook OAuth not configured' })
  }

  try {
    const url = new URL('https://graph.facebook.com/v16.0/oauth/access_token')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('client_secret', clientSecret)
    url.searchParams.set('code', code)

    const r = await fetch(url.toString())
    const data = await r.json()

    if (!r.ok) {
      console.error('Facebook token exchange error', data)
      return res.status(500).json(data)
    }

    // Return token info. If you want to persist, call your DB/RPC here.
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error in Facebook callback:', error)
    return res.status(500).json({ error: 'Internal error' })
  }
}
