import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import { supabase } from './lib/supabase'

// Layout e Guards
import { Login } from './pages/Login'
import { ConfirmarEmail } from './pages/ConfirmarEmail'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Leads'
import LeadDetails from './pages/LeadDetails'
import ProdutoNovo from './pages/ProdutoNovo'
import ProdutoDetalhes from './pages/ProdutoDetalhes'
import ProdutoEditar from './pages/ProdutoEditar'
import Produtos from './pages/Produtos'
import ProdutosAdmin from './pages/ProdutosAdmin'
import Tarefas from './pages/Tarefas'
import TarefaNova from './pages/TarefaNova'
import Configuracoes from './pages/Configuracoes'
import MinhaEquipeBeta from './pages/MinhaEquipeBeta'
import JoinTeam from './pages/JoinTeam'
import ResetPassword from './pages/ResetPassword'
import EsqueciSenha from './pages/EsqueciSenha'
import OAuthCallback from './pages/OAuthCallback'
import Automacoes from './pages/Automacoes'
import WebhooksPage from './pages/Webhooks'
import Documentacao from './pages/Documentacao'
import Subscribe from './pages/Subscribe'
import Billing from './pages/Billing'
import Success from './pages/Success'
import ApiKeys from './pages/ApiKeys'
import { ProtectedLayout } from './components/layout/ProtectedLayout'
import LandingPageOficial from './pages/LandingPageOficial'
import PoliticaPrivacidade from './pages/politica-privacidade'
import TermosUso from './pages/TermosUso'
import LGPD from './pages/LGPD'
import SobreNos from './pages/SobreNos'
import Conversations from './pages/Conversations'
import ConnectChannels from './pages/ConnectChannels'
import FerramentasPro from './pages/FerramentasPro'
import Enriquecimento from './pages/ferramentas/Enriquecimento'
import PerfilIA from './pages/ferramentas/PerfilIA'
import ROI from './pages/ferramentas/ROI'
import Propostas from './pages/ferramentas/Propostas'
import Battlecards from './pages/ferramentas/Battlecards'
import ResumoReuniao from './pages/ferramentas/ResumoReuniao'
import SequenciaEmail from './pages/ferramentas/SequenciaEmail'
import Playbook from './pages/ferramentas/Playbook'
import SuperAdmin from './pages/SuperAdmin'
import Vendas from './pages/Vendas'

const queryClient = new QueryClient()


function App() {
  const { user, isAdmin } = useAuthStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    // Carregar sessão inicial ao montar o app
    const initializeApp = async () => {
      try {
        await useAuthStore.getState().loadSession();
      } catch (err) {
        console.error('Erro ao inicializar:', err);
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };

    initializeApp();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      // Apenas recarregar sessão em TOKEN_REFRESHED
      if (event === 'TOKEN_REFRESHED') {
        await useAuthStore.getState().loadSession();
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Apply theme
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Router basename="/">
          <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
            <Routes>
              <Route
                path="/login"
                element={!user && !isAdmin ? <Login /> : <Navigate to="/app/dashboard" replace />}
              />
              <Route path="/confirmar-email" element={<ConfirmarEmail />} />
              <Route path="/" element={<LandingPageOficial />} />
              <Route path="/clientes" element={<Navigate to="/app/clientes" replace />} />
              <Route path="/sobre-nos" element={<SobreNos />} />
              <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/politica-privacidade-2025" element={<PoliticaPrivacidade />} />
              <Route path="/termos-uso" element={<TermosUso />} />
              <Route path="/lgpd" element={<LGPD />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<EsqueciSenha />} />
              <Route path="/accept-invite" element={<JoinTeam />} />
              <Route path="/invite/accept" element={<JoinTeam />} />
              <Route path="/join-team" element={<JoinTeam />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route
                path="/app"
                element={user || isAdmin ? <ProtectedLayout /> : <Navigate to="/login" replace />}
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="ferramentas-pro" element={<FerramentasPro />} />
                <Route path="ferramentas-pro/enriquecimento" element={<Enriquecimento />} />
                <Route path="ferramentas-pro/perfil-ia" element={<PerfilIA />} />
                <Route path="ferramentas-pro/roi" element={<ROI />} />
                <Route path="ferramentas-pro/propostas" element={<Propostas />} />
                <Route path="ferramentas-pro/battlecards" element={<Battlecards />} />
                <Route path="ferramentas-pro/resumo-reuniao" element={<ResumoReuniao />} />
                <Route path="ferramentas-pro/sequencia-email" element={<SequenciaEmail />} />
                <Route path="ferramentas-pro/playbook" element={<Playbook />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="clientes/:leadId" element={<LeadDetails />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="produtos/novo" element={<ProdutoNovo />} />
                <Route path="produtos/editar/:id" element={<ProdutoEditar />} />
                <Route path="produtos/:id" element={<ProdutoDetalhes />} />
                <Route path="imoveis" element={<Navigate to="/app/produtos" replace />} />
                <Route path="imoveis/novo" element={<Navigate to="/app/produtos/novo" replace />} />
                <Route path="imoveis/editar/:id" element={<Navigate to="/app/produtos/editar/:id" replace />} />
                <Route path="imoveis/:id" element={<Navigate to="/app/produtos/:id" replace />} />
                <Route path="produtos-admin" element={<ProdutosAdmin />} />
                <Route path="tarefas" element={<Tarefas />} />
                <Route path="tarefa-nova" element={<TarefaNova />} />
                <Route path="configuracoes" element={<Configuracoes />} />
                {/* Rotas de equipe - todas direcionam para MinhaEquipeBeta */}
                <Route path="equipe" element={<Navigate to="/app/minha-equipe" replace />} />
                <Route path="equipe-beta" element={<Navigate to="/app/minha-equipe" replace />} />
                <Route path="minha-equipe" element={<MinhaEquipeBeta />} />

                <Route path="automacoes" element={<Automacoes />} />
                <Route path="automacoes/webhooks" element={<WebhooksPage />} />
                <Route path="documentacao" element={<Documentacao />} />
                <Route path="billing" element={<Billing />} />
                <Route path="api-keys" element={<ApiKeys />} />
                <Route path="subscribe" element={<Subscribe />} />
                <Route path="success" element={<Success />} />
                <Route path="connect-channels" element={<ConnectChannels />} />
                <Route path="conversations" element={<Conversations />} />
                <Route path="vendas" element={<Vendas />} />
                <Route path="super-admin" element={<SuperAdmin />} />
              </Route>
              <Route
                path="*"
                element={<Navigate to={user || isAdmin ? "/app/dashboard" : "/login"} replace />}
              />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: isDark ? '#374151' : '#fff',
                  color: isDark ? '#fff' : '#000',
                },
              }}
            />
          </div>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  )
}

export default App
