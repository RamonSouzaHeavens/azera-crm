import { useState, useEffect } from 'react'
import { Save, ArrowLeftRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useHeavensStore } from '../../stores/heavensStore'

export function HeavensSettings() {
    const { supabaseUrl, supabaseServiceKey, setCredentials } = useHeavensStore()
    const [url, setUrl] = useState('')
    const [key, setKey] = useState('')

    useEffect(() => {
        setUrl(supabaseUrl)
        setKey(supabaseServiceKey)
    }, [supabaseUrl, supabaseServiceKey])

    const handleSave = () => {
        setCredentials(url, key)
        toast.success('Credenciais do Heavens AI salvas!')
    }

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                    Integração Heavens AI
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Configure a API do Supabase do projeto Heavens AI para publicar tarefas automaticamente.
                    Use a chave <strong>service_role</strong> (bypassa RLS).
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium mb-1">URL do Supabase</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-50 border border-slate-200 dark:border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 placeholder-slate-400"
                        placeholder="https://xyz.supabase.co"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Service Role Key</label>
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-50 border border-slate-200 dark:border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 placeholder-slate-400"
                        placeholder="eyJhbGci..."
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!url || !key}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white shadow-lg transition-colors ${!url || !key
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 hover:scale-[1.01]'
                            }`}
                    >
                        <Save className="w-4 h-4" />
                        Salvar Configurações API
                    </button>
                </div>
            </div>
        </div>
    )
}
