import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ptBRBase from './locales/pt-BR.json'
import enUSBase from './locales/en-US.json'
import esESBase from './locales/es-ES.json'
import deDEBase from './locales/de-DE.json'
import ptBROverrides from './partials/pt-BR.overrides.json'
import enUSOverrides from './partials/en-US.overrides.json'
import esESOverrides from './partials/es-ES.overrides.json'
import deDEOverrides from './partials/de-DE.overrides.json'

export const languages = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' }
] as const

export type LanguageCode = typeof languages[number]['code']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeTranslations(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(overrides)) {
    const overrideValue = overrides[key]
    const baseValue = result[key]

    if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
      result[key] = mergeTranslations(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      )
    } else {
      result[key] = overrideValue
    }
  }
  return result
}

const resources = {
  'pt-BR': { translation: mergeTranslations(ptBRBase, ptBROverrides) },
  'en-US': { translation: mergeTranslations(enUSBase, enUSOverrides) },
  'es-ES': { translation: mergeTranslations(esESBase, esESOverrides) },
  'de-DE': { translation: mergeTranslations(deDEBase, deDEOverrides) }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    react: {
      useSuspense: false // Desabilitar suspense para evitar problemas
    }
  })

// Debug: verificar se i18n foi inicializado
i18n.on('initialized', () => {
  console.log('🚀 [i18n] Initialized with language:', i18n.language)
  localStorage.setItem('i18nextLng', i18n.language)
})

i18n.on('languageChanged', (lng) => {
  console.log('🔄 [i18n] Language changed to:', lng)
  localStorage.setItem('i18nextLng', lng)
})

export default i18n
