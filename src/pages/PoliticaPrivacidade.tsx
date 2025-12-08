import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, Lock, Eye, FileText, UserCheck, Trash2, Mail } from 'lucide-react'
import NavBar from '../components/ui/NavBar'
import logoVertical from '../images/identidade visual/Azera Logo Vertical.png'

export default function PoliticaPrivacidade() {
  const handleGoBack = () => {
    window.history.back()
  }

  useEffect(() => {
    document.title = 'Política de Privacidade | Azera CRM'
  }, [])

  return (
    <div className="bg-black min-h-screen font-sans text-slate-300 selection:bg-emerald-500/30">
      <NavBar />

      {/* Content */}
      <motion.main
        className="max-w-4xl mx-auto px-6 py-24 pt-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
          </motion.div>

          <header className="mb-12 border-b border-white/10 pb-8">
            <motion.h1
              className="text-4xl md:text-5xl font-thin text-white mb-4"
              style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Política de Privacidade
            </motion.h1>
            <p className="text-slate-400">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </header>

          <motion.div
            className="prose prose-lg prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 mb-10">
              <h3 className="text-emerald-400 text-lg font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Compromisso com a Privacidade
              </h3>
              <p className="text-emerald-100/80 text-sm m-0">
                A Azera CRM respeita sua privacidade e está comprometida em proteger suas informações pessoais. Esta política descreve claramente como coletamos, usamos e protegemos seus dados, em conformidade com a LGPD (Brasil) e os requisitos da Meta (Facebook/Instagram).
              </p>
            </div>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-white mb-4 flex items-center gap-3">
                <span className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span>
                Introdução
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Esta Política de Privacidade aplica-se ao uso do software Azera CRM e todos os serviços associados. Ao utilizar nossos serviços, você concorda com a coleta e uso de informações de acordo com esta política.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-white mb-4 flex items-center gap-3">
                <span className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span>
                Dados Coletados e Fontes
              </h2>

              <h3 className="text-xl text-white mt-6 mb-3">2.1 Dados Fornecidos por Você</h3>
              <ul className="list-none space-y-2 pl-0 text-slate-400">
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5" /> Informações de conta (Nome, E-mail, Telefone, Senha).</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5" /> Dados da empresa (Nome, CNPJ, Endereço).</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5" /> Informações de pagamento (processadas de forma segura por terceiros como Stripe).</li>
              </ul>

              <h3 className="text-xl text-white mt-6 mb-3 flex items-center gap-2">
                <span className="text-[#1877F2]"><FileText className="w-5 h-5" /></span>
                2.2 Dados do Facebook e Instagram (Meta)
              </h3>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <p className="text-slate-300 mb-4">
                  Para fornecer funcionalidades de integração, solicitamos permissões específicas da Meta. Veja exatamente como usamos cada dado:
                </p>
                <ul className="space-y-4">
                  <li className="border-l-2 border-[#1877F2] pl-4">
                    <strong className="text-white block mb-1">pages_show_list & pages_read_engagement</strong>
                    <span className="text-sm text-slate-400">Usado para listar suas Páginas do Facebook e permitir que você selecione qual conectar ao CRM para receber mensagens e comentários.</span>
                  </li>
                  <li className="border-l-2 border-[#E4405F] pl-4">
                    <strong className="text-white block mb-1">instagram_basic & instagram_manage_messages</strong>
                    <span className="text-sm text-slate-400">Usado exclusivamente para exibir suas DMs do Instagram dentro do módulo "Conversations" do CRM e permitir que você responda seus clientes diretamente pela nossa plataforma.</span>
                  </li>
                  <li className="border-l-2 border-emerald-500 pl-4">
                    <strong className="text-white block mb-1">leads_retrieval</strong>
                    <span className="text-sm text-slate-400">
                      Usado <strong>estritamente</strong> para sincronizar leads gerados através dos seus formulários do Facebook Lead Ads (Anúncios de Cadastro) diretamente para sua base de contatos no Azera CRM. Não usamos este dado para nenhum outro fim.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-white mb-4 flex items-center gap-3">
                <span className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span>
                Uso e Compartilhamento de Dados
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-5 rounded-xl">
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-500" /> Não Vendemos Seus Dados</h4>
                  <p className="text-sm text-slate-400">
                    A Azera CRM <strong>não vende, aluga ou comercializa</strong> suas informações pessoais ou os dados dos seus leads para terceiros, anunciantes ou data brokers.
                  </p>
                </div>
                <div className="bg-white/5 p-5 rounded-xl">
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-500" /> Compartilhamento Limitado</h4>
                  <p className="text-sm text-slate-400">
                    Compartilhamos dados apenas com provedores de infraestrutura essenciais (ex: AWS, Supabase, Stripe) sob estritos acordos de confidencialidade para operar o serviço.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-white mb-4 flex items-center gap-3">
                <span className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-sm">4</span>
                Retenção e Exclusão de Dados
              </h2>
              <p className="text-slate-400 mb-4">
                Mantemos seus dados apenas enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços.
              </p>
              <h3 className="text-xl text-white mb-3">Como revogar acesso ou excluir dados:</h3>
              <ul className="list-none space-y-3 pl-0 text-slate-400">
                <li className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <strong className="text-white block">Exclusão da Conta Azera</strong>
                    Você pode solicitar a exclusão completa da sua conta e todos os dados associados enviando um e-mail para nosso DPO ou através do painel de configurações.
                  </div>
                </li>
                <li className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                  <UserCheck className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <strong className="text-white block">Revogar Acesso Meta (Facebook/Instagram)</strong>
                    Você pode remover a permissão de acesso do Azera CRM a qualquer momento acessando as <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Configurações de Integrações Comerciais do Facebook</a>. Ao fazer isso, deixaremos de receber novos dados imediatamente.
                  </div>
                </li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-white mb-4 flex items-center gap-3">
                <span className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-sm">5</span>
                Contato e Encarregado de Dados (DPO)
              </h2>
              <p className="text-slate-400 mb-6">
                Para exercer seus direitos de titular (acesso, correção, exclusão) ou tirar dúvidas sobre esta política, entre em contato com nosso Encarregado de Proteção de Dados:
              </p>

              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-slate-700 p-4 rounded-full">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-white text-lg font-semibold">Lucas M. (DPO)</h3>
                  <p className="text-slate-400 text-sm mb-2">Encarregado de Proteção de Dados</p>
                  <a href="mailto:privacidade@azeracrm.com" className="text-emerald-400 hover:text-emerald-300 font-medium text-lg transition-colors">
                    privacidade@azeracrm.com
                  </a>
                  <p className="text-slate-500 text-xs mt-2">
                    Azera Tecnologia Ltda.<br />
                    Ouro Preto, MG - Brasil
                  </p>
                </div>
              </div>
            </section>

          </motion.div>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img
                src={logoVertical}
                alt="Azera CRM"
                className="h-12 w-auto mb-4 opacity-80"
              />
              <p className="text-slate-500 text-sm">
                Transformando relacionamentos em resultados.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><Link to="/politica-privacidade" className="hover:text-emerald-400 transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/termos-uso" className="hover:text-emerald-400 transition-colors">Termos de Uso</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 text-center md:text-left text-slate-600 text-sm">
            © {new Date().getFullYear()} Azera CRM. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
