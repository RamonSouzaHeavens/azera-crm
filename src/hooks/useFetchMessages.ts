import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useFetchMessages() {
    const [loading, setLoading] = useState(false)

    const fetchMessages = useCallback(async (conversationId: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase.functions.invoke('fetch-messages', {
                body: { conversationId }
            })

            if (error) throw error

            const count = data?.count ?? 0
            if (count > 0) {
                toast.success(`Mensagens atualizadas! ${count} novas mensagens.`)
            }
            return data
        } catch (error) {
            console.error('Error fetching messages:', error)
            toast.error('Erro ao buscar mensagens')
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    return { fetchMessages, loading }
}
