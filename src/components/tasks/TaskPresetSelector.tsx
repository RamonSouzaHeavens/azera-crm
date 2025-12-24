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
        group relative rounded-2xl p-5 transition-all duration-300
        border ${preset.borderColor} hover:border-opacity-80
        bg-slate-800/50 hover:bg-slate-800/80
        hover:scale-[1.02] hover:shadow-xl ${preset.glowColor}
        text-left w-full backdrop-blur-sm
      `}
    >
      {/* Subtle glow on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Emoji e Ícone */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">{preset.emoji}</span>
          <div className={`w-9 h-9 rounded-xl bg-white/5 border ${preset.borderColor} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${preset.accentColor}`} />
          </div>
        </div>

        {/* Nome */}
        <h3 className="text-base font-semibold text-white mb-1">
          {preset.nome}
        </h3>

        {/* Descrição */}
        <p className="text-sm text-slate-400 line-clamp-2">
          {preset.descricao}
        </p>

        {/* Indicador de checklist */}
        {preset.valores.checklist.length > 0 && (
          <div className={`mt-3 flex items-center gap-2 text-xs ${preset.accentColor} opacity-70`}>
            <ListChecks className="w-3.5 h-3.5" />
            <span>{preset.valores.checklist.length} itens no checklist</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL: SELETOR DE PRESET
// ============================================================================

interface TaskPresetSelectorProps {
  onSelect: (preset: TaskPreset) => void
  onClose: () => void
}

export default function TaskPresetSelector({ onSelect, onClose }: TaskPresetSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900/95 w-full max-w-3xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 backdrop-blur-xl">

        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <ListChecks className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Nova Tarefa</h2>
              <p className="text-sm text-slate-400">Escolha um tipo de tarefa para começar</p>
            </div>
          </div>
        </div>

        {/* Grid de Presets */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TASK_PRESETS.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onClick={() => onSelect(preset)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
