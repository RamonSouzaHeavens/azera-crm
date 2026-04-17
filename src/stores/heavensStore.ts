import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface HeavensStore {
  supabaseUrl: string
  supabaseServiceKey: string
  setCredentials: (url: string, key: string) => void
  isConfigured: () => boolean
}

export const useHeavensStore = create<HeavensStore>()(
  persist(
    (set, get) => ({
      supabaseUrl: '',
      supabaseServiceKey: '',
      setCredentials: (url, key) => set({ supabaseUrl: url, supabaseServiceKey: key }),
      isConfigured: () => {
        const state = get()
        return !!state.supabaseUrl.trim() && !!state.supabaseServiceKey.trim()
      }
    }),
    {
      name: 'heavens-ai-storage' // salva no localStorage
    }
  )
)
