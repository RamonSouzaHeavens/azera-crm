import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
  Wrench,
  Shield,
  DollarSign,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useSubscription } from '../../hooks/useSubscription'
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
    { name: 'Agenda', href: '/app/agenda', icon: Calendar },
    { name: t('sidebar.products'), href: '/app/produtos', icon: Package },
    { name: 'Vendas', href: '/app/vendas', icon: DollarSign },
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
  const [activeMenu, setActiveMenu] = useState<'progress' | 'admin' | 'company' | null>(null)
  const { t } = useTranslation()
  const { groupProgresso, groupAdministracao, groupAutomacoes, groupEmpresa } = getNavGroups(t)

  // Estado das seções colapsáveis
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_sections')
      return saved ? JSON.parse(saved) : { progress: true, administration: true, automations: true, company: true }
    } catch {
      return { progress: true, administration: true, automations: true, company: true }
    }
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [section]: !prev[section] }
      localStorage.setItem('sidebar_sections', JSON.stringify(next))
      return next
    })
  }

  const location = useLocation()
  const { signOut, tenant, member, isAdmin, user } = useAuthStore()
  const { isActive } = useSubscription()
  const tenantId = useMemo(() => tenant?.id ?? member?.tenant_id ?? '', [tenant?.id, member?.tenant_id])

  // Super Admin check - só aparece em localhost E para o email admin
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
  const isSuperAdmin = isLocalhost && user?.email?.toLowerCase() === 'ramonexecut@gmail.com'

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



  // ====== NAV LIST COMPONENT ======
  const NavList = ({ collapsed }: { collapsed: boolean }) => {
    const onClick = () => setOpenMobile(false)

    // Componente Helper de Item
    const NavItem = ({ item }: { item: any }) => {
      const Icon = item.icon
      const active = location.pathname === item.href

      return (
        <motion.li
          layout
          variants={itemVariants}
          whileHover={{ scale: 1.02, x: collapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          className="mb-1"
        >
          <Link
            to={item.href}
            onClick={onClick}
            title={item.name}
            className={`flex items-center py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${collapsed ? 'justify-center px-0' : 'px-3'
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
                  transition={{ duration: 0.2 }}
                  className={`tracking-wide whitespace-nowrap relative z-10 ${active ? 'text-primary font-semibold' : 'text-text opacity-80'}`}
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.li>
      )
    }

    // Componente Helper de Seção
    const NavSection = ({ title, sectionKey, items }: { title: string, sectionKey: string, items: any[] }) => {
      if (!items || items.length === 0) return null

      const isOpen = expandedSections[sectionKey]
      const showItems = collapsed || isOpen

      return (
        <li className="mb-2">
          {!collapsed && (
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between text-[10px] tracking-wider text-text opacity-50 uppercase mb-2 pl-3 mt-4 hover:opacity-100 hover:text-primary transition-all group"
            >
              <span>{title}</span>
              {isOpen ?
                <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> :
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              }
            </button>
          )}

          <AnimatePresence initial={false}>
            {showItems && (
              <motion.ul
                initial={collapsed ? undefined : { height: 0, opacity: 0 }}
                animate={collapsed ? undefined : { height: "auto", opacity: 1 }}
                exit={collapsed ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-0.5 overflow-hidden"
              >
                {items.map(item => (
                  <NavItem key={item.name} item={item} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </li>
      )
    }

    return (
      <motion.ul
        className="space-y-1"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* GRUPO: PROGRESSO */}
        <NavSection
          title={t('sidebar.sections.progress')}
          sectionKey="progress"
          items={groupProgresso.filter(item => item.href === '/app/ferramentas-pro' ? (isInTeam || isActive) : true)}
        />

        {/* GRUPO: ADMINISTRAÇÃO */}
        {isInTeam && (
          <NavSection
            title={t('sidebar.sections.administration')}
            sectionKey="administration"
            items={groupAdministracao}
          />
        )}

        {/* Temporariamente oculto
        {canSeeAutomations && (
          <NavSection
            title={t('sidebar.sections.automations')}
            sectionKey="automations"
            items={groupAutomacoes}
          />
        )}
        */}

        {/* GRUPO: EMPRESA */}
        <NavSection
          title={t('sidebar.sections.company')}
          sectionKey="company"
          items={groupEmpresa}
        />

        {/* GRUPO: SUPER ADMIN */}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <li className="pt-4 text-[9.5px] tracking-wider text-purple-400 opacity-70 uppercase mb-3 pl-3">
                🔐 Master
              </li>
            )}
            <NavItem
              item={{
                name: 'Super Admin',
                href: '/app/super-admin',
                icon: Shield
              }}
            />
          </>
        )}
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
              className="p-2 text-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-lg outline-none focus:outline-none !ring-0 !ring-offset-0 !focus:ring-0 !focus:ring-offset-0 shadow-none focus:shadow-none"
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

      {/* ===== MOBILE DOWNBAR (< md) ===== */}
      <div className={`md:hidden ${location.pathname.includes('/conversations') && !location.pathname.endsWith('/conversations') ? 'hidden' : ''}`}>
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 z-[60] px-4 pb-safe flex items-center justify-between shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
          <MobileNavItem
            icon={TrendingUp}
            isActive={location.pathname === '/app/dashboard' || location.pathname === '/app/ferramentas-pro'}
            onClick={() => setActiveMenu(activeMenu === 'progress' ? null : 'progress')}
          />
          <MobileNavItem
            icon={Target}
            isActive={['/app/clientes', '/app/connect-channels', '/app/tarefas', '/app/agenda', '/app/produtos'].includes(location.pathname)}
            onClick={() => setActiveMenu(activeMenu === 'admin' ? null : 'admin')}
          />

          {/* Conversas e Vendas - Direct Links */}
          <Link to="/app/conversations" className="relative group flex flex-col items-center">
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${location.pathname === '/app/conversations' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <MessageCircle className="w-5 h-5" />
            </div>
          </Link>

          <Link to="/app/vendas" className="relative group flex flex-col items-center">
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${location.pathname === '/app/vendas' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </Link>

          <MobileNavItem
            icon={Building2}
            isActive={['/app/equipe-beta', '/app/subscribe', '/app/configuracoes'].includes(location.pathname)}
            onClick={() => setActiveMenu(activeMenu === 'company' ? null : 'company')}
          />
        </div>

        {/* Backdrop for submenus */}
        <AnimatePresence>
          {activeMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveMenu(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
            />
          )}
        </AnimatePresence>

        {/* Submenus */}
        <AnimatePresence>
          {activeMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-24 left-6 right-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl z-[60]"
            >
              <div className="grid grid-cols-2 gap-2">
                {activeMenu === 'progress' && (
                  <>
                    <SubmenuItem icon={LayoutDashboard} name="Dashboard" href="/app/dashboard" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={Wrench} name="Ferramentas" href="/app/ferramentas-pro" onClick={() => setActiveMenu(null)} />
                  </>
                )}
                {activeMenu === 'admin' && (
                  <>
                    <SubmenuItem icon={Target} name="Leads" href="/app/clientes" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={Plug} name="Canais" href="/app/connect-channels" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={CheckSquare} name="Tarefas" href="/app/tarefas" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={Calendar} name="Agenda" href="/app/agenda" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={Package} name="Produtos" href="/app/produtos" onClick={() => setActiveMenu(null)} />
                  </>
                )}
                {activeMenu === 'company' && (
                  <>
                    <SubmenuItem icon={Building2} name="Equipe" href="/app/equipe-beta" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={CreditCard} name="Faturamento" href="/app/subscribe" onClick={() => setActiveMenu(null)} />
                    <SubmenuItem icon={Settings} name="Configurações" href="/app/configuracoes" onClick={() => setActiveMenu(null)} />
                    {isSuperAdmin && (
                      <SubmenuItem icon={Shield} name="Master" href="/app/super-admin" onClick={() => setActiveMenu(null)} />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// Helpers for Mobile Nav
const MobileNavItem = ({ icon: Icon, isActive, onClick }: { icon: any; isActive: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="relative group flex flex-col items-center">
    <div className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      <Icon className="w-5 h-5" />
      {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
    </div>
  </button>
)

const SubmenuItem = ({ icon: Icon, name, href, onClick }: { icon: any; name: string; href: string; onClick: () => void }) => (
  <Link
    to={href}
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20 group"
  >
    <Icon className="w-6 h-6 mb-2 text-slate-500 group-hover:text-primary transition-colors" />
    <span className="text-xs font-semibold text-center">{name}</span>
  </Link>
)
