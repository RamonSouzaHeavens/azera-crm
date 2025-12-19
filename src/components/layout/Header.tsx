import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, User, Settings, ChevronDown, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { SubscriptionStatus } from '../SubscriptionStatus'
import { useSubscription } from '../../hooks/useSubscription'
import { languages } from '../../i18n'

// Validador de URL
const isValidAvatarUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('blob:') || !url.startsWith('http')) return false
  return true
}

// Avatar Component
const Avatar = ({
  avatarUrl,
  size = 'md',
  showOnline = true
}: {
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  showOnline?: boolean
}) => {
  const sizeClasses = { sm: 'w-9 h-9', md: 'w-10 h-10', lg: 'w-12 h-12' }
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }
  const dotSizes = { sm: 'w-2 h-2 ring-1', md: 'w-2.5 h-2.5 ring-2', lg: 'w-3 h-3 ring-2' }

  return (
    <div className="relative">
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm overflow-hidden transition-transform hover:scale-105`}>
        {isValidAvatarUrl(avatarUrl) ? (
          <img
            key={avatarUrl}
            src={`${avatarUrl}?t=${Date.now()}`}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={() => console.warn('❌ Erro ao carregar avatar:', avatarUrl)}
          />
        ) : (
          <User className={`${iconSizes[size]} text-white`} />
        )}
      </div>
      {showOnline && (
        <span className={`absolute right-0 bottom-0 block ${dotSizes[size]} rounded-full ring-white bg-emerald-400`} />
      )}
    </div>
  )
}

// Language Selector
const LanguageSelector = ({ isDark }: { isDark: boolean }) => {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        (buttonRef.current && buttonRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    setIsOpen(false)
  }

  const handleButtonClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 140
      })
    }
    setIsOpen(!isOpen)
  }

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all hover:scale-105 ${isDark
            ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          aria-label={t('header.selectLanguage')}
        >
          <span className="text-lg">{currentLang.flag}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[99999] py-1 rounded-xl shadow-xl border min-w-[140px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer ${lang.code === i18n.language
                ? isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-700'
                : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

export const Header = ({ onShowTutorial }: { onShowTutorial?: () => void }) => {
  const { isDark, toggleTheme } = useThemeStore()
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const member = useAuthStore((state) => state.member)
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const { subscription, isActive } = useSubscription()
  const { t } = useTranslation()

  const isRealSubscription = subscription?.stripe_subscription_id?.startsWith('sub_') ?? false

  const daysRemaining = (isRealSubscription && subscription?.current_period_end)
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const userName = isAdmin
    ? t('header.roles.admin')
    : (profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('header.defaultUser'))

  const userRole = isAdmin
    ? t('header.roles.system')
    : (member?.role === 'owner' ? t('header.roles.owner') : t('header.roles.seller'))

  return (
    <header className="backdrop-blur-sm px-4 md:px-8 py-4 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isRealSubscription && (
            <div className="flex items-center gap-2">
              <SubscriptionStatus />

              {isActive && daysRemaining !== null && (
                <div className={`hidden lg:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${daysRemaining <= 7
                  ? isDark
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                  : isDark
                    ? 'bg-slate-700/50 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                  <span className="opacity-60">{t('header.renewsIn')}</span>
                  <span className="font-semibold">{daysRemaining}d</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {isRealSubscription && isActive && (
            <Link to="/billing">
              <Button
                variant="ghost"
                size="sm"
                className={`hidden md:flex items-center gap-2 transition-all ${isDark
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-medium">{t('header.manage')}</span>
              </Button>
            </Link>
          )}

          {/* Tutorial Button */}
          {onShowTutorial && (
            <button
              onClick={onShowTutorial}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all hover:scale-105 ${isDark
                ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                }`}
              aria-label="Tutorial"
            >
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium hidden lg:inline">Tutorial</span>
            </button>
          )}

          {/* Dark/Light Mode Button - Same size as Language Selector */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all hover:scale-105 ${isDark
              ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            aria-label={isDark ? t('header.activateLightTheme') : t('header.activateDarkTheme')}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <LanguageSelector isDark={isDark} />

          <Link
            to="/configuracoes"
            className={`flex items-center gap-3 pl-3 ml-1 border-l transition-colors ${isDark ? 'border-slate-700' : 'border-slate-200'
              }`}
          >
            <Avatar avatarUrl={profile?.avatar_url} size="md" />

            <div className="hidden md:block text-sm">
              <p className={`font-semibold truncate max-w-[150px] ${isDark ? 'text-white' : 'text-slate-900'
                }`}>
                {userName}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                {userRole}
              </p>
            </div>
          </Link>
        </div>

        <Link to="/configuracoes" className="sm:hidden">
          <Avatar avatarUrl={profile?.avatar_url} size="lg" />
        </Link>
      </div>
    </header>
  )
}
