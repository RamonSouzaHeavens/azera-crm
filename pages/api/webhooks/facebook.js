import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: false,
  },
}

function bufferFromReq(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function verifySignature(buf, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return true // can't verify, accept
  try {
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(buf).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  } catch (e) {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Verification handshake
    const mode = req.query['hub.mode'] || req.query.hub_mode
    const token = req.query['hub.verify_token'] || req.query.hub_verify_token
    const challenge = req.query['hub.challenge'] || req.query.hub_challenge

    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
      return res.status(200).send(challenge || 'ok')
    }
    return res.status(403).send('Forbidden')
  }

  if (req.method === 'POST') {
    try {
      const buf = await bufferFromReq(req)
      const signature = req.headers['x-hub-signature-256'] || ''

      const appSecret = process.env.FB_APP_SECRET || ''
      const ok = verifySignature(buf, signature, appSecret)
      if (!ok) {
        console.warn('Facebook signature verification failed')
        return res.status(401).send('Invalid signature')
      }

      let body = {}
      try {
        body = JSON.parse(buf.toString('utf8'))
      } catch (e) {
        console.warn('Failed to parse Facebook payload:', e)
        return res.status(400).send('Bad Request')
      }

      // TODO: process events as needed (dispatch to queue, persist, etc.)
      console.log('Facebook webhook event received:', JSON.stringify(body))

      // Respond quickly to Facebook
      return res.status(200).json({ received: true })
    } catch (error) {
      console.error('Error handling Facebook webhook:', error)
      return res.status(500).send('Server error')
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end('Method Not Allowed')
}
