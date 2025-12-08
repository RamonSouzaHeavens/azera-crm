import { ShieldCheck, Pencil, Trash2 } from 'lucide-react'
import { ObjectionCardRow, stageVariants, tacticVariants } from '../../hooks/useObjectionPlaybook'

interface ObjectionCardProps {
  card: ObjectionCardRow
  onEdit?: (card: ObjectionCardRow) => void
  onDelete?: (card: ObjectionCardRow) => void
  isEditable?: boolean
}

export function ObjectionCard({ card, onEdit, onDelete, isEditable = false }: ObjectionCardProps) {
  const stageVariant = stageVariants[card.stage]
  const tacticVariant = tacticVariants[card.tactic] ?? {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-200',
    border: 'border-slate-200 dark:border-slate-700'
  }

  return (
    <article className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span
          className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${stageVariant.border} ${stageVariant.bg} ${stageVariant.text}`}
        >
          {stageVariant.label}
        </span>
        <span
          className={`flex items-center gap-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${tacticVariant.border} ${tacticVariant.bg} ${tacticVariant.text}`}
        >
          <ShieldCheck className="w-3 h-3" /> {card.tactic}
        </span>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Objeção</p>
      <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">{card.objection}</p>

      <div className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Resposta sugerida</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{card.response}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          Atualizado em {new Date(card.updated_at).toLocaleDateString('pt-BR')}
        </p>
        <div className="flex items-center gap-2">
          {card.is_default && (
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Padrão do sistema
            </span>
          )}
          {isEditable && (
            <>
              <button
                type="button"
                onClick={() => onEdit?.(card)}
                className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20"
              >
                <Pencil className="w-3 h-3" /> Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(card)}
                className="flex items-center gap-1 px-3 py-1 rounded-full border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
