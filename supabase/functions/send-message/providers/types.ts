// deno-lint-ignore-file no-explicit-any

export interface SendMessageParams {
  recipientId: string
  message: string
  mediaUrl?: string
  mediaType?: string
  mimetype?: string
}

export interface SendResult {
  success: boolean
  externalId: string
  error?: string
}

export interface MessageProvider {
  send(params: SendMessageParams): Promise<SendResult>
}
