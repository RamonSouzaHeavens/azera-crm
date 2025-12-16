// deno-lint-ignore-file no-explicit-any
import { MessageProvider, SendMessageParams, SendResult } from './types.ts'

/**
 * InstagramProvider - Envia mensagens via Instagram Graph API
 *
 * Credenciais esperadas:
 * - access_token: Token de acesso da página/Instagram
 * - page_id: ID da página (opcional, usado para log)
 * - instagram_business_account_id: ID da conta Instagram Business (opcional)
 */
export class InstagramProvider implements MessageProvider {
  private accessToken: string
  private pageId?: string

  constructor(credentials: any) {
    this.accessToken = credentials.access_token
    this.pageId = credentials.page_id

    if (!this.accessToken) {
      throw new Error('Access Token não configurado na integração Instagram')
    }
  }

  async send(params: SendMessageParams): Promise<SendResult> {
    const { recipientId, message, mediaUrl, mediaType } = params

    // DISABLED INSTAGRAM INTEGRATION
    if (true) {
        return { success: false, externalId: '', error: 'Integração com Instagram desativada temporariamente.' }
    }

    if (!recipientId) {
      return { success: false, externalId: '', error: 'ID do destinatário Instagram não encontrado' }
    }

    // Determina qual API usar baseada no tipo de token
    // IGAA... -> Token específico do Instagram (não acessa foto de perfil, usa graph.instagram.com)
    // EAA... -> Token da Página do Facebook (acessa foto de perfil, usa graph.facebook.com)
    const isPageToken = this.accessToken.startsWith('EAA')
    const apiHost = isPageToken ? 'graph.facebook.com' : 'graph.instagram.com'
    const url = `https://${apiHost}/v21.0/me/messages`

    let messagePayload: any

    if (mediaUrl) {
      if (isPageToken) {
        // Payload para API do Facebook (Page Token)
        messagePayload = {
          attachment: {
            type: mediaType || 'image',
            payload: {
              url: mediaUrl,
              is_reusable: true
            }
          }
        }
      } else {
        // Payload para API do Instagram (IGAA Token)
        messagePayload = {
          attachment: {
            type: mediaType || 'image',
            payload: {
              url: mediaUrl,
              is_reusable: true
            }
          }
        }
      }

      // Caption só funciona em image, video e audio
      if (message && message !== `[${(mediaType || 'image').toUpperCase()}]`) {
        if (['image', 'video', 'audio'].includes(mediaType || 'image')) {
          messagePayload.attachment.payload.caption = message
        }
      }
    } else {
      messagePayload = { text: message }
    }

    const payload = {
      recipient: { id: recipientId },
      message: messagePayload
    }

    console.log(`[INSTAGRAM] Using ${apiHost} (Token: ${isPageToken ? 'Page/EAA' : 'IGAA'})`)
    console.log('[INSTAGRAM] URL:', url)
    console.log('[INSTAGRAM] Page ID:', this.pageId)
    console.log('[INSTAGRAM] Recipient:', recipientId)
    console.log('[INSTAGRAM] Payload:', JSON.stringify(payload))

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      console.log('[INSTAGRAM] Response:', res.status, JSON.stringify(data))

      if (!res.ok) {
        return {
          success: false,
          externalId: '',
          error: 'Instagram API Error: ' + JSON.stringify(data)
        }
      }

      return {
        success: true,
        externalId: data.message_id || 'unknown'
      }
    } catch (error) {
      console.error('[INSTAGRAM] Fetch error:', error)
      return { success: false, externalId: '', error: String(error) }
    }
  }
}
