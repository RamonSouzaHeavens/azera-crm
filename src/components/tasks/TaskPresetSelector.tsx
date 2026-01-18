import { Video, FileImage, Phone, UserPlus, ListChecks } from 'lucide-react'

// ============================================================================
// TIPOS
// ============================================================================

export interface TaskPreset {
  id: string
  nome: string
  emoji: string
  descricao: string
  // Cores no estilo sutil (borda, accent, glow)
  borderColor: string
  accentColor: string
  glowColor: string
  icon: typeof Video
  valores: {
    titulo?: string
    descricao?: string
    prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
    checklist: string[]
  }
}

// ============================================================================
// PRESETS PADRÃO
// ============================================================================

export const TASK_PRESETS: TaskPreset[] = [
  {
    id: 'padrao',
    nome: 'Tarefa Padrão',
    emoji: '📋',
    descricao: 'Tarefa em branco para customizar',
    borderColor: 'border-slate-500/50',
    accentColor: 'text-slate-400',
    glowColor: 'group-hover:shadow-slate-500/20',
    icon: ListChecks,
    valores: {
      titulo: '',
      descricao: '',
      prioridade: 'media',
      checklist: []
    }
  },
  {
    id: 'video',
    nome: 'Vídeo',
    emoji: '🎬',
    descricao: 'Gravação de vídeo para redes sociais',
    borderColor: 'border-rose-500/40',
    accentColor: 'text-rose-400',
    glowColor: 'group-hover:shadow-rose-500/20',
    icon: Video,
    valores: {
      titulo: 'Gravar vídeo: ',
      descricao: '📹 Vídeo para redes sociais\n\nObjetivo: Demonstrar funcionalidade do CRM\nFormato: Vertical (9:16) para Stories/Reels',
      prioridade: 'media',
      checklist: [
        'Preparar roteiro/pauta',
        'Gravar vídeo',
        'Editar e adicionar legendas',
        'Exportar no formato correto',
        'Upload no Drive/Pasta',
        'Publicar nas redes'
      ]
    }
  },
  {
    id: 'post',
    nome: 'Post',
    emoji: '📸',
    descricao: 'Criação de conteúdo para feed',
    borderColor: 'border-violet-500/40',
    accentColor: 'text-violet-400',
    glowColor: 'group-hover:shadow-violet-500/20',
    icon: FileImage,
    valores: {
      titulo: 'Criar post: ',
      descricao: '📱 Post para redes sociais\n\nTipo: Carrossel / Imagem única\nObjetivo: Engajar audiência',
      prioridade: 'baixa',
      checklist: [
        'Definir tema/pauta',
        'Criar arte/design',
        'Escrever copy/legenda',
        'Revisar conteúdo',
        'Agendar publicação',
        'Publicar e monitorar'
      ]
    }
  },
  {
    id: 'followup',
    nome: 'Follow Up',
    emoji: '📞',
    descricao: 'Retorno de contato com lead/cliente',
    borderColor: 'border-amber-500/40',
    accentColor: 'text-amber-400',
    glowColor: 'group-hover:shadow-amber-500/20',
    icon: Phone,
    valores: {
      titulo: 'Follow up: ',
      descricao: '🔄 Retorno de contato\n\nObjetivo: Manter relacionamento e avançar negociação',
      prioridade: 'alta',
      checklist: [
        'Revisar histórico do contato',
        'Definir abordagem',
        'Realizar contato',
        'Registrar resultado na timeline',
        'Agendar próximo passo'
      ]
    }
  },
  {
    id: 'prospeccao',
    nome: 'Prospecção',
    emoji: '🎯',
    descricao: 'Buscar e qualificar novos leads',
    borderColor: 'border-cyan-500/40',
    accentColor: 'text-cyan-400',
    glowColor: 'group-hover:shadow-cyan-500/20',
    icon: UserPlus,
    valores: {
      titulo: 'Prospectar: ',
      descricao: '🔍 Prospecção ativa\n\nObjetivo: Encontrar e qualificar novos potenciais clientes',
      prioridade: 'alta',
      checklist: [
        'Definir perfil ideal',
        'Pesquisar leads potenciais',
        'Qualificar interesse',
        'Fazer primeiro contato',
        'Cadastrar lead no CRM',
        'Agendar reunião/apresentação'
      ]
    }
  }
]

// ============================================================================
// COMPONENTE: CARD DE PRESET
// ============================================================================

interface PresetCardProps {
  preset: TaskPreset
  onClick: () => void
}

function PresetCard({ preset, onClick }: PresetCardProps) {
  const Icon = preset.icon

  return (
    <button
      onClick={onClick}
      className={`
        group relative rounded-xl p-3 transition-all duration-200
        border ${preset.borderColor} hover:border-opacity-80
        bg-slate-800/50 hover:bg-slate-800/80
        hover:scale-[1.02] text-left w-full
      `}
    >
      {/* Content */}
      <div className="relative z-10">
        {/* Emoji e Ícone */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl">{preset.emoji}</span>
          <Icon className={`w-4 h-4 ${preset.accentColor}`} />
        </div>

        {/* Nome */}
        <h3 className="text-sm font-semibold text-white mb-0.5">
          {preset.nome}
        </h3>

        {/* Descrição */}
        <p className="text-xs text-slate-400 line-clamp-1">
          {preset.descricao}
        </p>
      </div>
    </button>
  )
}

interface TaskPresetSelectorProps {
  onSelect: (preset: TaskPreset) => void
  onClose: () => void
}

export default function TaskPresetSelector({ onSelect, onClose }: TaskPresetSelectorProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 w-full sm:max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header compacto */}
        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Nova Tarefa</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid de Presets - 2 colunas */}
        <div className="p-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2">
            {TASK_PRESETS.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onClick={() => onSelect(preset)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

