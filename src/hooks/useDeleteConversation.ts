import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export function useDeleteConversation() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const deleteConversation = async (conversationId: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_conversation', {
        p_conversation_id: conversationId,
        p_user_id: user.id
      });

      if (error) {
        console.error('Erro ao deletar conversa:', error);
        toast.error('Erro ao deletar conversa');
        return false;
      }

      if (data?.error) {
        console.error('Erro na função RPC:', data.error);
        toast.error(data.error);
        return false;
      }

      toast.success('Conversa deletada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao deletar conversa');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteConversation, loading };
}