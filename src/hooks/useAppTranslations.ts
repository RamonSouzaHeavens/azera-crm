import { useTranslation } from 'react-i18next'

export const useAppTranslations = () => {
  const { t } = useTranslation()

  // Retorna um objeto com TODAS as funções t() necessárias
  // Assim os componentes podem fazer: const { sidebarDashboard, leadTitle, etc } = useAppTranslations()
  return {
    t, // a função de tradução completa para uso avançado

    // Sidebar navigation
    sidebarDashboard: t('sidebar.dashboard'),
    sidebarLeads: t('sidebar.leads'),
    sidebarConversations: t('sidebar.conversations'),
    sidebarConnectChannels: t('sidebar.connectChannels'),
    sidebarTasks: t('sidebar.tasks'),
    sidebarProducts: t('sidebar.products'),
    sidebarAutomations: t('sidebar.automations'),
    sidebarApiKeys: t('sidebar.apiKeys'),
    sidebarDocumentation: t('sidebar.documentation'),
    sidebarTeam: t('sidebar.team'),
    sidebarBilling: t('sidebar.billing'),
    sidebarSettings: t('sidebar.settings'),

    // Common
    commonSave: t('common.save'),
    commonCancel: t('common.cancel'),
    commonDelete: t('common.delete'),
    commonEdit: t('common.edit'),
    commonClose: t('common.close'),
    commonLoading: t('common.loading'),
    commonAdd: t('common.add'),
    commonSearch: t('common.search'),
    commonFilter: t('common.filter'),

    // Auth
    authLogin: t('auth.login'),
    authLogout: t('auth.logout'),
    authEmail: t('auth.email'),
    authPassword: t('auth.password'),

    // Dashboard
    dashboardPipelineTitle: t('dashboard.pipeline.title'),
    dashboardTasksTitle: t('dashboard.tasks.title'),
    dashboardTasksEmpty: t('dashboard.tasks.empty'),
    dashboardMetricsMonthly: t('dashboard.metrics.monthlyRevenue'),
    dashboardMetricsExpected: t('dashboard.metrics.expectedRevenue'),

    // Leads
    leadsTitle: t('leads.title'),
    leadsNew: t('leads.newLead'),
    leadsEdit: t('leads.editLead'),
    leadsDelete: t('leads.deleteLead'),
    leadsDetails: t('leads.leadDetails'),
    leadsPipeline: t('leads.pipeline'),

    // Tasks
    tasksTitle: t('tasks.title'),
    tasksNew: t('tasks.newTask'),
    tasksEdit: t('tasks.editTask'),
    tasksDelete: t('tasks.deleteTask'),
    tasksPending: t('tasks.pending'),
    tasksInProgress: t('tasks.inProgress'),
    tasksCompleted: t('tasks.completed'),

    // Products
    productsTitle: t('products.title'),
    productsNew: t('products.newProduct.title'),
    productsEdit: t('products.editProduct'),
    productsDelete: t('products.deleteProduct'),

    // Team
    teamTitle: t('team.title'),
    teamMembers: t('team.members'),
    teamInvite: t('team.inviteMember'),

    // Settings
    settingsTitle: t('settings.title'),
    settingsLanguage: t('settings.language'),
    settingsTheme: t('settings.theme'),

    // Errors
    errorGeneric: t('errors.generic'),
  }
}

