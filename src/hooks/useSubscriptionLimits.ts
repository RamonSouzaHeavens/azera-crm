import { useSubscription } from './useSubscription'

/**
 * MODELO DE NEGÓCIO:
 *
 * GRATUITO (com limitações):
 * - Criar equipe (como owner) - GRATUITO
 * - Até 5 produtos
 * - Até 100 leads
 * - Tarefas ilimitadas
 * - Uso individual (1 membro na equipe)
 *
 * PREMIUM (requer assinatura individual):
 * - Entrar em equipe (como membro) - REQUER ASSINATURA
 * - Convidar membros para equipe - REQUER ASSINATURA
 * - Equipe ilimitada
 * - Leads ilimitados
 * - Distribuição automática de leads
 * - Conectar canais (WhatsApp, Instagram, etc.)
 * - Ferramentas PRO (Battlecards, ROI Calculator, etc.)
 * - Automações
 * - Chaves API
 * - Produtos ilimitados
 *
 * IMPORTANTE:
 * - Qualquer um pode CRIAR uma equipe gratuitamente
 * - Para CONVIDAR membros, o owner precisa de assinatura
 * - Para ENTRAR em uma equipe, o membro precisa de assinatura
 */

export const LIMITS = {
  FREE_MAX_PRODUCTS: 5,
  FREE_MAX_LEADS: 100,
  FREE_MAX_TEAM_MEMBERS: 1, // Apenas o owner no plano gratuito
}

export const useSubscriptionLimits = () => {
  const { isActive, isDevBypass } = useSubscription()

  return {
    // ========================================
    // EQUIPE
    // ========================================
    canHaveTeam: true, // Todos podem ter equipe
    canCreateTeam: true, // GRATUITO: Qualquer um pode criar equipe
    canJoinTeam: isActive, // PREMIUM: Precisa de assinatura para entrar em equipe
    canViewTeamMembers: true, // Todos podem ver membros
    canShareTeamCode: isActive, // PREMIUM: Compartilhar código de convite
    canInviteMembers: isActive, // PREMIUM: Convidar membros
    canDistributeLeads: isActive, // PREMIUM: Distribuição automática de leads
    maxTeamMembers: isActive ? Infinity : LIMITS.FREE_MAX_TEAM_MEMBERS,

    // ========================================
    // PRODUTOS
    // ========================================
    maxProducts: isActive ? Infinity : LIMITS.FREE_MAX_PRODUCTS,
    canAddProduct: (currentCount: number) => {
      if (isActive) return true
      return currentCount < LIMITS.FREE_MAX_PRODUCTS
    },

    // ========================================
    // LEADS
    // ========================================
    maxLeads: isActive ? Infinity : LIMITS.FREE_MAX_LEADS,
    canAddLead: (currentCount: number) => {
      if (isActive) return true
      return currentCount < LIMITS.FREE_MAX_LEADS
    },

    // ========================================
    // FUNCIONALIDADES PREMIUM
    // ========================================
    canConnectChannels: isActive, // WhatsApp, Instagram, etc.
    canUseProTools: isActive, // Battlecards, ROI, etc.
    canUseAutomations: isActive, // Automações
    canUseApiKeys: isActive, // Chaves API
    canImportCSV: isActive, // Importação em massa

    // ========================================
    // STATUS
    // ========================================
    hasActiveSubscription: isActive,
    isDevBypass: isDevBypass ?? false,
  }
}

