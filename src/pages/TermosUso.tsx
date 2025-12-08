import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import NavBar from '../components/ui/NavBar'
import logoVertical from '../images/identidade visual/Azera Logo Vertical.png'

export default function TermosUso() {
  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <div className="bg-black min-h-screen">
      <NavBar />

      {/* Content */}
      <motion.main
        className="max-w-4xl mx-auto px-6 py-24 pt-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12">
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-thin text-white mb-8"
            style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Termos de Uso
          </motion.h1>

          <motion.div
            className="prose prose-lg prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-slate-300 mb-6">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                1. Aceitação dos Termos
              </h2>
              <p className="text-slate-400 mb-4">
                Ao acessar e usar o Azera CRM ("Serviço"), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com estes termos, não use nosso serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                2. Descrição do Serviço
              </h2>
              <p className="text-slate-400 mb-4">
                O Azera CRM é uma plataforma de gerenciamento de relacionamento com clientes (CRM) projetada para profissionais liberais, imobiliárias e equipes. Oferecemos ferramentas para gestão de leads, produtos, tarefas e equipes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                3. Elegibilidade
              </h2>
              <p className="text-slate-400 mb-4">
                Para usar nosso serviço, você deve ter pelo menos 18 anos de idade e ter capacidade legal para celebrar contratos. Organizações podem nomear representantes autorizados para usar o serviço em seu nome.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                4. Conta e Segurança
              </h2>
              <h3 className="text-xl font-thin text-slate-300 mb-3">4.1 Criação de Conta</h3>
              <p className="text-slate-400 mb-4">
                Você é responsável por manter a confidencialidade de suas credenciais de login e por todas as atividades que ocorrem em sua conta.
              </p>

              <h3 className="text-xl font-thin text-slate-300 mb-3">4.2 Segurança</h3>
              <p className="text-slate-400 mb-4">
                Você deve notificar imediatamente qualquer uso não autorizado de sua conta ou qualquer outra violação de segurança.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                5. Uso Aceitável
              </h2>
              <p className="text-slate-400 mb-4">
                Você concorda em usar o serviço apenas para fins legais e de acordo com estes termos. É proibido:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>Violar leis ou regulamentos aplicáveis</li>
                <li>Infringir direitos de propriedade intelectual</li>
                <li>Transmitir malware ou código prejudicial</li>
                <li>Tentar acessar sistemas não autorizados</li>
                <li>Usar o serviço para spam ou atividades fraudulentas</li>
                <li>Compartilhar sua conta com terceiros</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                6. Propriedade Intelectual
              </h2>
              <p className="text-slate-400 mb-4">
                O Azera CRM e seu conteúdo original, recursos e funcionalidades são propriedade exclusiva da Azera CRM e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                7. Dados do Usuário
              </h2>
              <h3 className="text-xl font-thin text-slate-300 mb-3">7.1 Propriedade dos Dados</h3>
              <p className="text-slate-400 mb-4">
                Você mantém a propriedade de todos os dados que carrega ou cria usando nosso serviço.
              </p>

              <h3 className="text-xl font-thin text-slate-300 mb-3">7.2 Licença de Uso</h3>
              <p className="text-slate-400 mb-4">
                Ao usar nosso serviço, você nos concede uma licença limitada para processar, armazenar e transmitir seus dados conforme necessário para fornecer o serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                8. Privacidade
              </h2>
              <p className="text-slate-400 mb-4">
                Sua privacidade é importante para nós. Nossa Política de Privacidade explica como coletamos, usamos e protegemos suas informações pessoais.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                9. Preços e Pagamento
              </h2>
              <p className="text-slate-400 mb-4">
                Alguns aspectos do serviço podem exigir pagamento. Você concorda em pagar todas as taxas aplicáveis. Os preços estão sujeitos a alterações com aviso prévio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                10. Rescisão
              </h2>
              <p className="text-slate-400 mb-4">
                Podemos rescindir ou suspender seu acesso ao serviço imediatamente, sem aviso prévio, por violação destes termos. Você pode cancelar sua conta a qualquer momento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                11. Isenção de Garantias
              </h2>
              <p className="text-slate-400 mb-4">
                O serviço é fornecido "como está" sem garantias de qualquer tipo. Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                12. Limitação de Responsabilidade
              </h2>
              <p className="text-slate-400 mb-4">
                Em nenhum caso seremos responsáveis por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso do serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                13. Indenização
              </h2>
              <p className="text-slate-400 mb-4">
                Você concorda em indenizar e isentar a Azera CRM de qualquer reclamação decorrente de sua violação destes termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                14. Lei Aplicável
              </h2>
              <p className="text-slate-400 mb-4">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos tribunais competentes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                15. Alterações aos Termos
              </h2>
              <p className="text-slate-400 mb-4">
                Podemos modificar estes termos a qualquer momento. Continuar usando o serviço após alterações constitui aceitação dos novos termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                16. Contato
              </h2>
              <p className="text-slate-400 mb-4">
                Para dúvidas sobre estes termos, entre em contato:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>E-mail: legal@azeracrm.com</li>
                <li>Endereço: [Seu endereço]</li>
              </ul>
            </section>
          </motion.div>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img
                src={logoVertical}
                alt="Azera CRM"
                className="h-12 w-auto mb-4"
              />
              <p className="text-slate-400 text-sm">
                O CRM que transforma equipes em máquinas de resultados.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#servicos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#cases" className="hover:text-white transition-colors">Cases</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#equipe" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/politica-privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/termos-uso" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/lgpd" className="hover:text-white transition-colors">LGPD</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Azera CRM. Todos os direitos reservados.
            </div>
            <div className="flex gap-4 text-sm">
              <Link to="/politica-privacidade" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
              <Link to="/termos-uso" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}