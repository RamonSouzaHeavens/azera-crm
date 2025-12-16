import { supabase } from '../lib/supabase'

/**
 * Verifica e desbloqueia conquistas para um usuário.
 * Deve ser chamado após ações que podem desbloquear conquistas:
 * - Tarefa concluída
 * - Lead fechado
 * - Proposta enviada
 * - Atividade de ligação/reunião registrada
 */
export async function checkAndUnlockAchievements(userId: string, tenantId: string): Promise<void> {
  if (!userId || !tenantId) {
    console.warn('[AchievementService] userId ou tenantId não fornecido')
    return
  }

  try {
    const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: userId,
      p_tenant_id: tenantId
    })

    if (error) {
      console.error('[AchievementService] Erro ao verificar conquistas:', error)
      return
    }

    // Log de conquistas desbloqueadas (se houver)
    if (data && Array.isArray(data) && data.length > 0) {
      data.forEach((achievement: { achievement_name: string; newly_unlocked: boolean }) => {
        if (achievement.newly_unlocked) {
          console.log(`🏆 Conquista desbloqueada: ${achievement.achievement_name}`)
        }
      })
    }
  } catch (err) {
    console.error('[AchievementService] Erro inesperado:', err)
  }
}
