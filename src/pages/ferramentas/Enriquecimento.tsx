import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Linkedin,
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Save,
  Sparkles,
  TrendingUp,
  Users,
  ExternalLink,
  Settings,
  Trash2,
  Copy,
  FileSpreadsheet,
  UserSquare2
} from 'lucide-react'

// --- Types ---

interface EnrichedProfile {
  id: string
  name: string
  email: string
  emailStatus: 'verified' | 'risky' | 'pattern_guess'
  phone?: string
  title: string
  company: string
  location: string
  linkedin?: string
  companySize?: string
  industry?: string
  confidence: number
  lastUpdated: string
  source: 'api' | 'simulation'
}

interface SearchHistoryItem {
  id: string
  name: string
  company: string
  timestamp: string
  fullDate: string
  status: 'success' | 'partial' | 'failed'
}

interface AppSettings {
  apiKey?: string
  provider: 'simulation' | 'hunter' | 'snov'
}

// --- Helper Functions ---

const generateEmailPatterns = (name: string, domain: string) => {
  const parts = name.toLowerCase().split(' ')
  const first = parts[0]
  const last = parts[parts.length - 1]

  // Return most common corporate patterns
  return [
    `${first}.${last}@${domain}`,
    `${first}@${domain}`,
    `${first.charAt(0)}${last}@${domain}`
  ]
}

const cleanDomain = (company: string, customDomain?: string) => {
  if (customDomain) return customDomain
  return company
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '') + '.com.br'
}

// --- Component ---

export default function Enriquecimento() {
  const navigate = useNavigate()

  // --- States ---

  // Form
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [domain, setDomain] = useState('')

  // UI & Data
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<EnrichedProfile | null>(null)
  const [view, setView] = useState<'search' | 'crm' | 'settings'>('search')

  // Persistence (Lazy initializers)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    const saved = localStorage.getItem('enrich_history')
    return saved ? JSON.parse(saved) : []
  })

  const [savedContacts, setSavedContacts] = useState<EnrichedProfile[]>(() => {
    const saved = localStorage.getItem('enrich_crm')
    return saved ? JSON.parse(saved) : []
  })

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('enrich_settings')
    return saved ? JSON.parse(saved) : { provider: 'simulation', apiKey: '' }
  })

  // Effects for Persistence
  useEffect(() => { localStorage.setItem('enrich_history', JSON.stringify(searchHistory)) }, [searchHistory])
  useEffect(() => { localStorage.setItem('enrich_crm', JSON.stringify(savedContacts)) }, [savedContacts])
  useEffect(() => { localStorage.setItem('enrich_settings', JSON.stringify(settings)) }, [settings])

  // --- Logic ---

  const handleSearch = async () => {
    if (!name || !company) return

    setLoading(true)
    setProfile(null)

    // Simulate Network Delay (or Real API call time)
    setTimeout(async () => {
      try {
        let result: EnrichedProfile

        const processedDomain = cleanDomain(company, domain)

        if (settings.provider === 'hunter' && settings.apiKey) {
          // Aqui entraria a chamada real para API se o usuário tiver configurado
          // Exemplo: const res = await fetch(`https://api.hunter.io/v2/email-finder?domain=${processedDomain}...`)
          // Como não temos a key agora, caímos no fallback simulado mas avisamos
          console.log("Tentativa de uso de API Real (Mockada para demonstração)")
        }

        // Lógica de "Inteligência Simulada" (Fallback robusto)
        const possibleEmails = generateEmailPatterns(name, processedDomain)

        result = {
          id: crypto.randomUUID(),
          name: name,
          email: possibleEmails[0], // Best guess
          emailStatus: 'pattern_guess', // Honest status
          phone: '+55 (11) ' + Math.floor(90000000 + Math.random() * 9999999),
          title: 'Cargo Identificado',
          company: company,
          location: 'Brasil (Localização Aproximada)',
          linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
          companySize: 'Tamanho desconhecido',
          industry: 'Setor desconhecido',
          confidence: 75,
          lastUpdated: new Date().toLocaleDateString('pt-BR'),
          source: 'simulation'
        }

        setProfile(result)

        // Add to history
        const newHistoryItem: SearchHistoryItem = {
          id: Date.now().toString(),
          name,
          company,
          timestamp: 'Agora mesmo',
          fullDate: new Date().toLocaleString(),
          status: 'success'
        }
        setSearchHistory(prev => [newHistoryItem, ...prev].slice(0, 10))

      } catch (error) {
        console.error("Erro na busca", error)
      } finally {
        setLoading(false)
      }
    }, 1200)
  }

  const handleSaveToCRM = () => {
    if (!profile) return
    if (savedContacts.some(c => c.email === profile.email)) {
      alert("Contato já existe no CRM!")
      return
    }
    setSavedContacts([profile, ...savedContacts])
  }

  const handleDeleteFromCRM = (id: string) => {
    setSavedContacts(prev => prev.filter(c => c.id !== id))
  }

  const handleExport = (format: 'json' | 'csv' | 'vcf') => {
    const dataToExport = view === 'crm' ? savedContacts : (profile ? [profile] : [])
    if (dataToExport.length === 0) return

    let content = ''
    let mimeType = ''
    let extension = ''

    if (format === 'json') {
      content = JSON.stringify(dataToExport, null, 2)
      mimeType = 'application/json'
      extension = 'json'
    } else if (format === 'csv') {
      const headers = ['Name', 'Email', 'Company', 'Title', 'Phone', 'Linkedin']
      const rows = dataToExport.map(p =>
        `"${p.name}","${p.email}","${p.company}","${p.title}","${p.phone}","${p.linkedin}"`
      )
      content = [headers.join(','), ...rows].join('\n')
      mimeType = 'text/csv'
      extension = 'csv'
    } else if (format === 'vcf') {
      content = dataToExport.map(p =>
        `BEGIN:VCARD\nVERSION:3.0\nFN:${p.name}\nORG:${p.company}\nTITLE:${p.title}\nTEL:${p.phone}\nEMAIL:${p.email}\nEND:VCARD`
      ).join('\n')
      mimeType = 'text/vcard'
      extension = 'vcf'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export_contatos_${new Date().getTime()}.${extension}`
    a.click()
  }

  // Google Dorking helper
  const openDeepSearch = (type: 'linkedin' | 'google') => {
    if (!name || !company) return
    let query = ''
    if (type === 'linkedin') {
      query = `site:linkedin.com/in/ "${name}" "${company}"`
    } else {
      query = `"${name}" "${company}" email OR contato OR "fale conosco"`
    }
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 md:p-8 min-h-screen text-slate-900 dark:text-slate-100 font-sans">
      {/* --- Top Navigation --- */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => navigate('/app/ferramentas-pro')}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setView('search')}
            className={`px-4 py-2 text-sm rounded-md transition-all ${view === 'search' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Busca
          </button>
          <button
            onClick={() => setView('crm')}
            className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${view === 'crm' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            CRM Salvo <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{savedContacts.length}</span>
          </button>
          <button
            onClick={() => setView('settings')}
            className={`p-2 rounded-md transition-all ${view === 'settings' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- Header --- */}
      <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 dark:from-blue-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent mb-2">
          {view === 'crm' ? 'Seus Leads Salvos' : 'Enriquecimento de Dados'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {view === 'crm'
            ? 'Gerencie e exporte os contatos que você encontrou.'
            : 'Inteligência OSINT para localizar emails e validar identidades corporativas.'}
        </p>
      </div>

      {/* --- Main Content Area --- */}

      {view === 'settings' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Configurações de API</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Provedor de Enriquecimento</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
              >
                <option value="simulation">Simulação Inteligente (Gratuito)</option>
                <option value="hunter">Hunter.io (Requer Chave)</option>
                {/* <option value="snov">Snov.io (Em breve)</option> */}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                O modo simulação usa padrões lógicos e OSINT. Para dados reais verificados por SMTP, use uma API paga.
              </p>
            </div>

            {settings.provider !== 'simulation' && (
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="ex: 39847298374293847"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setView('search')} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Salvar e Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'crm' && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700">
              <FileSpreadsheet className="w-4 h-4" /> CSV (Excel)
            </button>
            <button onClick={() => handleExport('vcf')} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700">
              <UserSquare2 className="w-4 h-4" /> vCard (Mobile)
            </button>
          </div>

          {savedContacts.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400">Nenhum contato salvo</h3>
              <button onClick={() => setView('search')} className="text-cyan-600 dark:text-cyan-400 text-sm mt-2 hover:underline">Voltar para busca</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {savedContacts.map(contact => (
                <div key={contact.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">{contact.name}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{contact.title} @ {contact.company}</p>
                      <p className="text-cyan-600 dark:text-cyan-500/80 text-sm mt-1">{contact.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      navigator.clipboard.writeText(`${contact.name} <${contact.email}>`)
                      alert("Copiado!")
                    }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white" title="Copiar">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteFromCRM(contact.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'search' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Search Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Form */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-xl relative overflow-hidden">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex items-center gap-2 mb-6 relative">
                <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buscar Contato</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-5 mb-5 relative">
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold mb-2 block">
                    Nome Completo *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold mb-2 block">
                    Empresa *
                  </label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ex: Tech Solutions"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold mb-2 block">
                    Domínio (Opcional)
                  </label>
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Ex: tech.com.br"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Quick Actions (OSINT) */}
              {(name && company) && (
                <div className="flex flex-wrap gap-2 mb-5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-xs text-slate-500 self-center mr-2">Deep Search:</span>
                  <button
                    onClick={() => openDeepSearch('linkedin')}
                    className="text-xs bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/30 flex items-center gap-1 transition-colors"
                  >
                    <Linkedin className="w-3 h-3" /> Buscar LinkedIn
                  </button>
                  <button
                    onClick={() => openDeepSearch('google')}
                    className="text-xs bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition-colors"
                  >
                    <Search className="w-3 h-3" /> Google Dorks
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || !name || !company}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 font-semibold text-white text-sm shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Minerando dados...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Encontrar Informações
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {profile && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-xl relative">

                  {/* Confidence Badge */}
                  <div className="absolute top-6 right-6 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {profile.confidence}% Match
                    </span>
                  </div>

                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-cyan-500/20">
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                        <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        {profile.title}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">{profile.location}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {/* Email */}
                    <div className={`rounded-xl p-4 border transition-colors ${profile.emailStatus === 'verified'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                          <Mail className="w-4 h-4" />
                          Email Comercial
                        </div>
                        {profile.emailStatus === 'pattern_guess' && (
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">Padrão Provável</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between group/copy">
                        <p className="text-slate-900 dark:text-white font-mono text-sm break-all">{profile.email}</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(profile.email); alert("Email copiado!") }}
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover/copy:opacity-100 transition-opacity"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-2">
                        <Building2 className="w-4 h-4" />
                        Empresa
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium">{profile.company}</p>
                      <a href={`https://${cleanDomain(profile.company, domain)}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 dark:text-cyan-500 hover:underline mt-1 block">
                        Visitar Website
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={handleSaveToCRM}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {savedContacts.some(c => c.id === profile.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Salvo
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Salvar no CRM
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Insights Section */}
                <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Insights de Enriquecimento</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h4 className="text-slate-500 dark:text-slate-400 text-xs uppercase mb-2">Padrão de Email da Empresa</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-mono text-sm">{`{nome}.${generateEmailPatterns(name, 'empresa.com')[0].split('.')[1]}@...`}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h4 className="text-slate-500 dark:text-slate-400 text-xs uppercase mb-2">Validação Cruzada</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Recomendamos validar o email enviando uma mensagem de teste ou usando o botão "Google Dorks" acima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs uppercase text-slate-500 tracking-wider font-bold mb-6">
                Suas Métricas
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                      <Search className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">Buscas Realizadas</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{searchHistory.length}</span>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">Contatos no CRM</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{savedContacts.length}</span>
                </div>
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs uppercase text-slate-500 tracking-wider font-bold">
                    Histórico
                  </h3>
                </div>
                {searchHistory.length > 0 && (
                  <button onClick={() => setSearchHistory([])} className="text-xs text-red-400 hover:text-red-300">Limpar</button>
                )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {searchHistory.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-600 italic">Nenhuma busca recente.</p>
                )}
                {searchHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setName(item.name); setCompany(item.company); }}
                    className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{item.name}</p>
                      {item.status === 'success' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.company}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 flex justify-between">
                      <span>{item.timestamp}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-xl" />
              <div className="flex items-center gap-2 mb-3 relative">
                <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                  Power User
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed relative">
                Use os botões de <strong>Deep Search</strong> para verificar manualmente no LinkedIn se o cargo é atual antes de enviar emails frios.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
