import { useMemo } from 'react'
﻿import { useNavigate } from 'react-router-dom'
import {
  Search,
  Brain,
  Calculator,
  FileText,
  MessageSquare,
  Swords,
  Mic,
  Mail,
  ArrowRight
} from 'lucide-react'

const tools = [
  {
    id: 'enrich',
    title: 'Enriquecimento de Dados',
    description: 'Encontre emails corporativos, cargos e telefones a partir de um lead em poucos segundos.',
    icon: <Search className="w-6 h-6 text-blue-500 dark:text-blue-400" />,
    color: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    btnColor: 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/10',
    status: 'Popular',
    path: '/app/ferramentas-pro/enriquecimento',
    available: false,
    locked: true
  },
  {
    id: 'ai_profile',
    title: 'Análise de Perfil (IA)',
    description: 'Identifique o tom do cliente e receba recomendações DISC para adaptar sua abordagem.',
    icon: <Brain className="w-6 h-6 text-purple-500 dark:text-purple-400" />,
    color: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
    btnColor: 'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/10',
    status: 'IA',
    path: '/app/ferramentas-pro/perfil-ia',
    available: false,
    locked: true
  },
  {
    id: 'roi_calc',
    title: 'Calculadora de ROI',
    description: 'Mostre o impacto financeiro da solução e ajude o cliente a justificar o investimento.',
    icon: <Calculator className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />,
    color: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    btnColor: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10',
    path: '/app/ferramentas-pro/roi',
    available: true,
  },
  {
    id: 'proposals_tool',
    title: 'Gerador de Propostas',
    description: 'Transforme dados do CRM em contratos e propostas profissionais em segundos.',
    icon: <FileText className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />,
    color: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20',
    btnColor: 'text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/10',
    status: 'Essencial',
    path: '/app/ferramentas-pro/propostas'
  },
  {
    id: 'battlecards',
    title: 'Comparativo (Battlecards)',
    description: 'Destaque os pontos fortes do Azera frente ao concorrente mencionado pelo cliente.',
    icon: <Swords className="w-6 h-6 text-rose-500 dark:text-rose-400" />,
    color: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
    btnColor: 'text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10',
    path: '/app/ferramentas-pro/battlecards'
  },
  {
    id: 'meeting_summary',
    title: 'Resumo de Reunião',
    description: 'Colete as anotações e receba uma ata com decisões e próximos passos.',
    icon: <Mic className="w-6 h-6 text-orange-500 dark:text-orange-400" />,
    color: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
    btnColor: 'text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/10',
    status: 'Novo',
    path: '/app/ferramentas-pro/resumo-reuniao',
    locked: true
  },
  {
    id: 'email_seq',
    title: 'Sequência de Cadência',
    description: 'Planeje uma jornada de emails com prazos e modelos inteligentes para nutrir o lead.',
    icon: <Mail className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />,
    color: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    btnColor: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/10',
    status: 'Beta',
    path: '/app/ferramentas-pro/sequencia-email',
    locked: true
  },
  {
    id: 'playbook',
    title: 'Playbook de Objeções',
    description: 'Receba respostas prontas para lidar com objeções como “está caro” ou “vou pensar”.',
    icon: <MessageSquare className="w-6 h-6 text-teal-500 dark:text-teal-400" />,
    color: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20',
    btnColor: 'text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/10',
    path: '/app/ferramentas-pro/playbook'
  }
]

export default function FerramentasPro() {
  const navigate = useNavigate()
  const sortedTools = useMemo(() => {
    const available = tools.filter((tool) => !tool.locked && tool.available !== false)
    const soon = tools.filter((tool) => tool.locked || tool.available === false)
    return [...available, ...soon]
  }, [])

  return (
    <div className="w-full max-w-[1440px] mx-auto p-6 md:p-10 min-h-screen flex flex-col">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
          Aceleradores de Vendas
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Todas as ferramentas Pro em um só lugar. Escolha um acelerador para aprofundar a estratégia e apresentar valor em minutos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sortedTools.map((tool, idx) => {
          const isLocked = tool.locked
          const disabled = isLocked || tool.available === false
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                if (disabled) return
                navigate(tool.path)
              }}
              style={{ animationDelay: `${idx * 60}ms` }}
              className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-6 transition-all duration-300 flex flex-col cursor-pointer ${tool.color} ${disabled ? 'pointer-events-none opacity-60 blur-[0.5px]' : 'hover:-translate-y-1 hover:shadow-xl hover:bg-opacity-50 dark:hover:bg-opacity-30'}`}
            >
              {disabled && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 text-white text-sm font-bold uppercase tracking-wider">
                  Em breve..
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white dark:bg-slate-950/60 rounded-xl w-fit border border-slate-100 dark:border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-sm dark:shadow-lg">
                  {tool.icon}
              </div>
              {tool.status && (
                <span className="bg-white dark:bg-slate-950/60 backdrop-blur text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-sm">
                  {tool.status}
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors text-left">
              {tool.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 flex-1 text-left">
              {tool.description}
            </p>

            <div className={`w-full flex items-center justify-between py-2 px-1 rounded-lg font-medium text-sm transition-all mt-auto ${tool.btnColor} group-hover:translate-x-1`}>
              <span>Abrir ferramenta</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
          )
        })}
      </div>
    </div>
  )
}
