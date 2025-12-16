import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Key, Copy, Trash2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

interface ApiKey {
  id: string
  name: string
  permissions: string[]
  is_active: boolean
  created_at: string
  last_used_at: string | null
  expires_at: string | null
}

export default function ApiKeys() {
  const { tenant, member } = useAuthStore()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [novaChave, setNovaChave] = useState({
    name: '',
    permissions: [] as string[],
    expires_at: '',
    isUniversal: false
  })
  const [chaveGerada, setChaveGerada] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)

  const { t } = useTranslation()
  const { isDark } = useThemeStore()

  // Verificar se possui acesso (apenas proprietários)
  const possuiAcesso = useMemo(() => {
    if (!member) return false
    return member.role === 'owner'
  }, [member])

  // Se não tiver acesso, mostrar aviso
  if (!possuiAcesso) {
    return (
      <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold font-outfit text-white">
            {t('apiKeys.accessRestricted')}
          </h1>
          <p className="text-slate-400 mb-6">
            {t('apiKeys.accessRestrictedDesc')}
          </p>
          <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              {t('apiKeys.contactOwner')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Carregar chaves API
  useEffect(() => {
    if (!tenant?.id) return

    const carregarChaves = async () => {
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setApiKeys(data || [])
      } catch (err) {
        const erro = err instanceof Error ? err.message : t('apiKeys.loadError')
        toast.error(erro)
      } finally {
        setLoading(false)
      }
    }

    carregarChaves()
  }, [tenant?.id, t])

  // Criar nova chave API
  const criarChave = async () => {
    if (!tenant?.id) {
      if (!novaChave.name.trim()) return toast.error(t('apiKeys.nameRequired'))
      return
    }

    try {
      // Gerar chave aleatória no cliente (24 bytes = 32 caracteres base64url)
      const randomBytes = new Uint8Array(24)
      crypto.getRandomValues(randomBytes)
      // Converte cada byte para caractere sem usar spread (evita stack overflow e problemas com bytes >127)
      let byteChars = ''
      for (let i = 0; i < randomBytes.length; i++) {
        byteChars += String.fromCharCode(randomBytes[i])
      }
      const chaveRaw = btoa(byteChars)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      // Calcular hash da chave
      const encoder = new TextEncoder()
      const data = encoder.encode(chaveRaw)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')



      // Inserir no banco
      const { error: insertError } = await supabase.from('api_keys').insert({
        tenant_id: tenant.id,
        name: novaChave.name.trim(),
        key_hash: keyHash,
        permissions: novaChave.permissions,
        expires_at: novaChave.expires_at || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })

      if (insertError) throw insertError

      // Recarregar lista
      const { data: novasChaves } = await supabase
        .from('api_keys')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })

      setApiKeys(novasChaves || [])

      // Mostrar chave gerada (apenas uma vez)
      setChaveGerada(chaveRaw)
      setModalAberto(false)
      setNovaChave({ name: '', permissions: [], expires_at: '', isUniversal: false })

      toast.success(t('apiKeys.created'))
    } catch (err) {
      const erro = err instanceof Error ? err.message : t('apiKeys.createError')
      toast.error(erro)
    }
  }

  // Deletar chave permanentemente
  const deletarChave = async (id: string) => {
    setKeyToDelete(id)
    setDeleteModalOpen(true)
  }

  const confirmarDelete = async () => {
    if (!keyToDelete) return

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyToDelete)

      if (error) throw error

      setApiKeys(prev => prev.filter(k => k.id !== keyToDelete))
      toast.success(t('apiKeys.deleted'))
      setDeleteModalOpen(false)
      setKeyToDelete(null)
    } catch (err) {
      const erro = err instanceof Error ? err.message : t('apiKeys.deleteError')
      toast.error(erro)
    }
  }

  // Copiar chave para clipboard
  const copiarChave = (chave: string) => {
    navigator.clipboard.writeText(chave)
    toast.success(t('apiKeys.copied'))
  }

  // Permissões disponíveis
  const permissoesDisponiveis = [
    'leads.read', 'leads.write',
    'products.read', 'products.write',
    'tasks.read', 'tasks.write',
    'sales.read', 'sales.write'
  ]

  // Função para alternar universal
  const toggleUniversal = (universal: boolean) => {
    if (universal) {
      setNovaChave(prev => ({
        ...prev,
        permissions: permissoesDisponiveis,
        isUniversal: true
      }))
    } else {
      setNovaChave(prev => ({
        ...prev,
        permissions: [],
        isUniversal: false
      }))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="text-slate-900 dark:text-slate-200 flex flex-col min-h-full relative overflow-hidden">
      {/* HUD glow grid background + overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/10 blur-3xl" />
        {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:120px_120px]" /> */}
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-6 relative z-10">
        {/* HUD glow grid background + overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.06),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.06),transparent_45%)]" />

        {/* Header */}
        <div className="mb-8 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Key className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-bold font-outfit text-slate-900 dark:text-white">{t('apiKeys.title')}</h1>
                <p className="text-base mt-1 text-slate-600 dark:text-slate-400">{t('apiKeys.subtitle')}</p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => setModalAberto(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('apiKeys.newKey')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Alerta de segurança */}
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/30 mb-6 p-4">
            <div className="flex gap-3">
              <Key className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`font-semibold mb-2 ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>{t('apiKeys.securityWarning')}</p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                  <li>{t('apiKeys.securityTip1')}</li>
                  <li>{t('apiKeys.securityTip2')}</li>
                  <li>{t('apiKeys.securityTip3')}</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Lista de chaves */}
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <Card className="text-center py-12">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('apiKeys.emptyTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('apiKeys.emptyDescription')}
                </p>
                <Button onClick={() => setModalAberto(true)}>
                  {t('apiKeys.createFirst')}
                </Button>
              </Card>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {key.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${key.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {key.is_active ? t('apiKeys.active') : t('apiKeys.revoked')}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{t('apiKeys.createdLabel', { date: new Date(key.created_at).toLocaleDateString('pt-BR') })}</span>
                        {key.last_used_at && (
                          <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{t('apiKeys.lastUsedLabel', { date: new Date(key.last_used_at).toLocaleDateString('pt-BR') })}</span>
                        )}
                        {key.expires_at && (
                          <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{t('apiKeys.expiresLabel', { date: new Date(key.expires_at).toLocaleDateString('pt-BR') })}</span>
                        )}
                      </div>

                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('apiKeys.permissionsLabel')}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => deletarChave(key.id)}
                        className="text-red-600 hover:text-red-700"
                        title={t('apiKeys.deleteTooltip')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Modal de confirmação de deleção */}
          <Modal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false)
              setKeyToDelete(null)
            }}
            title={t('apiKeys.deleteModalTitle')}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('apiKeys.title')}</h1>
                  <p className="text-sm text-red-500 font-medium mt-1">{t('apiKeys.deleteModalSubtitle')}</p>
                </div>
              </div>

              <p className="text-slate-300 mb-6">
                {t('apiKeys.deleteModalBody')}
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setKeyToDelete(null)
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmarDelete}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {t('apiKeys.deletePermanent')}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal para criar chave */}
          <Modal
            isOpen={modalAberto}
            onClose={() => setModalAberto(false)}
            title={t('apiKeys.createModalTitle')}
          >
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('apiKeys.keyNameLabel')}
                </label>
                <Input
                  value={novaChave.name}
                  onChange={(e) => setNovaChave(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('apiKeys.keyNamePlaceholder')}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('apiKeys.permissionsTitle')}
                </label>

                {/* Opção Universal */}
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novaChave.isUniversal}
                      onChange={(e) => toggleUniversal(e.target.checked)}
                      className="rounded border-gray-300 w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className={`text-xs font-medium mb-2 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        🔑 Universal - Acesso Completo
                      </span>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('apiKeys.universalDesc')}</p>
                    </div>
                  </label>
                </div>

                {/* Permissões individuais (mostrar apenas se não universal) */}
                {!novaChave.isUniversal && (
                  <div className="grid grid-cols-2 gap-2">
                    {permissoesDisponiveis.map((perm) => (
                      <label key={perm} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={novaChave.permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNovaChave(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, perm]
                              }))
                            } else {
                              setNovaChave(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== perm)
                              }))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{perm}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Mostrar permissões selecionadas se universal */}
                {novaChave.isUniversal && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {permissoesDisponiveis.map((perm) => (
                      <span key={perm} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                        ✓ {perm}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('apiKeys.expirationLabel')}
                </label>
                <Input
                  type="datetime-local"
                  value={novaChave.expires_at}
                  onChange={(e) => setNovaChave(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setModalAberto(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={criarChave}>
                  {t('apiKeys.newKey')}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal para mostrar chave gerada */}
          {chaveGerada && (
            <Modal
              isOpen={!!chaveGerada}
              onClose={() => setChaveGerada(null)}
              title={t('apiKeys.createdModalTitle')}
            >
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    {t('apiKeys.copyWarning')}
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border rounded font-mono text-sm">
                    <code className="flex-1 break-all">{chaveGerada}</code>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => chaveGerada && copiarChave(chaveGerada)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('apiKeys.authHeaderInfo')}</p>
                  <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    Authorization: Bearer {chaveGerada}
                  </code>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setChaveGerada(null)}>
                    {t('apiKeys.understood')}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>

      </div>
    </div>
  )
}
