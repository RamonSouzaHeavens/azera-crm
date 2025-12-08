import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useOnboardingStatus() {
  const { user } = useAuthStore()
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkOnboardingStatus = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setHasCompletedOnboarding(data?.onboarding_completed ?? false)
    } catch (error) {
      console.error('Erro ao verificar status de onboarding:', error)
      setHasCompletedOnboarding(true) // Mostrar app se der erro
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    checkOnboardingStatus()
  }, [user?.id, checkOnboardingStatus])

  async function markOnboardingAsComplete() {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user!.id)

      if (error) throw error
      setHasCompletedOnboarding(true)
    } catch (error) {
      console.error('Erro ao marcar onboarding como completo:', error)
    }
  }

  return {
    hasCompletedOnboarding,
    loading,
    markOnboardingAsComplete
  }
}
