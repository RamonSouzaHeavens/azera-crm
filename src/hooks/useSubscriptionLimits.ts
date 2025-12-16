import { useSubscription } from './useSubscription'

/**
 * MODELO DE NEGÓCIO:
 *
 * GRATUITO (com limitações):
 * - Ter uma equipe básica (pode criar e participar)
 * - Até 5 produtos
 * - Leads ilimitados
 * - Visualização de membros da equipe
 *
 * PREMIUM (requer assinatura individual):
 * - Convidar membros para equipe (compartilhar código)
 * - Distribuição automática de leads
 * - Conectar canais (WhatsApp, Instagram, etc.)
 * - Ferramentas PRO (Battlecards, ROI Calculator, etc.)
 * - Automações
 * - Chaves API
 * - Produtos ilimitados
 */

export const LIMITS = {
  FREE_MAX_PRODUCTS: 5,
  FREE_MAX_TEAM_MEMBERS: 1, // Só o próprio usuário
  // Leads são ilimitados sempre
}

export const useSubscriptionLimits = () => {
  const { isActive, isDevBypass } = useSubscription()

  return {
    // ========================================
    // EQUIPE
    // ========================================
    // GRATUITO: Pode ter equipe, mas não pode convidar
    canHaveTeam: true, // Todos podem criar/ter equipe
    canViewTeamMembers: true, // Todos podem ver membros

    // PREMIUM: Convidar e gerenciar membros
    canShareTeamCode: isActive, // Compartilhar código de convite
    canInviteMembers: isActive, // Convidar membros
    canDistributeLeads: isActive, // Distribuição automática de leads

    // ========================================
    // PRODUTOS
    // ========================================
    maxProducts: isActive ? Infinity : LIMITS.FREE_MAX_PRODUCTS,
    canAddProduct: (currentCount: number) => {
      if (isActive) return true
      return currentCount < LIMITS.FREE_MAX_PRODUCTS
    },

    // ========================================
    // LEADS (ilimitados para todos)
    // ========================================
    canAddLead: true,
    maxLeads: Infinity,

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

