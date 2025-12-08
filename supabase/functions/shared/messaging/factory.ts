/**
 * =====================================================================
 * ETAPA 2.1: FACTORY PATTERN - PROVIDER FACTORY
 * =====================================================================
 * Arquivo: factory.ts
 * Localização: supabase/functions/shared/messaging/factory.ts
 * Propósito: Instanciar o provedor correto baseado em tenant_id + channel
 *
 * PADRÃO: Factory Pattern (Creational Pattern)
 * - Centraliza lógica de instanciação
 * - Permite adicionar novos provedores sem alterar código cliente
 * - Busca credenciais do banco de forma segura (Service Role)
 * =====================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { IMessagingProvider, ProviderType, ChannelType } from './types.ts'
import { MetaProvider } from './providers/meta.ts'
import { EvolutionProvider } from './providers/evolution.ts'
import { ZapiProvider } from './providers/zapi.ts'
import { ProviderError, ProviderErrorCode } from './types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Factory para criar instância do provedor correto
 * Uso:
 *   const provider = await ProviderFactory.create(tenantId, 'whatsapp')
 *   const response = await provider.sendMessage(payload)
 */
export class ProviderFactory {
  /**
   * Criar provedor para um tenant específico
   * @param tenantId - ID do tenant
   * @param channel - 'whatsapp' | 'instagram'
   * @returns Instância do provedor
   * @throws ProviderError se integração não encontrada ou inativa
   */
  static async create(tenantId: string, channel: ChannelType): Promise<IMessagingProvider> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Buscar integração ativa no banco
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .eq('is_active', true)
      .single()

    if (error || !integration) {
      throw new ProviderError(
        ProviderErrorCode.INTEGRATION_NOT_FOUND,
        404,
        `Nenhuma integração ${channel} ativa para tenant ${tenantId}`
      )
    }

    // 2. Validar status
    if (integration.status !== 'active') {
      throw new ProviderError(
        ProviderErrorCode.INVALID_CREDENTIALS,
        403,
        `Integração em status ${integration.status}, não está ativa`
      )
    }

    // 3. Instanciar provedor correto
    const providerType = integration.provider as ProviderType

    switch (providerType) {
      case 'meta_official':
      case 'meta_business_api':
        return new MetaProvider(
          integration.id,
          integration.credentials,
          integration.config,
          integration.channel
        )

      case 'evolution_api':
        return new EvolutionProvider(
          integration.id,
          integration.credentials,
          integration.config,
          integration.channel
        )

      case 'zapi':
      case 'uazapi': // Alias para instâncias Uazapi (compatíveis com Z-API)
        return new ZapiProvider(
          integration.id,
          integration.credentials,
          integration.config,
          integration.channel
        )

      default:
        throw new ProviderError(
          ProviderErrorCode.INVALID_CREDENTIALS,
          400,
          `Provedor ${providerType} não suportado`
        )
    }
  }

  /**
   * Listar todos os provedores disponíveis de um tenant
   */
  static async listIntegrations(tenantId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabase
      .from('integrations')
      .select('id, channel, provider, status, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}

/**
 * EXEMPLO DE USO EM EDGE FUNCTION:
 *
 * import { ProviderFactory } from '../shared/messaging/factory.ts'
 *
 * serve(async (req) => {
 *   try {
 *     const { tenantId, contactNumber, message } = await req.json()
 *
 *     // Factory cria provider correto automaticamente
 *     const provider = await ProviderFactory.create(tenantId, 'whatsapp')
 *
 *     const response = await provider.sendMessage({
 *       tenantId,
 *       conversationId: 'conv_123',
 *       externalContactId: contactNumber,
 *       message
 *     })
 *
 *     return new Response(JSON.stringify(response), { status: 200 })
 *   } catch (error) {
 *     console.error('Error:', error)
 *     return new Response(JSON.stringify({ error: error.message }), { status: 500 })
 *   }
 * })
 */
