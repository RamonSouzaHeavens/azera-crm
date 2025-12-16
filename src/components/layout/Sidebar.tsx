import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronLeft,
  Building2,
  CheckSquare,
  Target,
  Package,
  Menu,
  X,
  Book,
  CreditCard,
  Key,
  Zap,
  MessageCircle,
  Plug,
  Wrench
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import simboloAzera from '../../images/identidade visual/Símbolo Azera.png'

// groups com chaves de tradução
const getNavGroups = (t: (key: string) => string) => {
  const groupProgresso = [
    { name: t('sidebar.dashboard'), href: '/app/dashboard', icon: LayoutDashboard },
    { name: t('sidebar.proTools'), href: '/app/ferramentas-pro', icon: Wrench },
  ]
  const groupAdministracao = [
    { name: t('sidebar.leads'), href: '/app/clientes', icon: Target },
    { name: t('sidebar.conversations'), href: '/app/conversations', icon: MessageCircle },
    { name: t('sidebar.connectChannels'), href: '/app/connect-channels', icon: Plug },
    { name: t('sidebar.tasks'), href: '/app/tarefas', icon: CheckSquare },
    { name: t('sidebar.products'), href: '/app/produtos', icon: Package },
  ]
  // Automações: apenas owner e admin podem ver
  const groupAutomacoes = [
    { name: t('sidebar.automations'), href: '/app/automacoes', icon: Zap },
    { name: t('sidebar.apiKeys'), href: '/app/api-keys', icon: Key },
    { name: t('sidebar.documentation'), href: '/app/documentacao', icon: Book },
  ]
  const groupEmpresa = [
    { name: t('sidebar.team'), href: '/app/equipe-beta', icon: Building2 },
    { name: t('sidebar.billing'), href: '/app/subscribe', icon: CreditCard },
    { name: t('sidebar.settings'), href: '/app/configuracoes', icon: Settings },
  ]
  return { groupProgresso, groupAdministracao, groupAutomacoes, groupEmpresa }
}

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [openMobile, setOpenMobile] = useState(false)
  const { t } = useTranslation()
  const { groupProgresso, groupAdministracao, groupAutomacoes, groupEmpresa } = getNavGroups(t)

  const location = useLocation()
  const { signOut, tenant, member, isAdmin } = useAuthStore()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  // ====== company name
  useEffect(() => {
    if (!tenantId) return
    const fetchCompanyName = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single()
        if (error) throw error
        setCompanyName(data.name)
      } catch (error) {
        console.error('Error fetching company name:', error)
      }
    }
    fetchCompanyName()
  }, [tenantId])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isInTeam = member?.role && ['owner', 'admin', 'manager'].includes(member.role)

  // Vendedores não veem a seção de Automações
  const canSeeAutomations = member?.role && ['owner', 'admin'].includes(member.role)

  // ====== ANIMATION VARIANTS ======
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      x: -20,
      scale: 0.95
    },
    show: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  }

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  }

  // ====== NAV LIST COMPONENT ======
  const NavList = ({ collapsed }: { collapsed: boolean }) => {
    const onClick = () => setOpenMobile(false)

    return (
      <motion.ul
        className="space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {!collapsed && (
          <motion.li
            variants={titleVariants}
            className="text-[8.5px] tracking-wider text-text opacity-50 uppercase mb-1.5 pl-2"
          >
            {t('sidebar.sections.progress')}
          </motion.li>
        )}
        {groupProgresso.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.href
          return (
            <motion.li
              key={item.name}
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: collapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              className="mb-1"
            >
              <Link
                to={item.href}
                onClick={onClick}
                title={item.name}
                className={`flex items-center py-1.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${collapsed ? 'justify-center px-0' : 'px-2'
                  } ${active ? 'bg-primary/10 text-primary' : 'text-text hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <motion.div
                  animate={{ rotate: active ? [0, -10, 10, -10, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-text opacity-70'} ${collapsed ? '' : 'mr-2'} relative z-10`} />
                </motion.div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className={`tracking-wide whitespace-nowrap relative z-10 ${active ? 'text-primary font-semibold' : 'text-text opacity-80'}`}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.li>
          )
        })}

        {isInTeam && (
          <>
            {!collapsed && (
              <motion.li
                variants={titleVariants}
                className="pt-2.5 text-[9.5px] tracking-wider text-text opacity-50 uppercase mb-1.5 pl-2"
              >
                {t('sidebar.sections.administration')}
              </motion.li>
            )}
            {groupAdministracao.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.href
              return (
                <motion.li
                  key={item.name}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, x: collapsed ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="mb-1"
                >
                  <Link
                    to={item.href}
                    onClick={onClick}
                    title={item.name}
                    className={`flex items-center py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${collapsed ? 'justify-center px-0' : 'px-3'
                      } ${active ? 'bg-primary/10 text-primary' : 'text-text hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <motion.div
                      animate={{ rotate: active ? [0, -10, 10, -10, 0] : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-text opacity-70'} ${collapsed ? '' : 'mr-3'} relative z-10`} />
                    </motion.div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className={`tracking-wide whitespace-nowrap relative z-10 ${active ? 'text-primary font-semibold' : 'text-text opacity-80'}`}
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.li>
              )
            })}
          </>
        )}

        {/* Automações: apenas owner e admin podem ver */}
        {canSeeAutomations && (
          <>
            {!collapsed && (
              <motion.li
                variants={titleVariants}
                className="pt-4 text-[9.5px] tracking-wider text-text opacity-50 uppercase mb-3 pl-3"
              >
                {t('sidebar.sections.automations')}
              </motion.li>
            )}
            {groupAutomacoes.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.href
              return (
                <motion.li
                  key={item.name}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, x: collapsed ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="mb-1"
                >
                  <Link
                    to={item.href}
                    onClick={onClick}
                    title={item.name}
                    className={`flex items-center py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${collapsed ? 'justify-center px-0' : 'px-3'
                      } ${active ? 'bg-primary/10 text-primary' : 'text-text hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <motion.div
                      animate={{ rotate: active ? [0, -10, 10, -10, 0] : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-text opacity-70'} ${collapsed ? '' : 'mr-3'} relative z-10`} />
                    </motion.div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className={`tracking-wide whitespace-nowrap relative z-10 ${active ? 'text-primary font-semibold' : 'text-text opacity-80'}`}
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.li>
              )
            })}
          </>
        )}

        {!collapsed && (
          <motion.li
            variants={titleVariants}
            className="pt-4 text-[9.5px] tracking-wider text-text opacity-50 uppercase mb-3 pl-3"
          >
            {t('sidebar.sections.company')}
          </motion.li>
        )}
        {groupEmpresa.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.href
          return (
            <motion.li
              key={item.name}
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: collapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              className="mb-1"
            >
              <Link
                to={item.href}
                onClick={onClick}
                title={item.name}
                className={`flex items-center py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${collapsed ? 'justify-center px-0' : 'px-3'
                  } ${active ? 'bg-primary/10 text-primary' : 'text-text hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <motion.div
                  animate={{ rotate: active ? [0, -10, 10, -10, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-text opacity-70'} ${collapsed ? '' : 'mr-3'} relative z-10`} />
                </motion.div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className={`tracking-wide whitespace-nowrap relative z-10 ${active ? 'text-primary font-semibold' : 'text-text opacity-80'}`}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.li>
          )
        })}
      </motion.ul>
    )
  }

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (≥ md) ===== */}
      <motion.aside
        animate={{ width: isCollapsed ? 70 : 220 }}
        className="hidden md:flex border-r border-slate-200 dark:border-slate-800 flex-col shadow-sm rounded-r-3xl bg-surface text-text self-center"
        aria-label={t('sidebar.ariaLabel')}
      >
        {/* header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800" style={{ background: 'transparent' }}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  <img src={simboloAzera} alt="Azera" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-text leading-tight truncate max-w-[140px]">
                    {isAdmin ? t('sidebar.admin') : (companyName || tenant?.name || t('sidebar.myCompany'))}
                  </h1>
                  {!isAdmin && <p className="text-xs text-text opacity-60 mt-0.5">Azera</p>}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(v => !v)}
              className="p-2 text-text hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-0 focus:ring-offset-0"
              aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 p-2 overflow-y-auto custom-scrollbar">
          <NavList collapsed={isCollapsed} />
        </nav>

        {/* footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'} text-text hover:bg-slate-100 dark:hover:bg-slate-800`}
            title={t('auth.logout')}
          >
            <LogOut className="w-5 h-5 text-text" />
            {!isCollapsed && <span className="ml-2">{t('auth.logout')}</span>}
          </Button>
        </div>
      </motion.aside>

      {/* ===== MOBILE FAB + FLOATING MENU (< md) ===== */}
      <div className={`md:hidden ${location.pathname.includes('/conversations') ? 'hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label={t('sidebar.openMenu')}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 shadow-lg z-[60] p-0 flex items-center justify-center border border-white/10"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 flex items-center justify-center">
            <Menu className="w-6 h-6 text-white" />
          </div>
        </button>

        <AnimatePresence>
          {openMobile && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenMobile(false)}
                className="fixed inset-0 bg-black/50 z-[50]"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-24 right-6 w-64 max-h-[70vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-[60] p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t('sidebar.menu')}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenMobile(false)}
                    className="p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <NavList collapsed={false} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
