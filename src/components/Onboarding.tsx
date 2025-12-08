import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Users, UserPlus, Settings, Building2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface OnboardingProps {
  onClose: () => void
}

export const Onboarding = ({ onClose }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { t } = useTranslation()

  const slides = [
    {
      icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
      title: t('onboarding.slide1.title'),
      description: t('onboarding.slide1.description'),
      gradient: 'from-cyan-500/20 to-blue-500/20'
    },
    {
      icon: <Users className="w-12 h-12 text-emerald-400" />,
      title: t('onboarding.slide2.title'),
      description: t('onboarding.slide2.description'),
      gradient: 'from-emerald-500/20 to-green-500/20'
    },
    {
      icon: <Building2 className="w-12 h-12 text-purple-400" />,
      title: t('onboarding.slide3.title'),
      description: t('onboarding.slide3.description'),
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      icon: <UserPlus className="w-12 h-12 text-orange-400" />,
      title: t('onboarding.slide4.title'),
      description: t('onboarding.slide4.description'),
      gradient: 'from-orange-500/20 to-red-500/20'
    },
    {
      icon: <Settings className="w-12 h-12 text-blue-400" />,
      title: t('onboarding.slide5.title'),
      description: t('onboarding.slide5.description'),
      gradient: 'from-blue-500/20 to-indigo-500/20'
    }
  ]

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const slide = slides[currentSlide]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            aria-label={t('onboarding.closeTooltip')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${slide.gradient} border border-white/10 flex items-center justify-center`}>
              {slide.icon}
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-white">
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-slate-300 leading-relaxed max-w-lg mx-auto">
              {slide.description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 pt-4">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${index === currentSlide
                      ? 'w-8 bg-cyan-400'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                  aria-label={t('onboarding.slideNavigation', { slideNumber: index + 1 })}
                />
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${currentSlide === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                }`}
            >
              <ChevronLeft className="w-4 h-4" />
              {t('onboarding.previous')}
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold transition-all shadow-lg hover:shadow-cyan-500/25"
            >
              {currentSlide === slides.length - 1 ? t('onboarding.start') : t('onboarding.next')}
              {currentSlide === slides.length - 1 ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Skip option */}
          {currentSlide < slides.length - 1 && (
            <div className="text-center mt-4">
              <button
                onClick={onClose}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('onboarding.skip')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}