import React, { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { NoteCard } from './NoteCard';
import { AddActivityModal } from './AddActivityModal';
import { DeleteNoteModal } from './DeleteNoteModal';

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
}

interface LeadTimelineProps {
  leadId: string;
}

export const LeadTimeline: React.FC<LeadTimelineProps> = ({ leadId }) => {
  const { tenant, user } = useAuthStore();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [editingActivity, setEditingActivity] = useState<TimelineItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<TimelineItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTimeline = async () => {
    if (!tenant) return;

    const { data } = await supabase
      .from('atividades')
      .select('*')
      .eq('cliente_id', leadId)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    setTimeline(data?.map(item => {
      // Parse conteudo to extract title and description
      const content = item.conteudo || '';
      const lines = content.split('\n');
      const title = lines[0]?.replace(/^\*\*|\*\*$/g, '') || 'Atividade';
      const description = lines.slice(1).join('\n').trim();

      return {
        id: item.id,
        type: item.tipo,
        title,
        description,
        created_at: item.created_at
      };
    }) || []);
  };

  useEffect(() => {
    fetchTimeline();
  }, [leadId, tenant]);

  const handleDeleteClick = (id: string) => {
    const note = timeline.find(item => item.id === id);
    if (note) {
      setNoteToDelete(note);
      setDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('atividades')
        .delete()
        .eq('id', noteToDelete.id)
        .eq('tenant_id', tenant?.id);

      if (error) throw error;

      await fetchTimeline();
      setDeleteModalOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      alert('Erro ao excluir atividade');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: TimelineItem) => {
    setEditingActivity(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingActivity(null);
  };

  const handleSuccess = () => {
    fetchTimeline();
  };

  return (
    <div className="space-y-3">
      {timeline.map((item) => (
        <NoteCard
          key={item.id}
          item={item}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      ))}

      {tenant && user && (
        <AddActivityModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          leadId={leadId}
          tenantId={tenant.id}
          userId={user.id}
          onSuccess={handleSuccess}
          activityToEdit={editingActivity}
        />
      )}

      <DeleteNoteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setNoteToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        noteTitle={noteToDelete?.title || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};
