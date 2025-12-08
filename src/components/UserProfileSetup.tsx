import React, { useState } from 'react'
import { User, Camera, Phone, FileText, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface UserProfileSetupProps {
  onComplete: () => void
  isRequired?: boolean
}

export default function UserProfileSetup({ onComplete, isRequired = false }: UserProfileSetupProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    phone: '',
    bio: '',
    avatarUrl: ''
  })
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }))
      setImagePreview(publicUrl)
      toast.success(t('userProfileSetup.toasts.photoSuccess'))

    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error(t('userProfileSetup.toasts.photoError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName.trim() || !formData.displayName.trim()) {
      toast.error(t('userProfileSetup.toasts.validationError'))
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.rpc('complete_user_profile', {
        p_full_name: formData.fullName,
        p_display_name: formData.displayName,
        p_avatar_url: formData.avatarUrl || null,
        p_phone: formData.phone || null,
        p_bio: formData.bio || null
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || t('userProfileSetup.toasts.saveError'))
      }

      toast.success(t('userProfileSetup.toasts.saveSuccess'))
      onComplete()

    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error(t('userProfileSetup.toasts.saveError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('userProfileSetup.title')}</h1>
          <p className="text-slate-600 mt-2">
            {isRequired
              ? t('userProfileSetup.subtitles.required')
              : t('userProfileSetup.subtitles.optional')
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload de Foto */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-slate-500 mt-2">{t('userProfileSetup.form.photoLabel')}</p>
          </div>

          {/* Nome Completo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('userProfileSetup.form.fullName.label')}
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('userProfileSetup.form.fullName.placeholder')}
              required
            />
          </div>

          {/* Nome de Exibição */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('userProfileSetup.form.displayName.label')}
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('userProfileSetup.form.displayName.placeholder')}
              required
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              {t('userProfileSetup.form.phone.label')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('userProfileSetup.form.phone.placeholder')}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              {t('userProfileSetup.form.bio.label')}
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder={t('userProfileSetup.form.bio.placeholder')}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            {!isRequired && (
              <button
                type="button"
                onClick={onComplete}
                className="flex-1 px-6 py-3 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                {t('userProfileSetup.buttons.skip')}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {t('userProfileSetup.buttons.save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}