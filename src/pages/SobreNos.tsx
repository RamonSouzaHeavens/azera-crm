import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2, Users, Target, Shield, Zap, Globe, TrendingUp, Rocket } from 'lucide-react'
import NavBar from '../components/ui/NavBar'
import logoVertical from '../images/identidade visual/Azera Logo Vertical.png'

export default function SobreNos() {
  return (
    <div className="bg-black min-h-screen">
      <NavBar />

      {/* Hero Section */}
      <motion.section
        className="w-full px-6 py-24 pt-32"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            className="text-5xl md:text-6xl font-thin text-white mb-6"
            style={{ fontFamily: 'Outfit, system-ui, sans-serif', lineHeight: '1.2' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Sobre Nós — Azera CRM
          </motion.h1>
          <motion.p
            className="text-xl text-slate-400 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            A história por trás do CRM brasileiro que nasceu da necessidade real de empreendedores como você.
          </motion.p>
        </div>
      </motion.section>

      {/* Nossa História */}
      <motion.section
        className="w-full px-6 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Nossa História
              </h2>
              <div className="space-y-4 text-slate-400 text-lg leading-relaxed">
                <p>
                  O Azera nasceu de uma necessidade real: a vida corrida de quem empreende no Brasil.
                </p>
                <p>
                  Eu, Ramon, sempre trabalhei com marketing, tecnologia, vendas, automações e atendimento. Já fiz de tudo pra sobreviver no meio do caos — edição de vídeos, criação de sites, social media, tráfego pago, pintura de casas, lavagem automotiva. E em todos esses cenários, uma coisa sempre me incomodou: as ferramentas eram complicadas demais, caras demais e pensadas pra empresas grandes demais.
                </p>
                <p>
                  A maioria dos profissionais liberais, agências, pequenas empresas, clínicas e imobiliárias não tinha acesso a um CRM simples, bonito, acessível e flexível. Tudo era ou burocrático, ou caro, ou travado.
                </p>
                <p className="text-white font-semibold text-xl">
                  Aí nasceu o Azera.
                </p>
              </div>
            </motion.div>
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-8">
                <div className="text-center">
                  <Target className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                    Problema Identificado
                  </h3>
                  <p className="text-slate-400">
                    Ferramentas complicadas, caras e inadequadas para o mercado brasileiro de pequenos negócios.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Missão */}
      <motion.section
        className="w-full px-6 py-24 bg-gradient-to-b from-black to-slate-950/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            className="bg-white/5 border border-white/10 rounded-3xl p-12 max-w-4xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Rocket className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              Nossa Missão
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">
              Criar um CRM brasileiro, acessível, direto ao ponto, que qualquer pessoa consiga usar — do barbeiro ao corretor de imóveis, do fotógrafo ao nutricionista, da agência pequena ao consultório médico.
            </p>
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-white font-semibold">Custa pouco</p>
                <p className="text-slate-400 text-sm">mas entrega muito</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-white font-semibold">Se adapta</p>
                <p className="text-slate-400 text-sm">não você</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-white font-semibold">É brasileiro</p>
                <p className="text-slate-400 text-sm">feito pra nós</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* O Que Acreditamos */}
      <motion.section
        className="w-full px-6 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              O Que Acreditamos
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Simplicidade acima de tudo
              </h3>
              <p className="text-slate-400">
                Um software tem que ajudar, não atrapalhar.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Flexibilidade total
              </h3>
              <p className="text-slate-400">
                Cada negócio é único. O Azera precisa se adaptar, não você.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Preço justo
              </h3>
              <p className="text-slate-400">
                R$40/mês, sem pegadinha, sem planos engessados.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Automação acessível
              </h3>
              <p className="text-slate-400">
                Não é só um CRM. É uma central de operações.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Visual moderno
              </h3>
              <p className="text-slate-400">
                Aquele estilo futurista Heavens HUD que a gente ama.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Segurança corporativa
              </h3>
              <p className="text-slate-400">
                Todo tenant isolado, tudo protegido com RLS, API Keys e HMAC.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Quem Somos */}
      <motion.section
        className="w-full px-6 py-24 bg-gradient-to-b from-black to-slate-950/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              Quem Somos
            </h2>
          </div>

          <motion.div
            className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 max-w-4xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-thin text-white mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                Heavens Enterprise
              </h3>
            </div>

            <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
              <p>
                Somos a Heavens Enterprise, uma empresa criada por mim e pela Ana — minha esposa e parceira em absolutamente tudo.
              </p>
              <p>
                A gente sempre acreditou que tecnologia boa precisa ser humana. Por isso, o Azera não é só código: é nossa visão, nossos valores, nossa história e a forma como a gente gosta de trabalhar.
              </p>
              <p>
                Vivemos na prática o que oferecemos: jobs corridos, clientes exigentes, muitas demandas, pouco tempo. Sabemos exatamente como é a rotina de quem empreende no Brasil, e é por isso que o Azera é tão direto ao ponto.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* O Azera Hoje */}
      <motion.section
        className="w-full px-6 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              O Azera Hoje
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Um CRM universal, pronto pra qualquer nicho
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              'autônomos', 'agências (profissionais sem CNPJ)', 'clínicas e consultórios',
              'imobiliárias (com template pronto tipo Infinity)', 'agências de marketing',
              'fotógrafos, videomakers', 'revendas de carros', 'pequenos comércios',
              'oficinas, estética automotiva', 'personal trainers, nutricionistas', 'prestadores de serviços em geral'
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <p className="text-slate-300">{item}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-thin text-white mb-6 text-center" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              Tecnologia Moderna
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-thin text-blue-400 mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                  Frontend & Backend
                </h4>
                <ul className="space-y-2 text-slate-400">
                  <li>• Next.js 14, React, TypeScript</li>
                  <li>• Supabase (Auth + DB + Storage + RLS)</li>
                  <li>• HMAC, API Keys, Webhooks, API Logs</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-thin text-emerald-400 mb-4" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                  Infraestrutura & Pagamento
                </h4>
                <ul className="space-y-2 text-slate-400">
                  <li>• Hostinger VPS pro n8n (147.79.86.2)</li>
                  <li>• Stripe para cobrança recorrente</li>
                  <li>• UI futurista Heavens HUD com Tailwind + shadcn</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Principais Módulos */}
      <motion.section
        className="w-full px-6 py-24 bg-gradient-to-b from-black to-slate-950/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              Principais Módulos
            </h2>
          </div>

          <div className="space-y-8">
            {[
              {
                number: 1,
                title: "Produtos (totalmente universal)",
                description: "Funciona pra imóvel, carro, consulta, serviço, pacote, o que você quiser. Com capa, galeria, anexos, categorias e campos personalizados infinitos.",
                icon: <Globe className="w-6 h-6" />,
                color: "blue"
              },
              {
                number: 2,
                title: "Leads",
                description: "Pipeline simples e eficiente, com status, motivo de perda, notas, timeline, associação com produtos, importação CSV, campos personalizados (em desenvolvimento).",
                icon: <TrendingUp className="w-6 h-6" />,
                color: "emerald"
              },
              {
                number: 3,
                title: "Tarefas",
                description: "Perfeitas pra equipes e rotinas diárias.",
                icon: <CheckCircle2 className="w-6 h-6" />,
                color: "amber"
              },
              {
                number: 4,
                title: "Equipes e Permissões",
                description: "Owner, Admin e Vendedor. Tudo com multi-tenant verdadeiro e RLS nível enterprise.",
                icon: <Users className="w-6 h-6" />,
                color: "rose"
              },
              {
                number: 5,
                title: "Automação & API",
                description: "Cada tenant terá API Keys próprias, permissões por escopo, webhooks com assinatura, logs e histórico, integração completa com n8n, callbacks seguros.",
                icon: <Zap className="w-6 h-6" />,
                color: "indigo"
              },
              {
                number: 6,
                title: "Assinaturas",
                description: "Preço fixo, modelo simples: R$40/mês, R$210 no semestral, R$360 no anual. Tudo via Stripe, com renovação automática.",
                icon: <Shield className="w-6 h-6" />,
                color: "violet"
              }
            ].map((module, index) => (
              <motion.div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              >
                <div className="flex items-start gap-6">
                  <div className={`w-12 h-12 bg-${module.color}-500/20 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-${module.color}-400 font-bold`}>{module.number}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-thin text-white mb-3" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                      {module.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Por que existe */}
      <motion.section
        className="w-full px-6 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            className="bg-white/5 border border-white/10 rounded-3xl p-12"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Target className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              Por que o Azera existe?
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed max-w-4xl mx-auto">
              Porque o empreendedor brasileiro merece uma ferramenta que não roube tempo, não atrapalhe, não complique e não destrua o bolso.
            </p>
            <p className="text-lg text-white font-semibold mt-6">
              CRM não é luxo. CRM é sobrevivência.
            </p>
            <p className="text-slate-400 mt-4">
              E nosso objetivo é simples: transformar o Azera no CRM mais acessível e flexível do Brasil.
            </p>
            <p className="text-slate-400 mt-2">
              Servindo desde o barbeiro da esquina até a imobiliária que vende milhões.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* O Futuro */}
      <motion.section
        className="w-full px-6 py-24 bg-gradient-to-b from-black to-slate-950/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Rocket className="w-16 h-16 text-blue-400 mx-auto mb-6" />
              <h2 className="text-4xl md:text-5xl font-thin text-white mb-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
                O Futuro
              </h2>
              <p className="text-xl text-slate-400">
                A gente tá só começando. Os próximos passos já estão em construção:
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              "Campos personalizados em leads e tarefas",
              "Automação nativa via IA",
              "Assistente inteligente dentro do CRM",
              "Conexão direta com a Meta (Ads + Leads)",
              "Mais integrações",
              "Marketplace de templates (ex.: Infinity Imóveis)",
              "Versão mobile",
              "Automação 100% plug-and-play com n8n"
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

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