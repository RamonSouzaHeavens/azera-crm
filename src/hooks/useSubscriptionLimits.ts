import { useSubscription } from './useSubscription'

export const LIMITS = {
  FREE_MAX_PRODUCTS: 5,
  // Leads são ilimitados sempre
}

export const useSubscriptionLimits = () => {
  const { isActive } = useSubscription()

  return {
    // Equipe
    canShareTeamCode: isActive,
    canJoinTeam: isActive,
    canAddMembers: isActive,
    
    // Produtos
    maxProducts: isActive ? Infinity : LIMITS.FREE_MAX_PRODUCTS,
    canAddProduct: (currentCount: number) => {
      if (isActive) return true
      return currentCount < LIMITS.FREE_MAX_PRODUCTS
    },
    
    // Leads são sempre ilimitados
    canAddLead: true,
    maxLeads: Infinity,
    
    // Status
    hasActiveSubscription: isActive,
  }
}
