import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import NavBar from '../components/ui/NavBar'
import logoVertical from '../images/identidade visual/Azera Logo Vertical.png'

export default function LGPD() {
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
            Lei Geral de Proteção de Dados (LGPD)
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
                1. Introdução
              </h2>
              <p className="text-slate-400 mb-4">
                A Azera CRM está em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD). Este documento explica como tratamos seus dados pessoais em atendimento à legislação brasileira de proteção de dados.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                2. Definições
              </h2>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li><strong>Dados Pessoais:</strong> Informações relacionadas a pessoa natural identificada ou identificável</li>
                <li><strong>Titular:</strong> Pessoa natural a quem se referem os dados pessoais</li>
                <li><strong>Controlador:</strong> Pessoa natural ou jurídica que toma decisões sobre o tratamento de dados pessoais</li>
                <li><strong>Operador:</strong> Pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do controlador</li>
                <li><strong>Tratamento:</strong> Toda operação realizada com dados pessoais</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                3. Controlador e Operador de Dados
              </h2>
              <p className="text-slate-400 mb-4">
                A Azera CRM atua como Controlador dos dados pessoais coletados diretamente de seus usuários. Quando você utiliza nosso CRM para gerenciar dados de seus clientes, você é o Controlador desses dados e a Azera CRM atua como Operador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                4. Bases Legais para Tratamento
              </h2>
              <p className="text-slate-400 mb-4">
                Tratamos seus dados pessoais com base nas seguintes hipóteses legais:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li><strong>Consentimento:</strong> Quando você voluntariamente fornece dados para uso do serviço</li>
                <li><strong>Execução de Contrato:</strong> Para fornecer os serviços contratados</li>
                <li><strong>Legítimo Interesse:</strong> Para melhorar nossos serviços e prevenir fraudes</li>
                <li><strong>Cumprimento de Obrigação Legal:</strong> Quando exigido por lei</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                5. Dados Pessoais Tratados
              </h2>
              <h3 className="text-xl font-thin text-slate-300 mb-3">5.1 Dados dos Usuários</h3>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Número de telefone</li>
                <li>Informações profissionais</li>
                <li>Dados de acesso e uso da plataforma</li>
              </ul>

              <h3 className="text-xl font-thin text-slate-300 mb-3">5.2 Dados dos Clientes (Gerenciados pelos Usuários)</h3>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>Dados fornecidos pelos usuários em seus CRMs</li>
                <li>Informações de leads e prospects</li>
                <li>Histórico de interações e comunicações</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                6. Finalidades do Tratamento
              </h2>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>Fornecer e manter o serviço de CRM</li>
                <li>Processar pagamentos e gerenciar assinaturas</li>
                <li>Melhorar a experiência do usuário</li>
                <li>Garantir segurança e prevenir fraudes</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Enviar comunicações sobre o serviço</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                7. Compartilhamento de Dados
              </h2>
              <p className="text-slate-400 mb-4">
                Seus dados pessoais são tratados com confidencialidade. Podemos compartilhá-los apenas nas seguintes situações:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>Com prestadores de serviços (processamento de pagamentos, hospedagem)</li>
                <li>Quando exigido por ordem judicial ou autoridade competente</li>
                <li>Com seu consentimento explícito</li>
                <li>Para proteger direitos e segurança</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                8. Seus Direitos como Titular
              </h2>
              <p className="text-slate-400 mb-4">
                A LGPD garante os seguintes direitos aos titulares de dados pessoais:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li><strong>Confirmação:</strong> Saber se tratamos seus dados</li>
                <li><strong>Acesso:</strong> Obter cópia dos dados tratados</li>
                <li><strong>Correção:</strong> Solicitar correção de dados incompletos ou incorretos</li>
                <li><strong>Anonimização:</strong> Solicitar anonimização dos dados</li>
                <li><strong>Portabilidade:</strong> Receber dados em formato interoperável</li>
                <li><strong>Eliminação:</strong> Solicitar exclusão dos dados</li>
                <li><strong>Informação:</strong> Saber com quem compartilhamos os dados</li>
                <li><strong>Revogação:</strong> Revogar consentimento quando aplicável</li>
                <li><strong>Oposição:</strong> Opor-se ao tratamento em certas circunstâncias</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                9. Exercício de Direitos
              </h2>
              <p className="text-slate-400 mb-4">
                Para exercer seus direitos, entre em contato através do e-mail: lgpd@azeracrm.com. Responderemos em até 15 dias úteis, prorrogáveis por mais 15 dias quando necessário.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                10. Segurança dos Dados
              </h2>
              <p className="text-slate-400 mb-4">
                Implementamos medidas técnicas e organizacionais para proteger seus dados pessoais contra:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>Acesso não autorizado</li>
                <li>Situações acidentais ou ilícitas de destruição, perda, alteração ou divulgação</li>
                <li>Tratamento não autorizado ou incompatível</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                11. Retenção de Dados
              </h2>
              <p className="text-slate-400 mb-4">
                Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades do tratamento, respeitando os prazos legais de retenção. Dados anonimizados podem ser mantidos indefinidamente para fins estatísticos e de melhoria do serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                12. Cookies e Tecnologias Similares
              </h2>
              <p className="text-slate-400 mb-4">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência. Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                13. Transferência Internacional
              </h2>
              <p className="text-slate-400 mb-4">
                Seus dados podem ser transferidos para servidores localizados fora do Brasil. Garantimos que tais transferências ocorram com nível adequado de proteção, conforme exigido pela LGPD.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                14. Encarregado de Dados (DPO)
              </h2>
              <p className="text-slate-400 mb-4">
                Designamos um Encarregado de Proteção de Dados (DPO) responsável por atuar como canal de comunicação entre o controlador, os titulares dos dados e a Autoridade Nacional de Proteção de Dados (ANPD).
              </p>
              <p className="text-slate-400 mb-4">
                Contato do DPO: dpo@azeracrm.com
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                15. Relatório de Impacto à Proteção de Dados
              </h2>
              <p className="text-slate-400 mb-4">
                Quando necessário, realizamos Relatório de Impacto à Proteção de Dados (RIPD) para avaliar os riscos e impactos do tratamento de dados pessoais em nossas operações.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                16. Canal de Denúncias
              </h2>
              <p className="text-slate-400 mb-4">
                Disponibilizamos canal específico para denúncias relacionadas ao tratamento de dados pessoais. Denúncias podem ser feitas através do e-mail: denuncias@azeracrm.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                17. Alterações nesta Política
              </h2>
              <p className="text-slate-400 mb-4">
                Podemos atualizar esta política em conformidade com alterações na legislação. Notificaremos sobre mudanças significativas através de nossos canais oficiais.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                18. Contato
              </h2>
              <p className="text-slate-400 mb-4">
                Para questões relacionadas à LGPD ou exercício de direitos:
              </p>
              <ul className="text-slate-400 mb-4 list-disc list-inside space-y-2">
                <li>E-mail: lgpd@azeracrm.com</li>
                <li>Encarregado de Dados: dpo@azeracrm.com</li>
                <li>Telefone: [Seu telefone]</li>
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