import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface FetchAvatarResult {
  success: boolean
  avatar_url: string | null
  message?: string
}

export function useFetchAvatar() {
  const [loading, setLoading] = useState(false)

  const fetchAvatar = useCallback(async (
    conversationId: string,
    phoneNumber: string
  ): Promise<string | null> => {
    if (!conversationId || !phoneNumber) return null

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke<FetchAvatarResult>('fetch-avatar', {
        body: { conversationId, phoneNumber }
      })

      if (error) {
        console.error('[useFetchAvatar] Error:', error)
        return null
      }

      return data?.avatar_url || null
    } catch (err) {
      console.error('[useFetchAvatar] Exception:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchAvatar, loading }
}
