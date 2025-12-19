import HeroPremium from '../components/hero/HeroPremium'
import { CheckCircle2, Zap, TrendingUp, Users, BarChart3, Clock, Shield, Smartphone, Globe, Target, Mail, User, ChevronDown, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getPricesFromStripe, convertStripePriceToReais } from '../services/stripeService'
import { STRIPE_PRICE_IDS, PLANS } from '../config/plans'
import { useTranslation } from 'react-i18next'
import profLiberalImg from '../images/profliberal.png'
import equipeImg from '../images/equipe.png'
import logoVertical from '../images/identidade visual/Azera Logo Vertical.png'

interface PriceData {
  monthly: number
  semiannual: number
  annual: number
}

export default function LandingPremium() {
  const { t } = useTranslation()
  const [prices, setPrices] = useState<PriceData>({
    monthly: PLANS.find(p => p.id === 'monthly')?.price || 40,
    semiannual: PLANS.find(p => p.id === 'semiannual')?.price || 210,
    annual: PLANS.find(p => p.id === 'annual')?.price || 360,
  })

  // Carrega preços da Stripe
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const priceIds = Object.values(STRIPE_PRICE_IDS).filter(Boolean)
        if (priceIds.length === 0) {
          console.warn('[Pricing] Nenhum price ID configurado')
          return
        }

        console.log('[Pricing] Buscando preços da Stripe...', priceIds)
        const stripePrices = await getPricesFromStripe(priceIds)

        const newPrices: PriceData = {
          monthly: PLANS.find(p => p.id === 'monthly')?.price || 40,
          semiannual: PLANS.find(p => p.id === 'semiannual')?.price || 210,
          annual: PLANS.find(p => p.id === 'annual')?.price || 360,
        }

        // Atualiza preços com dados da Stripe
        if (STRIPE_PRICE_IDS.monthly && stripePrices[STRIPE_PRICE_IDS.monthly]) {
          newPrices.monthly = convertStripePriceToReais(stripePrices[STRIPE_PRICE_IDS.monthly].unit_amount)
        }
        if (STRIPE_PRICE_IDS.semiannual && stripePrices[STRIPE_PRICE_IDS.semiannual]) {
          newPrices.semiannual = convertStripePriceToReais(stripePrices[STRIPE_PRICE_IDS.semiannual].unit_amount)
        }
        if (STRIPE_PRICE_IDS.annual && stripePrices[STRIPE_PRICE_IDS.annual]) {
          newPrices.annual = convertStripePriceToReais(stripePrices[STRIPE_PRICE_IDS.annual].unit_amount)
        }

        setPrices(newPrices)
        console.log('[Pricing] Preços carregados da Stripe:', newPrices)
      } catch (error) {
        console.error('[Pricing] Erro ao carregar preços, usando valores padrão:', error)
      }
    }

    loadPrices()
  }, [])

  // Calcula descontos
  const semiannualMonthlyPrice = Math.ceil((prices.semiannual / 6) * 100) / 100
  const semiannualDiscount = Math.round(((prices.monthly * 6 - prices.semiannual) / (prices.monthly * 6)) * 100)

  const annualMonthlyPrice = prices.annual / 12

  // Formata preços em BRL
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  // Estado para accordion FAQ
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-black to-slate-900 min-h-screen">
      <HeroPremium />

      {/* Problema/Solução - Novo Design Moderno */}
      <section id="servicos" className="w-full px-6 py-32 relative overflow-hidden">
        {/* Background Pattern Dramático */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-semibold mb-8 backdrop-blur-sm shadow-lg shadow-blue-500/10"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Zap className="w-5 h-5 animate-pulse" />
              {t('landing.hero.badge')}
            </motion.div>

            <motion.h2
              className="text-6xl md:text-8xl font-thin bg-gradient-to-r from-white via-blue-200 to-emerald-200 bg-clip-text text-transparent mb-8 leading-tight tracking-tight"
              style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('landing.hero.title.line1')}
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">
                {t('landing.hero.title.line2')}
              </span>
            </motion.h2>

            <motion.p
              className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              {t('landing.hero.subtitle')}<br />
              <span className="text-blue-400 font-semibold"> {t('landing.hero.subtitleHighlight')}</span>
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 - Redesenhado com Design Moderno */}
            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/50 rounded-3xl p-10 hover:border-blue-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-blue-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Zap className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-blue-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.features.automation.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed mb-6">
                  {t('landing.features.automation.description')}
                </p>
                <ul className="space-y-3">
                  <motion.li
                    className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
                    <span>{t('landing.features.automation.list.webhooks')}</span>
                  </motion.li>
                  <motion.li
                    className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
                    <span>{t('landing.features.automation.list.distribution')}</span>
                  </motion.li>
                  <motion.li
                    className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
                    <span>{t('landing.features.automation.list.reminders')}</span>
                  </motion.li>
                </ul>
              </div>
            </motion.div>

            {/* Card 2 - Redesenhado com Design Moderno */}
            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/50 rounded-3xl p-10 hover:border-emerald-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-emerald-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: -5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <BarChart3 className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-emerald-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.features.pipeline.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed mb-6">
                  {t('landing.features.pipeline.description')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                    <span>{t('landing.features.pipeline.list.dragDrop')}</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                    <span>{t('landing.features.pipeline.list.filters')}</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                    <span>{t('landing.features.pipeline.list.metrics')}</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Card 3 - Redesenhado com Design Moderno */}
            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/50 rounded-3xl p-10 hover:border-cyan-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-cyan-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Users className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-cyan-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.features.team.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed mb-6">
                  {t('landing.features.team.description')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                    <span>{t('landing.features.team.list.roles')}</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                    <span>{t('landing.features.team.list.dashboards')}</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                    <span>{t('landing.features.team.list.invites')}</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Casos de Uso - Design Moderno e Dramático */}
      <motion.section
        className="relative w-full px-6 py-32 overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.5, 0.2],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.1, 0.3],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-semibold mb-8 backdrop-blur-sm shadow-lg shadow-emerald-500/10"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Users className="w-5 h-5 animate-pulse" />
              {t('landing.useCases.badge')}
            </motion.div>

            <motion.h2
              className="text-6xl md:text-8xl font-thin text-white mb-8 leading-tight"
              style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('landing.useCases.title')}
            </motion.h2>

            <motion.p
              className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              {t('landing.useCases.subtitle')}
            </motion.p>
          </div>

          {/* Alternating layout: Info | Image, Image | Info */}
          <div className="space-y-16">
            {/* Row 1: Profissionais Liberais (Info) | Image */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Info Card */}
              <motion.div
                className="group relative bg-gradient-to-br from-slate-950/95 to-slate-900/95 border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl order-1 lg:order-1"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  rotateY: 5,
                  z: 50,
                  transition: { duration: 0.3 }
                }}
                style={{ perspective: "1000px" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <User className="w-8 h-8 text-emerald-400" />
                  </motion.div>

                  <h3 className="text-3xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    {t('landing.useCases.freelancer.title')}
                  </h3>

                  <p className="text-slate-300 mb-8 leading-relaxed">
                    {t('landing.useCases.freelancer.description')}
                  </p>

                  <ul className="space-y-4">
                    <motion.li
                      className="flex items-start gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-slate-300 text-base">{t('landing.useCases.freelancer.list.customFields')}</span>
                    </motion.li>
                    <motion.li
                      className="flex items-start gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                        <CheckCircle2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-slate-300 text-base">{t('landing.useCases.freelancer.list.reminders')}</span>
                    </motion.li>
                    <motion.li
                      className="flex items-start gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-slate-300 text-base">{t('landing.useCases.freelancer.list.mobile')}</span>
                    </motion.li>
                  </ul>
                </div>
              </motion.div>

              {/* Image */}
              <motion.div
                className="relative group overflow-hidden rounded-3xl shadow-2xl order-2 lg:order-2"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{
                  default: { duration: 0.8, delay: 0.2 },
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }}
                viewport={{ once: true }}
                animate={{ y: [0, -3, 0] }}
              >
                <img
                  src={profLiberalImg}
                  alt="Profissional Liberal usando Azera"
                  className="w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl p-4 z-20 text-center">
                  <p className="inline-block text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-2 py-1 rounded">{t('landing.useCases.freelancer.imageLabel')}</p>
                  <br />
                  <p className="inline-block text-slate-300 text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded mt-1">{t('landing.useCases.freelancer.imageSubLabel')}</p>
                </div>
              </motion.div>
            </div>

            {/* Row 2: Image | Equipes & Empresas (Info) */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Image */}
              <motion.div
                className="relative group overflow-hidden rounded-3xl shadow-2xl order-1 lg:order-1"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{
                  default: { duration: 0.8, delay: 0.3 },
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }
                }}
                viewport={{ once: true }}
                animate={{ y: [0, -3, 0] }}
              >
                <img
                  src={equipeImg}
                  alt="Equipe colaborando com Azera"
                  className="w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl p-4 z-20 text-center">
                  <p className="inline-block text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-2 py-1 rounded">{t('landing.useCases.teams.imageLabel')}</p>
                  <br />
                  <p className="inline-block text-slate-300 text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded mt-1">{t('landing.useCases.teams.imageSubLabel')}</p>
                </div>
              </motion.div>

              {/* Info Card */}
              <motion.div
                className="group relative bg-gradient-to-br from-slate-950/95 to-slate-900/95 border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl order-2 lg:order-2"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  rotateY: -5,
                  z: 50,
                  transition: { duration: 0.3 }
                }}
                style={{ perspective: "1000px" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Users className="w-8 h-8 text-blue-400" />
                  </motion.div>

                  <h3 className="text-3xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    {t('landing.useCases.teams.title')}
                  </h3>

                  <p className="text-slate-300 mb-8 leading-relaxed">
                    {t('landing.useCases.teams.description')}
                  </p>

                  <ul className="space-y-4">
                    <motion.li
                      className="flex items-start gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-slate-300 text-base">{t('landing.useCases.teams.list.distribution')}</span>
                    </motion.li>

                    <motion.li
                      className="flex items-start gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                        <CheckCircle2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-slate-300 text-base">{t('landing.useCases.teams.list.dashboards')}</span>
                    </motion.li>

                    <motion.li
                      className="flex items-start gap-4"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-slate-300 text-base">{t('landing.useCases.teams.list.permissions')}</span>
                    </motion.li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>


        </div>
      </motion.section>

      {/* Recursos Completos - Design Moderno e Dramático */}
      <motion.section
        className="w-full px-6 py-20 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true }}
      >
        {/* Background Effects Dramáticos */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-600/20 to-rose-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '6s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-full text-violet-300 text-sm font-semibold mb-8 backdrop-blur-sm shadow-lg shadow-violet-500/10"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Target className="w-5 h-5 animate-pulse" />
              {t('landing.fullFeatures.badge')}
            </motion.div>

            <motion.h2
              className="text-6xl md:text-8xl font-thin bg-gradient-to-r from-white via-violet-200 to-purple-200 bg-clip-text text-transparent mb-8 leading-tight tracking-tight"
              style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('landing.fullFeatures.title')}
            </motion.h2>

            <motion.p
              className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              {t('landing.fullFeatures.subtitle')}<br />
              <span className="text-violet-400 font-semibold"> {t('landing.fullFeatures.subtitleHighlight')}</span>
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 hover:border-violet-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-violet-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Target className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-violet-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.fullFeatures.customFields.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">{t('landing.fullFeatures.customFields.description')}</p>
                <div className="mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700 rounded-full"></div>
              </div>
            </motion.div>

            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 hover:border-cyan-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-cyan-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: -5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Smartphone className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-cyan-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.fullFeatures.responsive.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">{t('landing.fullFeatures.responsive.description')}</p>
                <div className="mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 rounded-full"></div>
              </div>
            </motion.div>

            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 hover:border-amber-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-amber-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-amber-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.fullFeatures.security.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">{t('landing.fullFeatures.security.description')}</p>
                <div className="mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 rounded-full"></div>
              </div>
            </motion.div>

            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 hover:border-rose-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-rose-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: -5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/25 group-hover:shadow-rose-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Clock className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-rose-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.fullFeatures.tasks.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">{t('landing.fullFeatures.tasks.description')}</p>
                <div className="mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700 rounded-full"></div>
              </div>
            </motion.div>

            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 hover:border-indigo-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-indigo-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Globe className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-indigo-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.fullFeatures.integrations.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">{t('landing.fullFeatures.integrations.description')}</p>
                <div className="mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-700 rounded-full"></div>
              </div>
            </motion.div>

            <motion.div
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 hover:border-emerald-500/50 transition-all duration-700 overflow-hidden shadow-2xl shadow-emerald-500/5"
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                rotateY: -5,
                z: 50,
                transition: { duration: 0.3 }
              }}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow duration-300"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <TrendingUp className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-thin text-white mb-4 group-hover:text-emerald-300 transition-colors duration-300" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>{t('landing.fullFeatures.reports.title')}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">{t('landing.fullFeatures.reports.description')}</p>
                <div className="mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 rounded-full"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>


      {/* Pricing */}
      <motion.section
        id="precos"
        className="w-full px-6 py-24 bg-gradient-to-b from-slate-950/30 to-black"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              className="text-6xl md:text-8xl font-thin bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent mb-8 leading-tight tracking-tight"
              style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('landing.pricing.title')}
            </motion.h2>

            <motion.p
              className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              {t('landing.pricing.subtitle')}
              <br />
              <span className="text-blue-400 font-semibold animate-pulse">
                {t('landing.pricing.subtitleHighlight')}
              </span>
            </motion.p>
          </div>

          {/* 🔥 BANNER PROMOCIONAL DE LANÇAMENTO */}
          <motion.div
            className="mb-16 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-[2px]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 animate-pulse opacity-50"></div>
              <div className="relative bg-slate-950/95 backdrop-blur-xl rounded-3xl p-8 md:p-10">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Icon animado */}
                  <motion.div
                    className="flex-shrink-0"
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/30">
                      <Zap className="w-10 h-10 text-white fill-white" />
                    </div>
                  </motion.div>

                  {/* Conteúdo */}
                  <div className="flex-1 text-center lg:text-left">
                    <motion.div
                      className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-300 text-sm font-bold mb-4"
                      animate={{ boxShadow: ["0 0 0 0 rgba(234, 179, 8, 0)", "0 0 0 8px rgba(234, 179, 8, 0)"] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      🎉 OFERTA DE LANÇAMENTO
                    </motion.div>
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                      De <span className="line-through text-slate-400">R$ 80</span> por apenas <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">R$ 50/mês</span>
                    </h3>
                    <p className="text-lg text-slate-300 max-w-2xl">
                      Aproveite o lançamento do Azera CRM e garanta <span className="text-white font-semibold">R$ 50/mês</span> em vez de R$ 80.
                      Automações ilimitadas, suporte prioritário e todos os recursos Pro.
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="flex-shrink-0">
                    <motion.a
                      href="https://wa.me/5531991318312?text=Oi%20quero%20ativar%20minha%20assinatura%20com%20a%20oferta%20de%20lan%C3%A7amento"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white font-bold text-lg rounded-xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Zap className="w-6 h-6 fill-current" />
                      Ativar Oferta - R$ 50/mês
                    </motion.a>
                    <p className="text-center text-sm text-slate-400 mt-3">Vagas limitadas • Acaba em breve</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Banner Planos Personalizados */}
          <motion.div
            className="mb-12 p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >

            <div className="relative z-10 text-center">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full text-blue-300 text-lg font-semibold mb-4"
                animate={{
                  boxShadow: [
                    "0 0 10px rgba(59, 130, 246, 0.3)",
                    "0 0 20px rgba(59, 130, 246, 0.6)",
                    "0 0 10px rgba(59, 130, 246, 0.3)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-4 h-4" />
                {t('landing.pricing.customPlans.badge')}
              </motion.div>

              <div className="max-w-4xl mx-auto border border-blue-500/20 rounded-2xl p-4 bg-black/20 backdrop-blur-sm">
                <p className="text-slate-300">
                  {t('landing.pricing.customPlans.text')}
                  <a href="#contato" className="text-blue-400 hover:text-blue-300 transition-colors ml-2 font-semibold">
                    {t('landing.pricing.customPlans.link')}
                  </a> {t('landing.pricing.customPlans.suffix')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Desktop Layout: All plans side by side */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {/* Starter - Free */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all">
              <div className="text-sm font-semibold text-slate-400 mb-2">{t('landing.pricing.starter.badge')}</div>
              <div className="text-3xl font-bold text-white mb-2">{t('landing.pricing.starter.price')}</div>
              <p className="text-slate-400 text-sm mb-4">{t('landing.pricing.starter.description')}</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Até 50 leads</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Pipeline básico</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo limitado</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> 1 usuário</li>
              </ul>
              <Link to="/login" className="block w-full py-3 px-4 border border-white/30 text-white text-center rounded-lg font-semibold transition-all hover:bg-white/10">
                {t('landing.pricing.starter.button')}
              </Link>
            </div>

            {/* Mensal */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all">
              <div className="text-sm font-semibold text-slate-400 mb-2">{t('landing.pricing.monthly.badge')}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-white">{formatPrice(prices.monthly)}</span>
                <span className="text-slate-400 text-sm">{t('landing.pricing.monthly.period')}</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Usuários ilimitados</li>
              </ul>
              <Link to="/login" className="block w-full py-3 px-4 bg-white text-black text-center rounded-lg font-semibold transition-all hover:bg-slate-200">
                {t('landing.pricing.monthly.button')}
              </Link>
            </div>

            {/* Semestral */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-emerald-500/50 transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-xs font-bold shadow-lg">
                {t('landing.pricing.semiannual.discountBadge', { percent: semiannualDiscount })}
              </div>
              <div className="text-sm font-semibold text-slate-400 mb-2">{t('landing.pricing.semiannual.badge')}</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">{formatPrice(semiannualMonthlyPrice)}</span>
                <span className="text-slate-400 text-sm">{t('landing.pricing.semiannual.period')}</span>
              </div>
              <div className="text-xs text-slate-500 mb-4">
                <span className="line-through">{formatPrice(prices.monthly * 6)}</span> → {formatPrice(prices.semiannual)}
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Usuários ilimitados</li>
              </ul>
              <Link to="/login" className="block w-full py-3 px-4 bg-emerald-500 text-white text-center rounded-lg font-semibold transition-all hover:bg-emerald-600">
                {t('landing.pricing.semiannual.button')}
              </Link>
            </div>

            {/* Anual - DESTAQUE */}
            <div className="relative p-[2px] rounded-2xl scale-[1.02] z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap z-10">
                ⭐ Melhor custo-benefício
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse rounded-2xl"></div>
              <div className="relative bg-slate-900 rounded-2xl p-6">
                <div className="text-sm font-semibold text-blue-400 mb-2">{t('landing.pricing.annual.badge')}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">{formatPrice(annualMonthlyPrice)}</span>
                  <span className="text-slate-400 text-sm">{t('landing.pricing.annual.period')}</span>
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  <span className="line-through">{formatPrice(prices.monthly * 12)}</span> → {formatPrice(prices.annual)}
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Leads ilimitados</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> WhatsApp integrado</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Automações e IA</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Catálogo completo</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Relatórios avançados</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Usuários ilimitados</li>
                </ul>
                <Link to="/login" className="block w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center rounded-lg font-semibold transition-all hover:opacity-90 shadow-lg shadow-blue-500/25">
                  {t('landing.pricing.annual.button')}
                </Link>
              </div>
            </div>

            {/* Enterprise - DESTAQUE */}
            <div className="relative p-[2px] rounded-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-0.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap z-10">
                White Label
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-50"></div>
              <div className="relative bg-slate-900 rounded-2xl p-6">
                <div className="text-sm font-semibold text-amber-400 mb-2">Enterprise</div>
                <div className="text-2xl font-bold text-white mb-4">Sob Consulta</div>
                <p className="text-slate-400 text-xs mb-4">CRM White Label personalizado para sua empresa.</p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> CRM White Label</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Estrutura personalizada</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Implementação sob medida</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Suporte dedicado</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Integrações customizadas</li>
                </ul>
                <a href="https://wa.me/5531991318312?text=Olá, tenho interesse no plano Enterprise" target="_blank" rel="noopener noreferrer" className="block w-full py-3 px-4 border border-amber-500/50 text-amber-400 text-center rounded-lg font-semibold transition-all hover:bg-amber-500/10">
                  Entrar em Contato
                </a>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-6">
            {/* Starter - Free - Full width */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-sm font-semibold text-slate-400 mb-2">{t('landing.pricing.starter.badge')}</div>
              <div className="text-3xl font-bold text-white mb-2">{t('landing.pricing.starter.price')}</div>
              <p className="text-slate-400 text-sm mb-4">{t('landing.pricing.starter.description')}</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Até 50 leads</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Pipeline básico</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo limitado</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> 1 usuário</li>
              </ul>
              <Link to="/login" className="block w-full py-3 px-4 border border-white/30 text-white text-center rounded-lg font-semibold transition-all hover:bg-white/10">
                {t('landing.pricing.starter.button')}
              </Link>
            </div>

            {/* Carousel for paid plans */}
            <div className="overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {/* Mensal */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-[280px] snap-center">
                  <div className="text-sm font-semibold text-slate-400 mb-2">{t('landing.pricing.monthly.badge')}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-white">{formatPrice(prices.monthly)}</span>
                    <span className="text-slate-400 text-sm">{t('landing.pricing.monthly.period')}</span>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Usuários ilimitados</li>
                  </ul>
                  <Link to="/login" className="block w-full py-3 px-4 bg-white text-black text-center rounded-lg font-semibold transition-all hover:bg-slate-200">
                    {t('landing.pricing.monthly.button')}
                  </Link>
                </div>

                {/* Semestral */}
                <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-6 min-w-[280px] snap-center relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                    {t('landing.pricing.semiannual.discountBadge', { percent: semiannualDiscount })}
                  </div>
                  <div className="text-sm font-semibold text-slate-400 mb-2">{t('landing.pricing.semiannual.badge')}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(semiannualMonthlyPrice)}</span>
                    <span className="text-slate-400 text-sm">{t('landing.pricing.semiannual.period')}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-4">
                    <span className="line-through">{formatPrice(prices.monthly * 6)}</span> → {formatPrice(prices.semiannual)}
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                    <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Usuários ilimitados</li>
                  </ul>
                  <Link to="/login" className="block w-full py-3 px-4 bg-emerald-500 text-white text-center rounded-lg font-semibold transition-all hover:bg-emerald-600">
                    {t('landing.pricing.semiannual.button')}
                  </Link>
                </div>

                {/* Anual - DESTAQUE */}
                <div className="relative p-[2px] rounded-2xl min-w-[280px] snap-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-0.5 rounded-full text-xs font-bold z-10">
                    ⭐ Melhor custo-benefício
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl"></div>
                  <div className="relative bg-slate-900 rounded-2xl p-6">
                    <div className="text-sm font-semibold text-blue-400 mb-2">{t('landing.pricing.annual.badge')}</div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold text-white">{formatPrice(annualMonthlyPrice)}</span>
                      <span className="text-slate-400 text-sm">{t('landing.pricing.annual.period')}</span>
                    </div>
                    <div className="text-xs text-slate-500 mb-4">
                      <span className="line-through">{formatPrice(prices.monthly * 12)}</span> → {formatPrice(prices.annual)}
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Leads ilimitados</li>
                      <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> WhatsApp integrado</li>
                      <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Automações e IA</li>
                      <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Catálogo completo</li>
                      <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Relatórios avançados</li>
                      <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-blue-400" /> Usuários ilimitados</li>
                    </ul>
                    <Link to="/login" className="block w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center rounded-lg font-semibold transition-all hover:opacity-90">
                      {t('landing.pricing.annual.button')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="flex justify-center gap-2">
              <div className="text-xs text-slate-500">← Deslize para ver mais planos →</div>
            </div>

            {/* Enterprise - Full width */}
            <div className="relative p-[2px] rounded-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-0.5 rounded-full text-xs font-bold z-10">
                White Label
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-50"></div>
              <div className="relative bg-slate-900 rounded-2xl p-6">
                <div className="text-sm font-semibold text-amber-400 mb-2">Enterprise</div>
                <div className="text-2xl font-bold text-white mb-4">Sob Consulta</div>
                <p className="text-slate-400 text-xs mb-4">CRM White Label personalizado para sua empresa.</p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> CRM White Label</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Estrutura personalizada</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Implementação sob medida</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Suporte dedicado</li>
                  <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-amber-400" /> Integrações customizadas</li>
                </ul>
                <a href="https://wa.me/5531991318312?text=Olá, tenho interesse no plano Enterprise" target="_blank" rel="noopener noreferrer" className="block w-full py-3 px-4 border border-amber-500/50 text-amber-400 text-center rounded-lg font-semibold transition-all hover:bg-amber-500/10">
                  Entrar em Contato
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <section className="w-full px-6 py-24 bg-gradient-to-b from-black to-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              {t('landing.faq.title')}
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: t('landing.faq.q1.question'),
                answer: t('landing.faq.q1.answer')
              },
              {
                question: t('landing.faq.q2.question'),
                answer: t('landing.faq.q2.answer')
              },
              {
                question: t('landing.faq.q3.question'),
                answer: t('landing.faq.q3.answer')
              },
              {
                question: t('landing.faq.q4.question'),
                answer: t('landing.faq.q4.answer')
              },
              {
                question: t('landing.faq.q5.question'),
                answer: t('landing.faq.q5.answer')
              },
              {
                question: t('landing.faq.q6.question'),
                answer: t('landing.faq.q6.answer')
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-xl font-thin text-white pr-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-6 h-6 text-cyan-400 transition-transform duration-300 ${openFAQ === index ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-slate-400 p-6 pt-0">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="relative w-full px-6 py-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/3 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1.3, 1, 1.3],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-6xl md:text-8xl font-thin text-white mb-4 leading-tight" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              {t('landing.contact.title')}
            </h2>

            <motion.p
              className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              {t('landing.contact.subtitle')}<br />
              <span className="text-emerald-400 font-semibold animate-pulse">{t('landing.contact.subtitleHighlight')}</span>
            </motion.p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <motion.div
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{
                boxShadow: "0 0 60px rgba(16, 185, 129, 0.2)",
                borderColor: "rgba(16, 185, 129, 0.3)",
                scale: 1.02
              }}
            >
              <p className="text-slate-300 mb-10 text-center text-2xl font-thin" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                {t('landing.contact.infoTitle')}
              </p>

              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <motion.div
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                    <Mail className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-slate-400 text-sm font-medium mb-2">{t('landing.contact.email')}</div>
                  <a href="mailto:coordenacaoheavens@gmail.com" className="text-white hover:text-emerald-400 transition-colors text-lg block">
                    coordenacaoheavens@gmail.com
                  </a>
                </motion.div>

                <motion.div
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
                    <Users className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="text-slate-400 text-sm font-medium mb-2">{t('landing.contact.whatsapp')}</div>
                  <a href="https://wa.me/5531991318312" className="text-white hover:text-cyan-400 transition-colors text-lg block" target="_blank" rel="noopener noreferrer">
                    +55 (31) 99131-8312
                  </a>
                </motion.div>

                <motion.div
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                    <Clock className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-slate-400 text-sm font-medium mb-2">{t('landing.contact.hours')}</div>
                  <div className="text-white text-lg">{t('landing.contact.hoursValue')}</div>
                </motion.div>
              </div>

              <div className="text-center">
                <a
                  href="https://wa.me/5531991318312"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-green-500/50 text-green-400 hover:text-white hover:bg-green-500/10 hover:border-green-500 rounded-xl transition-all duration-300 text-sm font-medium"
                >
                  <Users className="w-4 h-4" />
                  {t('landing.contact.button')}
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 mt-6 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.1, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <motion.div
              className="md:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.img
                src={logoVertical}
                alt="Azera CRM"
                className="h-16 w-auto mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
              <p className="text-slate-300 text-base leading-relaxed">
                {t('landing.footer.tagline')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="text-white font-thin mb-6 text-lg">{t('landing.footer.product')}</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <motion.a
                    href="#servicos"
                    className="hover:text-cyan-400 transition-colors duration-300 text-base"
                    whileHover={{ x: 5 }}
                  >
                    {t('landing.footer.features')}
                  </motion.a>
                </li>
                <li>
                  <motion.a
                    href="#precos"
                    className="hover:text-cyan-400 transition-colors duration-300 text-base"
                    whileHover={{ x: 5 }}
                  >
                    {t('landing.footer.pricing')}
                  </motion.a>
                </li>
                <li>
                  <motion.a
                    href="#cases"
                    className="hover:text-cyan-400 transition-colors duration-300 text-base"
                    whileHover={{ x: 5 }}
                  >
                    {t('landing.footer.cases')}
                  </motion.a>
                </li>
                <li>
                  <motion.div
                    whileHover={{ x: 5 }}
                  >
                    <Link to="/login" className="hover:text-cyan-400 transition-colors duration-300 text-base">
                      {t('landing.footer.login')}
                    </Link>
                  </motion.div>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h4 className="text-white font-thin mb-6 text-lg">{t('landing.footer.company')}</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <motion.div
                    whileHover={{ x: 5 }}
                  >
                    <Link to="/sobre-nos" className="hover:text-emerald-400 transition-colors duration-300 text-base">
                      {t('landing.footer.about')}
                    </Link>
                  </motion.div>
                </li>
                <li>
                  <motion.a
                    href="#contato"
                    className="hover:text-emerald-400 transition-colors duration-300 text-base"
                    whileHover={{ x: 5 }}
                  >
                    {t('landing.footer.contact')}
                  </motion.a>
                </li>
                <li>
                  <motion.a
                    href="#"
                    className="hover:text-emerald-400 transition-colors duration-300 text-base"
                    whileHover={{ x: 5 }}
                  >
                    {t('landing.footer.blog')}
                  </motion.a>
                </li>
                <li>
                  <motion.a
                    href="#"
                    className="hover:text-emerald-400 transition-colors duration-300 text-base"
                    whileHover={{ x: 5 }}
                  >
                    {t('landing.footer.careers')}
                  </motion.a>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h4 className="text-white font-thin mb-6 text-lg">{t('landing.footer.legal')}</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <motion.div
                    whileHover={{ x: 5 }}
                  >
                    <Link to="/politica-privacidade" className="hover:text-blue-400 transition-colors duration-300 text-base">
                      {t('landing.footer.privacy')}
                    </Link>
                  </motion.div>
                </li>
                <li>
                  <motion.div
                    whileHover={{ x: 5 }}
                  >
                    <Link to="/termos-uso" className="hover:text-blue-400 transition-colors duration-300 text-base">
                      {t('landing.footer.terms')}
                    </Link>
                  </motion.div>
                </li>
                <li>
                  <motion.div
                    whileHover={{ x: 5 }}
                  >
                    <Link to="/lgpd" className="hover:text-blue-400 transition-colors duration-300 text-base">
                      {t('landing.footer.lgpd')}
                    </Link>
                  </motion.div>
                </li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="text-slate-400 text-base">
              {t('landing.footer.rights', { year: new Date().getFullYear() })}
            </div>
            <div className="flex gap-6 text-base">
              <motion.div whileHover={{ scale: 1.05 }}>
                <Link to="/politica-privacidade" className="text-slate-400 hover:text-cyan-400 transition-colors duration-300">
                  {t('landing.footer.privacyLink')}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Link to="/termos-uso" className="text-slate-400 hover:text-cyan-400 transition-colors duration-300">
                  {t('landing.footer.termsLink')}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }}>
                <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors duration-300">
                  {t('landing.footer.cookiesLink')}
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}
