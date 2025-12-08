import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Users, Lock, Mail, Globe, Facebook } from 'lucide-react';
import NavBar from '../components/ui/NavBar';

export default function PoliticaPrivacidade() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade - Azera CRM</title>
        <meta name="description" content="Política de Privacidade do Azera CRM. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD e as diretrizes do Facebook/Meta." />
        <meta property="og:title" content="Política de Privacidade - Azera CRM" />
        <meta property="og:description" content="Política de Privacidade do Azera CRM. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD." />
        <meta property="og:url" content="https://azera.space/politica-privacidade" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Azera CRM" />
        <meta property="og:image" content="https://azera.space/og/politica-privacidade.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Política de Privacidade - Azera CRM" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Política de Privacidade - Azera CRM" />
        <meta name="twitter:description" content="Política de Privacidade do Azera CRM em conformidade com a LGPD." />
        <meta name="twitter:image" content="https://azera.space/og/politica-privacidade.png" />
        <link rel="canonical" href="https://azera.space/politica-privacidade" />
      </Helmet>

      <div className="min-h-screen bg-slate-950">
        <NavBar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-24 pt-32">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o início
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl">
                <Shield className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Política de Privacidade
                </h1>
                <p className="text-slate-400">Azera CRM</p>
              </div>
            </div>

            <p className="text-slate-400">
              Última atualização: 2 de dezembro de 2025
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Introdução */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                1. Quem Somos
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                O <strong>Azera CRM</strong> é uma plataforma de gestão de relacionamento com clientes (CRM) desenvolvida e operada por <strong>Ramon Souza</strong>, empresa sediada em Belo Horizonte, Minas Gerais, Brasil.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                Esta Política de Privacidade explica como coletamos, usamos, armazenamos, compartilhamos e protegemos seus dados pessoais quando você utiliza nossos serviços, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e outras regulamentações aplicáveis.
              </p>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                <p className="text-cyan-200 text-sm">
                  <strong>Responsável pelo Tratamento de Dados:</strong><br />
                  Ramon Souza / Azera CRM<br />
                  E-mail: coordenacaoheavens@gmail.com<br />
                  Endereço: Belo Horizonte, MG, Brasil
                </p>
              </div>
            </section>

            {/* Dados Coletados */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                2. Dados que Coletamos
              </h2>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">2.1 Dados fornecidos por você:</h3>
              <ul className="text-slate-300 space-y-2 list-disc list-inside">
                <li>Nome completo, e-mail, telefone e senha para criação de conta</li>
                <li>Informações da empresa (nome, CNPJ, endereço)</li>
                <li>Dados de leads e clientes que você cadastra no sistema</li>
                <li>Informações de pagamento para assinaturas</li>
                <li>Comunicações enviadas através da plataforma</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">2.2 Dados coletados automaticamente:</h3>
              <ul className="text-slate-300 space-y-2 list-disc list-inside">
                <li>Endereço IP e localização aproximada</li>
                <li>Tipo de navegador, sistema operacional e dispositivo</li>
                <li>Páginas visitadas e tempo de uso da plataforma</li>
                <li>Cookies e tecnologias de rastreamento</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">2.3 Dados de integrações com terceiros:</h3>
              <ul className="text-slate-300 space-y-2 list-disc list-inside">
                <li>Dados de leads provenientes de formulários do Facebook Lead Ads</li>
                <li>Informações de páginas do Facebook conectadas ao sistema</li>
                <li>Dados de campanhas e anúncios do Meta Ads</li>
              </ul>
            </section>

            {/* Facebook/Meta Integration */}
            <section className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Facebook className="w-5 h-5 text-blue-400" />
                3. Integração com Facebook/Meta
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                O Azera CRM oferece integração com os serviços do Facebook/Meta para permitir que você gerencie leads capturados através de anúncios e formulários da plataforma.
              </p>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">3.1 Permissões Solicitadas:</h3>
              <ul className="text-slate-300 space-y-2 list-disc list-inside mb-4">
                <li><strong>pages_show_list:</strong> Para listar as páginas do Facebook que você administra</li>
                <li><strong>leads_retrieval:</strong> Para acessar e importar leads gerados pelos seus anúncios</li>
                <li><strong>pages_read_engagement:</strong> Para visualizar informações básicas das páginas</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">3.2 Como Usamos os Dados do Facebook:</h3>
              <ul className="text-slate-300 space-y-2 list-disc list-inside mb-4">
                <li>Importar automaticamente leads de formulários do Facebook Lead Ads</li>
                <li>Sincronizar informações de contato (nome, email, telefone)</li>
                <li>Atribuir leads aos vendedores da sua equipe</li>
                <li>Permitir acompanhamento e gestão do funil de vendas</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-6 mb-3">3.3 Seus Direitos sobre Dados do Facebook:</h3>
              <ul className="text-slate-300 space-y-2 list-disc list-inside mb-4">
                <li>Você pode desconectar a integração a qualquer momento nas Configurações</li>
                <li>Ao desconectar, deixamos de acessar novos dados do Facebook</li>
                <li>Você pode solicitar a exclusão dos dados importados</li>
                <li>Não compartilhamos dados do Facebook com terceiros</li>
              </ul>

              <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4 mt-4">
                <p className="text-blue-200 text-sm">
                  <strong>Conformidade com Meta Platform Terms:</strong> O Azera CRM segue rigorosamente as políticas e termos de uso da Meta Platform, incluindo as diretrizes de privacidade e proteção de dados dos usuários.
                </p>
              </div>
            </section>

            {/* Como Usamos */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                4. Como Usamos seus Dados
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Utilizamos seus dados pessoais para as seguintes finalidades:
              </p>
              <ul className="text-slate-300 space-y-2 list-disc list-inside">
                <li>Fornecer, operar e melhorar nossos serviços de CRM</li>
                <li>Criar e gerenciar sua conta de usuário</li>
                <li>Processar pagamentos e gerenciar assinaturas</li>
                <li>Enviar comunicações importantes sobre o serviço</li>
                <li>Personalizar sua experiência na plataforma</li>
                <li>Fornecer suporte ao cliente</li>
                <li>Garantir a segurança e prevenir fraudes</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Realizar análises para melhorar nossos produtos</li>
              </ul>
            </section>

            {/* Compartilhamento */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                5. Compartilhamento de Dados
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                <strong>Não vendemos, alugamos ou comercializamos seus dados pessoais.</strong> Podemos compartilhar informações apenas nas seguintes situações:
              </p>
              <ul className="text-slate-300 space-y-2 list-disc list-inside">
                <li><strong>Com seu consentimento explícito</strong></li>
                <li><strong>Provedores de serviço:</strong> Empresas que nos ajudam a operar (hospedagem, pagamentos), sempre sob contratos de confidencialidade</li>
                <li><strong>Obrigações legais:</strong> Quando exigido por lei, ordem judicial ou autoridade governamental</li>
                <li><strong>Proteção de direitos:</strong> Para proteger nossos direitos, segurança ou propriedade</li>
                <li><strong>Transações corporativas:</strong> Em caso de fusão, aquisição ou venda de ativos</li>
              </ul>
            </section>

            {/* Segurança */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                6. Segurança dos Dados
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:
              </p>
              <ul className="text-slate-300 space-y-2 list-disc list-inside">
                <li>Criptografia SSL/TLS em todas as comunicações</li>
                <li>Criptografia de dados sensíveis em repouso</li>
                <li>Controles de acesso baseados em função (RBAC)</li>
                <li>Autenticação segura e senhas criptografadas</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Backups regulares e plano de recuperação de desastres</li>
                <li>Infraestrutura hospedada em provedores certificados (Supabase/AWS)</li>
              </ul>
            </section>

            {/* Direitos LGPD */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                7. Seus Direitos (LGPD)
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
              </p>
              <ul className="text-slate-300 space-y-2 list-disc list-inside mb-4">
                <li><strong>Confirmação:</strong> Saber se tratamos seus dados pessoais</li>
                <li><strong>Acesso:</strong> Obter cópia dos dados que mantemos sobre você</li>
                <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li><strong>Anonimização/Bloqueio/Eliminação:</strong> De dados desnecessários ou excessivos</li>
                <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                <li><strong>Eliminação:</strong> Apagar dados tratados com base no consentimento</li>
                <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
                <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> Se opor a tratamentos irregulares</li>
              </ul>
              <p className="text-slate-300 leading-relaxed">
                Para exercer esses direitos, entre em contato através do e-mail: <strong>coordenacaoheavens@gmail.com</strong>
              </p>
            </section>

            {/* Retenção */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                8. Retenção de Dados
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Mantemos seus dados pessoais apenas pelo tempo necessário para:
              </p>
              <ul className="text-slate-300 space-y-2 list-disc list-inside mb-4">
                <li>Cumprir as finalidades descritas nesta política</li>
                <li>Atender obrigações legais, contábeis ou fiscais</li>
                <li>Resolver disputas e fazer cumprir acordos</li>
              </ul>
              <p className="text-slate-300 leading-relaxed">
                Após o encerramento da conta, mantemos dados por até 5 anos para fins legais, após o qual são anonimizados ou excluídos.
              </p>
            </section>

            {/* Cookies */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                9. Cookies e Tecnologias de Rastreamento
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="text-slate-300 space-y-2 list-disc list-inside mb-4">
                <li><strong>Cookies essenciais:</strong> Necessários para o funcionamento do site</li>
                <li><strong>Cookies de preferência:</strong> Para lembrar suas configurações</li>
                <li><strong>Cookies de análise:</strong> Para entender como você usa o serviço</li>
              </ul>
              <p className="text-slate-300 leading-relaxed">
                Você pode controlar cookies através das configurações do seu navegador.
              </p>
            </section>

            {/* Alterações */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                10. Alterações nesta Política
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas através de e-mail ou aviso em nosso serviço. Recomendamos revisar esta página regularmente.
              </p>
            </section>

            {/* Contato */}
            <section className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                11. Contato
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade ou sobre o tratamento dos seus dados, entre em contato:
              </p>
              <div className="space-y-2 text-slate-300">
                <p><strong>Azera CRM</strong></p>
                <p>Responsável: Ramon Souza</p>
                <p>E-mail: <a href="mailto:coordenacaoheavens@gmail.com" className="text-cyan-400 hover:underline">coordenacaoheavens@gmail.com</a></p>
                <p>Endereço: Belo Horizonte, MG, Brasil</p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-white/10 text-center text-slate-400 text-sm">
            <p>© {new Date().getFullYear()} Azera CRM. Todos os direitos reservados.</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/termos-uso" className="hover:text-white transition-colors">Termos de Uso</Link>
              <span>•</span>
              <Link to="/lgpd" className="hover:text-white transition-colors">LGPD</Link>
              <span>•</span>
              <Link to="/" className="hover:text-white transition-colors">Início</Link>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
