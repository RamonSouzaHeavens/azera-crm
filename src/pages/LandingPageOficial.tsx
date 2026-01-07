import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, TrendingUp, Instagram, BarChart2,
  Target, Check, Plus, ChevronDown, Shield, Clock, Globe,
  Users, Webhook, CreditCard, ArrowUpRight, Home, Smartphone, Mail,
  MessageSquare, User, Database, BrainCircuit, Calculator, Swords,
  Zap, FileCheck, Rocket, Pause, Shuffle, Sparkles, Crown, Medal, Flame, ArrowUp
} from 'lucide-react';
import ParticleBackground from '../components/landing/ParticleBackground';
import heroDashboardImg from '../images/herodashboard.png';
import logoHorizontal from '../images/identidade visual/Azera Logo Horizontal.png';
import mulherSecao2Img from '../images/mulherdasecao2.png';


const TIMELINE_STEPS = [
  {
    step: '01',
    title: 'Captura & Atração',
    icon: Target,
    description: 'Atraia leads qualificados através de conteúdo estratégico e campanhas de alta conversão.',
    position: { rotateX: 0, rotateY: 0 } // Frente
  },
  {
    step: '02',
    title: 'Qualificação',
    icon: Users,
    description: 'Separe curiosos de compradores reais, pontuando leads com base em comportamento.',
    position: { rotateX: 0, rotateY: 90 } // Direita
  },
  {
    step: '03',
    title: 'Engajamento',
    icon: MessageSquare,
    description: 'Mantenha o lead aquecido com sequências que educam e quebram objeções.',
    position: { rotateX: 0, rotateY: 180 } // Trás
  },
  {
    step: '04',
    title: 'Apresentação',
    icon: Zap,
    description: 'Uma apresentação estruturada focada em valor, customizada para a dor do cliente.',
    position: { rotateX: 0, rotateY: -90 } // Esquerda
  },
  {
    step: '05',
    title: 'Fechamento',
    icon: FileCheck,
    description: 'Processos claros para assinatura, reduzindo o tempo entre o sim e o dinheiro.',
    position: { rotateX: 90, rotateY: 0 } // Cima
  },
  {
    step: '06',
    title: 'Onboarding',
    icon: Rocket,
    description: 'Transforme novos clientes em fãs com um processo de boas-vindas incrível.',
    position: { rotateX: -90, rotateY: 0 } // Baixo
  },
];

const PRO_FEATURES = [
  {
    icon: Database,
    tag: 'Pesquisa',
    title: 'Enriquecimento de Dados',
    description: 'Descubra e-mails, telefones e cargos em segundos. Pare de pesquisar, comece a vender.'
  },
  {
    icon: BrainCircuit,
    tag: 'IA',
    title: 'Perfil Comportamental',
    description: 'A IA analisa o lead e sugere a abordagem ideal. Personalize cada conversa.'
  },
  {
    icon: Calculator,
    tag: 'Vendas',
    title: 'Calculadora de ROI',
    description: 'Mostre números que convencem. Tire objeções de preço da mesa.'
  },
  {
    icon: Swords,
    tag: 'Competição',
    title: 'Battlecards',
    description: 'Comparativos prontos contra concorrentes. Vença objeções na hora.'
  }
];

const PRICING_PLANS = [
  {
    name: 'Grátis',
    description: 'Experimente o Azera sem compromisso.',
    price: 'R$ 0',
    period: '',
    features: [
      'Até 100 leads',
      'Até 5 produtos',
      'Tarefas ilimitadas',
      '1 membro na equipe'
    ],
    cta: 'Começar Grátis',
    popular: false,
    isEnterprise: false
  },
  {
    name: 'Mensal',
    description: 'Flexibilidade máxima, pague mês a mês.',
    price: 'R$ 80',
    period: '/ mês',
    features: [
      'Leads ilimitados',
      'WhatsApp integrado',
      'Automações e IA',
      'Catálogo completo',
      'Relatórios avançados',
      'Equipe ilimitada'
    ],
    cta: 'Assinar Mensal',
    popular: false,
    isEnterprise: false
  },
  {
    name: 'Semestral',
    description: 'Economize 12% no plano semestral.',
    price: 'R$ 70',
    period: '/ mês',
    fullPrice: 'R$ 420 à vista ou parcelado',
    features: [
      'Leads ilimitados',
      'WhatsApp integrado',
      'Automações e IA',
      'Catálogo completo',
      'Relatórios avançados',
      'Equipe ilimitada'
    ],
    cta: 'Assinar Semestral',
    popular: true,
    discount: '12%',
    isEnterprise: false
  },
  {
    name: 'Anual',
    description: 'Melhor custo-benefício, economize 25%.',
    price: 'R$ 65',
    period: '/ mês',
    fullPrice: 'R$ 780 à vista ou parcelado',
    features: [
      'Leads ilimitados',
      'WhatsApp integrado',
      'Automações e IA',
      'Catálogo completo',
      'Relatórios avançados',
      'Equipe ilimitada'
    ],
    cta: 'Assinar Anual',
    popular: false,
    discount: '25%',
    isEnterprise: false
  },
  {
    name: 'Enterprise',
    description: 'CRM White Label personalizado para sua empresa.',
    price: 'Sob Consulta',
    period: '',
    features: [
      'CRM White Label',
      'Estrutura personalizada',
      'Implementação sob medida',
      'Suporte dedicado',
      'Integrações customizadas'
    ],
    cta: 'Entrar em Contato',
    popular: false,
    isEnterprise: true
  }
];

const FAQ_ITEMS = [
  {
    question: 'Posso integrar meu WhatsApp pessoal?',
    answer: 'Sim! Conecte via QR Code em segundos. Use seu número atual ou múltiplos números com controle por equipe.'
  },
  {
    question: 'Como funciona o enriquecimento de leads?',
    answer: 'Ao cadastrar um lead com e-mail ou LinkedIn, a IA busca automaticamente cargo, empresa, telefone e contexto para você qualificar em minutos.'
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Cancele a qualquer momento pelo portal do cliente, sem multas, sem burocracia. Seus dados ficam disponíveis por 30 dias.'
  },
  {
    question: 'Vocês oferecem período de teste?',
    answer: '7 dias grátis em qualquer plano. Teste todas as funcionalidades sem compromisso.'
  }
];

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/** Header flutuante com navegação e CTA */
const Header = () => (
  <header className="fixed top-0 w-full z-50 px-6 py-4 md:px-12 flex justify-between items-center">
    <div className="flex items-center gap-2 z-50 cursor-pointer">
      <img src={logoHorizontal} alt="Azera" className="h-8 w-auto" />
    </div>

    <nav className="hidden md:flex items-center gap-8 border border-white/10 bg-white/5 backdrop-blur-md rounded-full px-8 py-3 shadow-lg hover:border-blue-500/30 transition-all duration-300">
      <a href="#dashboard-hero" className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">Dashboard</a>
      <a href="#timeline" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Como funciona</a>
      <a href="#gamification" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Gamificação</a>
      <a href="#recursos" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Recursos</a>
      <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Planos</a>
      <a href="#contato" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Contato</a>
    </nav>

    <a href="/login" className="group relative px-6 py-3 rounded-full overflow-hidden bg-white text-black font-medium text-sm transition-all hover:scale-105 hidden sm:block">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative group-hover:text-white transition-colors">Login / Cadastro</span>
    </a>
  </header>
);

/** Seção 1 - Hero - Promessa principal + CTA */
const HeroSection = () => (
  <main className="relative z-10 container mx-auto px-6 md:px-12 min-h-screen flex flex-col justify-center pt-32 pb-12 border-b border-white/5">
    {/* Background 3D de Partículas - preso apenas na Hero */}
    <ParticleBackground className="absolute inset-0 w-full h-full overflow-hidden" />

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-center relative z-10">

      {/* Coluna Esquerda: Headline + Benefícios */}
      <div className="lg:col-span-5 lg:col-start-1 flex flex-col justify-center z-20 order-2 lg:order-1">

        {/* C        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-semibold mb-6 w-fit">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          CRM + WhatsApp + IA em um só lugar
        </div> */}


        <h1 className="text-5xl md:text-8xl font-outfit font-extralight leading-[1.1] mb-8">
          Se organizar <br />
          nunca foi <br /> tão
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"> simples</span>
        </h1>

        {/* Botão + Texto ao lado */}
        <div className="flex items-center gap-6 mb-12">
          <a
            href="/login"
            className="flex items-center gap-4 border border-white/10 hover:border-white/20 pl-6 pr-2 py-2 rounded-full transition-all group"
          >
            <span className="text-white font-medium">Comece sem custos</span>

            {/* MUDANÇA PRINCIPAL AQUI:
               1. Troquei w-14 por w-24 (agora é largo, estilo pílula).
               2. O SVG agora tem espaço para ser desenhado longo.
            */}
            <div className="w-24 h-14 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-cyan-500/30">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                // Aumentei o viewBox horizontalmente para 52 unidades para caber a linha longa
                viewBox="0 0 52 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                // A classe w-16 força o SVG a ocupar boa parte da largura da "pílula"
                className="w-16 h-6 text-white"
              >
                {/* Linha horizontal indo de X=2 até X=50 (bem comprida) */}
                <path d="M2 12H50" />
                {/* Ponta da seta ajustada para o final da linha (X=50) */}
                <path d="M43 5l7 7-7 7" />
              </svg>

            </div>
          </a>

          <p className="text-gray-400 text-sm max-w-[200px] leading-relaxed hidden sm:block">
            Centralize Whatsapp, leads, tarefas e produtos em um só lugar e feche negócios com <span className="text-white font-medium">previsibilidade.</span>
          </p>
        </div>

        <div className="flex gap-6 mt-auto">
          {/* Card 1 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-6 rounded-[2.5rem] w-64 h-48 hover:border-blue-500/30 transition-colors flex flex-col justify-between group">
            <div className="flex flex-col items-end">
              <div className="text-5xl font-extralight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-none">360º</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1 font-medium">Visão Total</div>
            </div>
            <p className="text-[12px] text-gray-500 leading-snug max-w-[140px] font-light">
              Leads, mensagens e tarefas em uma única timeline.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-6 rounded-[2.5rem] w-64 h-48 hover:border-purple-500/30 transition-colors flex flex-col justify-between group">
            <div className="flex flex-col items-end">
              <div className="text-5xl font-extralight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent leading-none">IA</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1 font-medium">Aplicada</div>
            </div>
            <p className="text-[12px] text-gray-500 leading-snug max-w-[140px] font-light">
              Qualifique leads e personalize abordagens automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Social Proof */}
      <div className="lg:col-span-3 lg:col-start-10 h-full flex flex-col justify-between items-end relative z-20 order-3">
        <div className="mb-12 text-right hidden lg:block">
          <p className="text-gray-400 text-sm max-w-[200px] leading-relaxed ml-auto">
            Empresas que usam CRM têm <span className="text-emerald-400 font-semibold">+29% em vendas</span> e maior produtividade.
          </p>
        </div>

        {/* Benefícios do produto */}
        <div className="flex flex-col gap-4 w-full max-w-[260px]">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">WhatsApp Integrado</div>
                <div className="text-xs text-gray-500">Conversas centralizadas</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Pipeline Visual</div>
                <div className="text-xs text-gray-500">Kanban intuitivo</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Automações com IA</div>
                <div className="text-xs text-gray-500">Trabalho inteligente</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex gap-3 self-end lg:absolute lg:bottom-0 lg:right-0">
          <a href="#" className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 transition-all">
            <Instagram className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  </main>
);

/** Seção 2 - Dashboard - Dashboard + Benefícios */
const DashboardSection = () => (
  <section id="dashboard-hero" className="relative bg-black border-b border-white/5 overflow-hidden">
    {/* Content Container - 1440px */}
    <div className="max-w-[1440px] mx-auto py-24 px-6 lg:px-12">
      {/* Imagem do Dashboard */}
      <div className="relative mb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black z-10 pointer-events-none" />
        <img
          src={heroDashboardImg}
          alt="Dashboard Azera CRM"
          className="w-full max-w-5xl mx-auto rounded-2xl shadow-2xl border border-white/10"
        />
      </div>

      {/* Texto Central - sobrepõe a imagem */}
      <div className="text-center mb-16 relative z-20 -mt-24">
        <p className="text-gray-400 text-lg mb-2">Sem excessos, 100% focado em</p>
        <h2 className="text-5xl md:text-7xl font-extralight font-outfit text-white">
          Produtividade
        </h2>
      </div>

      {/* 3 Cards de Benefícios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Card 1 */}
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-outfit font-semibold text-white mb-3">Sem complicações</h3>
          <p className="text-white/60 text-base leading-relaxed mb-10 max-w-lg">
            Com apenas o essencial, aprenda a usar o CRM em apenas 3 horas de uso. Com sua equipe engajada à usabilidade, sua empresa ganha muito em desenvolvimento e resultados.
          </p>
        </div>

        {/* Card 2 */}
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-outfit font-semibold text-white mb-3">Dashboard Essencial</h3>
          <p className="text-white/60 text-base leading-relaxed mb-10 max-w-lg">
            Tudo que você precisa saber está no dashboard. Leads sem resposta, despesas mensais, compromissos, negociações e tarefas. Além de uma visão da Pipeline de leads.
          </p>
        </div>

        {/* Card 3 */}
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-outfit font-semibold text-white mb-3">Melhorias</h3>
          <p className="text-white/60 text-base leading-relaxed mb-10 max-w-lg">
            Nossa equipe oferece adaptações como atendimento automático no WhatsApp, avisos diretamente no WhatsApp da equipe e muito mais por valores acessíveis.
          </p>
        </div>
      </div>
    </div>
  </section>
);

/** Seção IA - Agentes de IA Integrados ao CRM */
const AIAgentsSection = () => {
  const whatsappNumber = '5531991318312';
  const whatsappMessage = encodeURIComponent('Olá! Vim do site da Azera e quero saber mais sobre os Agentes de IA integrados ao CRM.');
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <section className="relative w-full bg-black overflow-hidden border-b border-white/5">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/20 to-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Content Container */}
      <div className="relative max-w-[1440px] mx-auto py-24 px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Coluna Esquerda: Imagem */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true }}
            className="relative flex justify-center lg:justify-start"
          >
            {/* Glow decorativo atrás da imagem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/30 via-cyan-500/20 to-purple-500/30 blur-[80px] rounded-full" />
            </div>

            {/* Imagem */}
            <img
              src={mulherSecao2Img}
              alt="Especialista em IA"
              className="relative z-10 w-full lg:w-[650px] xl:w-[750px] h-auto object-contain drop-shadow-2xl scale-110 lg:scale-125"
            />
          </motion.div>

          {/* Coluna Direita: Texto */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col"
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-semibold mb-6 w-fit">
              <BrainCircuit className="w-4 h-4" />
              <span>Inteligência Artificial Avançada</span>
            </div>

            {/* Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-outfit font-extralight leading-[1.15] mb-6">
              Desenvolvemos{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">
                Agentes de IA
              </span>
              <br />
              integrados ao seu CRM
            </h2>

            {/* Subtítulo persuasivo */}
            <p className="text-white/60 text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
              Enquanto você dorme, seu <span className="text-white font-medium">agente inteligente</span> qualifica leads, responde perguntas e agenda reuniões.
              <span className="text-cyan-400 font-semibold"> O melhor?</span> A mensalidade do CRM sai praticamente <span className="text-emerald-400 font-bold">de graça</span> para quem contrata a automação com IA.
            </p>

            {/* Lista de benefícios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
                { icon: Zap, text: 'Atendimento 24/7 no WhatsApp' },
                { icon: Target, text: 'Qualificação automática de leads' },
                { icon: MessageSquare, text: 'Respostas personalizadas com IA' },
                { icon: TrendingUp, text: 'Aumento de até 3x nas conversões' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white/80">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA WhatsApp */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-4 px-8 py-5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl text-white font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] w-fit"
            >
              {/* Brilho animado */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

              {/* Ícone WhatsApp */}
              <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>

              <span className="relative z-10">Falar com Especialista</span>

              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Texto de urgência */}
            <p className="mt-6 text-sm text-white/40 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Vagas limitadas para implementação em Janeiro
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/** Widget de KPI Financeiro - Prova visual de resultado */
const KPIWidget = () => (
  <div className="bg-gradient-to-b from-gray-800 to-black border border-white/10 p-5 rounded-[2rem] w-full max-w-[260px] animate-float-delayed shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-gray-400">Este Mês</span>
      </div>
      <span className="text-xs text-emerald-400">+18%</span>
    </div>
    <div className="text-4xl font-light mb-1">R$ 124k</div>
    <div className="text-xs text-gray-500 mb-6">Receita fechada</div>

    {/* Mini gráfico simulado */}
    <div className="flex items-end gap-1 h-16">
      {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-sm group-hover:from-blue-500 group-hover:to-cyan-300 transition-colors"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  </div>
);

/** Seção 3 - Cards em Cubo Rotativo 3D */
const TimelineSection = () => {
  const [currIndex, setCurrIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Rastreia o índice anterior para evitar repetição "ping-pong" (A -> B -> A)
  const lastIndexRef = useRef<number | null>(null);

  const radius = 450;

  // Função inteligente que evita o atual E o imediatamente anterior
  const pickSmartRandom = () => {
    let nextIndex;
    // Tenta encontrar um índice que não seja o atual nem o anterior
    // O loop garante que ele continue procurando até achar um válido
    do {
      nextIndex = Math.floor(Math.random() * TIMELINE_STEPS.length);
    } while (
      nextIndex === currIndex ||
      (TIMELINE_STEPS.length > 2 && nextIndex === lastIndexRef.current)
    );

    lastIndexRef.current = currIndex; // Atualiza o histórico antes de mudar
    setCurrIndex(nextIndex);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        pickSmartRandom();
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, currIndex]); // Dependência currIndex garante que o closure tenha o estado atual

  // As setas agora usam a lógica inteligente para navegar
  const handleManualNavigation = () => {
    setIsAutoPlaying(false);
    pickSmartRandom();
  };

  const activeStep = TIMELINE_STEPS[currIndex];

  const containerStyle = {
    transform: `translateZ(${-radius}px) rotateX(${-activeStep.position.rotateX}deg) rotateY(${-activeStep.position.rotateY}deg)`,
  };

  return (
    <section id="timeline" className="relative w-full bg-black overflow-hidden border-b border-white/5">
      {/* Background Atmosphere - Full Width */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse pointer-events-none" />

      {/* Content Container - 1440px */}
      <div className="relative max-w-[1440px] mx-auto min-h-[800px] flex flex-col lg:flex-row items-center justify-between py-20 px-6 lg:px-12 perspective-container">

        {/* Left Column: Content & Controls */}
        <div className="w-full lg:w-3/5 z-20 flex flex-col items-start text-left mb-16 lg:mb-0">
          <h2 className="flex items-center justify-start w-full mb-6">
            <span className="text-5xl md:text-6xl font-extralight font-outfit text-white">Uma plataforma</span>
            <span className="text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-medium font-outfit ml-4">360º</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
            Importe seus leads e produtos facilmente com nosso sistema automatizado com IA e comece a usar hoje mesmo o Azera, com as funcionalidades mais importantes do mercado para sua empresa crescer.
          </p>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleManualNavigation}
              className="group p-4 rounded-full border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all active:scale-95"
              aria-label="Previous Random"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                if (isAutoPlaying) {
                  setIsAutoPlaying(false);
                } else {
                  pickSmartRandom();
                  setIsAutoPlaying(true);
                }
              }}
              className={`
              h-14 px-8 rounded-full flex items-center gap-3 border transition-all duration-300 font-medium text-sm tracking-wide
              ${isAutoPlaying
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }
            `}
            >
              {isAutoPlaying ? (
                <>
                  <Pause size={18} fill="currentColor" /> <span>AUTO</span>
                </>
              ) : (
                <>
                  <Shuffle size={18} /> <span>GIRAR</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualNavigation}
              className="group p-4 rounded-full border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all active:scale-95"
              aria-label="Next Random"
            >
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Column: 3D Scene */}
        <div className="w-full lg:w-1/2 h-[600px] flex items-center justify-center perspective-1000 relative">
          {/* Glow effect behind the cube */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* The Cube/Sphere Container */}
          <div
            className="relative w-[300px] md:w-[360px] h-[460px] preserve-3d transition-transform duration-[2000ms]"
            style={{
              ...containerStyle,
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {TIMELINE_STEPS.map((step, index) => {
              const isActive = index === currIndex;
              const Icon = step.icon;

              const cardTransform = `
              rotateX(${step.position.rotateX}deg)
              rotateY(${step.position.rotateY}deg)
              translateZ(${radius}px)
            `;

              return (
                <div
                  key={index}
                  className="absolute top-0 left-0 w-full h-full flex items-center justify-center backface-visible"
                  style={{ transform: cardTransform }}
                >
                  {/* Card */}
                  <div
                    className={`
                    relative w-full h-full p-8 rounded-3xl border flex flex-col justify-between
                    transition-all duration-1000 cursor-pointer backdrop-blur-sm
                    ${isActive
                        ? 'bg-black/90 border-blue-500/50 shadow-[0_0_60px_rgba(59,130,246,0.2)] opacity-100 scale-100 delay-200'
                        : 'bg-black/40 border-white/5 opacity-20 scale-90 hover:opacity-50 hover:border-white/20'
                      }
                  `}
                    onClick={() => {
                      if (!isActive) {
                        lastIndexRef.current = currIndex;
                        setCurrIndex(index);
                        setIsAutoPlaying(false);
                      }
                    }}
                  >
                    <div className={`flex flex-col h-full ${isActive ? 'animate-float-slow' : ''}`}>

                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl transition-colors duration-700 ${isActive ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' : 'bg-white/5 text-gray-600'}`}>
                          <Icon size={24} strokeWidth={1.5} />
                        </div>
                        <span className="font-mono text-5xl text-white/5 font-bold">
                          {step.step}
                        </span>
                      </div>

                      <div className="relative z-10 flex-grow flex flex-col justify-center">
                        <h3 className={`text-3xl font-light mb-4 transition-colors duration-700 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm leading-relaxed transition-colors duration-700 ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                          {step.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex gap-1">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full transition-colors duration-700 ${isActive ? 'bg-blue-500' : 'bg-white/10'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-white/20">Azera Node {step.step}</span>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
        .perspective-container {
          perspective: 2000px;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-visible {
          backface-visibility: visible;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(0.5deg); }
          75% { transform: translateY(8px) rotate(-0.5deg); }
        }
        .animate-float-slow {
          animation: float-slow 5s ease-in-out infinite;
        }
      ` }} />
      </div>
    </section>
  );
};

/** Seção 5 - Gamificação - Competição em tempo real */
const GamificationSection = () => {
  const INITIAL_COMPETITORS = [
    { id: 1, name: 'Marina Silva', sales: 12, revenue: 150, initials: 'MS', color: 'bg-yellow-500', glow: 'shadow-yellow-500/50' },
    { id: 2, name: 'Carlos Tech', sales: 11, revenue: 142, initials: 'CT', color: 'bg-slate-400', glow: 'shadow-slate-400/50' },
    { id: 3, name: 'Ana Costa', sales: 11, revenue: 138, initials: 'AC', color: 'bg-orange-500', glow: 'shadow-orange-500/50' },
  ];

  const [competitors, setCompetitors] = useState(INITIAL_COMPETITORS);
  const [globalXp, setGlobalXp] = useState(1200);
  const [currentLevel, setCurrentLevel] = useState(4);
  const [levelProgress, setLevelProgress] = useState(65);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: number; emoji: string; x: number; scale: number }>>([]);

  const prevOrderRef = useRef<Record<number, number>>({});

  const achievements = [
    { icon: Target, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
    { icon: Crown, color: 'text-[#0891b2]', bg: 'bg-[#0891b2]/10', border: 'border-[#0891b2]/20' },
    { icon: Flame, color: 'text-slate-600', bg: 'bg-white/5', border: 'border-white/5' },
  ];

  // Simulação da corrida de vendas
  useEffect(() => {
    INITIAL_COMPETITORS.forEach((c, i) => prevOrderRef.current[c.id] = i);

    const raceInterval = setInterval(() => {
      setCompetitors(prev => {
        const currentOrder: Record<number, number> = {};
        prev.forEach((c, i) => currentOrder[c.id] = i);
        prevOrderRef.current = currentOrder;

        const shouldBoostUnderdog = Math.random() < 0.4;
        let targetIndex;

        if (shouldBoostUnderdog) {
          const minSales = Math.min(...prev.map(c => c.sales));
          const underdogs = prev.map((c, i) => c.sales === minSales ? i : -1).filter(i => i !== -1);
          targetIndex = underdogs[Math.floor(Math.random() * underdogs.length)];
        } else {
          targetIndex = Math.floor(Math.random() * prev.length);
        }

        const newCompetitors = prev.map((comp, idx) => {
          if (idx === targetIndex) {
            return {
              ...comp,
              sales: comp.sales + 1,
              revenue: comp.revenue + Math.floor(Math.random() * 15) + 10
            };
          }
          return comp;
        });

        return newCompetitors.sort((a, b) => {
          if (b.sales !== a.sales) return b.sales - a.sales;
          return b.revenue - a.revenue;
        });
      });

      setGlobalXp(prevXp => prevXp + 250);

      setLevelProgress(prev => {
        const newProgress = prev + 25;
        if (newProgress >= 100) {
          setCurrentLevel(l => l + 1);
          return 0;
        }
        return newProgress;
      });
    }, 1500);

    return () => clearInterval(raceInterval);
  }, []);

  // Efeito de partículas
  useEffect(() => {
    const emojiList = ['💰', '🚀', '🔥', '💎', '🔔'];
    const interval = setInterval(() => {
      const newEmoji = {
        id: Date.now(),
        emoji: emojiList[Math.floor(Math.random() * emojiList.length)],
        x: 20 + Math.random() * 60,
        scale: 0.5 + Math.random() * 0.5,
      };
      setFloatingEmojis((prev) => [...prev.slice(-6), newEmoji]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full bg-black overflow-hidden border-b border-white/5">
      {/* Background Ambience - Full Width */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(8,145,178,0.15),_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />

      {/* Content Container - 1440px */}
      <div className="relative max-w-[1440px] mx-auto min-h-[900px] flex flex-col-reverse lg:flex-row items-center justify-between py-20 px-6 lg:px-12 gap-16 lg:gap-0">

        {/* LEFT COLUMN: INTERACTIVE VISUAL */}
        <div className="w-full lg:w-1/2 flex items-center justify-center relative">

          {/* Glow Blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#0891b2]/10 blur-[120px] rounded-full pointer-events-none" />

          {/* Floating Emojis */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none h-[800px] -top-24">
            {floatingEmojis.map((item) => (
              <div
                key={item.id}
                className="absolute text-xl filter drop-shadow-lg"
                style={{
                  left: `${item.x}%`,
                  bottom: '0px',
                  transform: `scale(${item.scale})`,
                  opacity: 0,
                  animation: `floatUp 3s ease-out forwards`
                }}
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* MAIN GLASS CARD */}
          <div className="relative w-full max-w-[480px] bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 bg-[#0891b2] rounded-2xl blur-lg opacity-40 animate-pulse"></div>
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#0891b2] to-cyan-500 flex items-center justify-center shadow-lg border border-white/10">
                    <span className="text-2xl font-bold text-white">{currentLevel}</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-black border border-[#0891b2] text-[10px] text-[#22d3ee] px-1.5 rounded-md font-bold uppercase tracking-wider">
                    Nível
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Liga Diamante</h3>
                  <p className="text-xs text-[#22d3ee]/80 font-medium uppercase tracking-wider mt-0.5 animate-pulse">
                    Competição Ativa • Ao vivo
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-yellow-400">
                  <Zap className="w-5 h-5 fill-yellow-400" />
                  <span className="text-3xl font-black text-white tracking-tighter tabular-nums transition-all duration-300">
                    {globalXp.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-white/40 font-medium">XP da Equipe</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8 relative z-10">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-white/60">Progresso para Nível {currentLevel + 1}</span>
                <span className="text-[#22d3ee] tabular-nums">{Math.round(levelProgress)}%</span>
              </div>
              <div className="relative h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#0891b2] via-cyan-400 to-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  style={{ width: `${levelProgress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-full bg-white blur-[2px]" />
                </div>
              </div>
            </div>

            {/* LEADERBOARD */}
            <div className="relative w-full h-[260px] mb-2 z-10">
              {competitors.map((rank, index) => {
                const isFirst = index === 0;
                const prevIndex = prevOrderRef.current[rank.id] ?? index;
                const isMovingUp = index < prevIndex;
                const cardHeight = 84;
                const translateY = index * cardHeight;

                return (
                  <div
                    key={rank.id}
                    className={`
                    absolute left-0 right-0 w-full flex items-center gap-4 p-4 rounded-xl border
                    transition-all duration-[600ms] cubic-bezier(0.34, 1.56, 0.64, 1)
                    ${isFirst
                        ? 'bg-gradient-to-r from-[#0891b2]/20 to-transparent border-[#0891b2]/40 shadow-lg shadow-[#0891b2]/20'
                        : 'bg-white/5 border-white/5 opacity-80'
                      }
                    ${isMovingUp ? 'scale-[1.05] z-50 bg-slate-800 shadow-2xl border-[#22d3ee]/50 brightness-125' : 'z-0'}
                  `}
                    style={{
                      transform: `translateY(${translateY}px)`,
                      zIndex: isMovingUp ? 100 : (10 - index),
                    }}
                  >
                    {/* Position Badge */}
                    <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner transition-colors duration-500
                    ${isFirst ? 'bg-yellow-500 text-white shadow-yellow-500/50' : 'bg-slate-700 text-slate-300'}
                  `}>
                      {isFirst ? <Crown size={18} fill="currentColor" /> : index + 1}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm transition-colors ${isFirst ? 'text-white' : 'text-gray-300'}`}>
                          {rank.name}
                        </p>
                        {isFirst && (
                          <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                            Líder <Flame size={8} fill="currentColor" />
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${rank.color}`}
                          style={{ width: `${Math.min(100, (rank.sales / (Math.max(...competitors.map(c => c.sales)) + 5)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right min-w-[80px]">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/40 uppercase">Vendas</span>
                        <div className="flex items-center gap-1">
                          <span className={`font-bold text-lg tabular-nums ${isFirst ? 'text-white' : 'text-gray-400'}`}>
                            {rank.sales}
                          </span>
                          {isMovingUp && <ArrowUp size={12} className="text-green-400 animate-bounce" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Achievement Footer */}
            <div className="pt-6 border-t border-white/5 relative z-10">
              <h4 className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4">Próximas Recompensas</h4>
              <div className="flex gap-3">
                {achievements.map((Badge, idx) => (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all duration-300 group/badge relative overflow-hidden ${Badge.bg} ${Badge.border}`}
                  >
                    <Badge.icon size={20} className={`${idx < 3 ? Badge.color : 'text-gray-600'} transition-transform group-hover/badge:scale-110`} strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none rounded-3xl" />
          </div>
        </div>

        {/* RIGHT COLUMN: CONTENT */}
        <div className="w-full lg:w-2/5 flex flex-col items-start text-left z-20">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0891b2]/10 border border-[#0891b2]/20 text-[#22d3ee] text-xs font-medium mb-6">
            <Sparkles size={12} />
            <span>Engajamento em Tempo Real</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extralight font-outfit text-white mb-6 leading-[1.1]">
            Gamificação que <br />
            <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#0891b2] via-cyan-400 to-emerald-400">
              cria disputa
            </span>
          </h2>

          <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
            Assista seus vendedores evoluírem em tempo real. Nosso sistema de rankings dinâmicos cria uma corrida saudável pelo topo, transformando metas chatas em uma competição viciante.
          </p>

          <div className="space-y-6 w-full">
            {[
              { icon: Target, title: "Evolução Contínua", desc: "Comece pequeno e suba de nível a cada venda realizada." },
              { icon: TrendingUp, title: "Ultrapassagens Reais", desc: "O ranking se atualiza no momento que a venda acontece." },
              { icon: Medal, title: "Feedback Imediato", desc: "Sons e visuais celebram cada conquista da equipe." }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-[#0891b2]/10 group-hover:border-[#0891b2]/30 transition-colors duration-300">
                  <feature.icon className="w-5 h-5 text-gray-400 group-hover:text-[#22d3ee] transition-colors" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1 group-hover:text-[#22d3ee] transition-colors">{feature.title}</h4>
                  <p className="text-sm text-gray-500 leading-snug">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px) scale(0.5); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-100px) scale(1.1); }
        }
      ` }} />
      </div>
    </section>
  );
};

/** Seção Ferramentas Pro - 4 ferramentas com preview de imagem */
const CommandCenterSection = () => {
  const [activeTool, setActiveTool] = useState(0);

  const proTools = [
    {
      id: 'roi_calc',
      title: 'Calculadora de ROI',
      description: 'Mostre o impacto financeiro da solução e ajude o cliente a justificar o investimento.',
      icon: Calculator,
      color: 'emerald',
      tag: 'VENDAS',
      image: '/images/PageCalculadora.png'
    },
    {
      id: 'proposals',
      title: 'Gerador de Propostas',
      description: 'Transforme dados do CRM em contratos e propostas profissionais em segundos.',
      icon: FileCheck,
      color: 'cyan',
      tag: 'ESSENCIAL',
      image: '/images/PagePropostas.png'
    },
    {
      id: 'battlecards',
      title: 'Battlecards',
      description: 'Comparativos prontos contra concorrentes. Vença objeções na hora.',
      icon: Swords,
      color: 'rose',
      tag: 'COMPETIÇÃO',
      image: '/images/PageBattlecards.png'
    },
    {
      id: 'playbook',
      title: 'Playbook de Objeções',
      description: 'Receba respostas prontas para lidar com objeções como "está caro" ou "vou pensar".',
      icon: MessageSquare,
      color: 'teal',
      tag: 'ESTRATÉGIA',
      image: '/images/PagePlaybook.png'
    }
  ];

  const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: 'text-emerald-500'
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      icon: 'text-cyan-500'
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      icon: 'text-rose-500'
    },
    teal: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      text: 'text-teal-400',
      icon: 'text-teal-500'
    }
  };

  return (
    <section id="pro-tools" className="relative w-full bg-[#080808] overflow-hidden border-b border-white/5">
      {/* Content Container - 1440px */}
      <div className="relative max-w-[1440px] mx-auto min-h-[800px] py-20">
        {/* Title - Centered */}
        <div className="text-center mb-16">
          <span className="text-blue-500 text-xs font-bold tracking-widest uppercase mb-2 block">Ferramentas Pro</span>
          <h2 className="text-4xl md:text-5xl font-extralight font-outfit text-white">
            IA que <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-medium">vende por você</span>
          </h2>
        </div>

        {/* Content Grid */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
          {/* Left Column: 4 Tools in 2x2 Grid */}
          <div className="w-full lg:w-1/2">
            <div className="grid grid-cols-2 gap-6">
              {proTools.map((tool, index) => {
                const Icon = tool.icon;
                const colors = colorClasses[tool.color];
                const isActive = index === activeTool;

                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(index)}
                    className={`
                    relative group text-left p-6 rounded-2xl border transition-all duration-300
                    ${isActive
                        ? `${colors.bg} ${colors.border} scale-[1.02] shadow-lg`
                        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                      }
                  `}
                  >
                    {/* Header: Icon + Tag */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-slate-950/60 border border-white/5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                        <Icon className={`w-6 h-6 ${isActive ? colors.icon : 'text-slate-400 group-hover:' + colors.icon}`} />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-950/60 text-slate-400 border border-white/5">
                        {tool.tag}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-lg font-bold mb-2 transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {tool.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {tool.description}
                    </p>

                    {/* Active indicator */}
                    {isActive && (
                      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full ${colors.bg} ${colors.border} border`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Image Preview */}
          <div className="w-full lg:w-1/2 flex items-center justify-center relative">
            {/* Glow effect */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${colorClasses[proTools[activeTool].color].bg
              }`} />

            {/* Image Card */}
            <div className="relative w-full max-w-[650px] bg-[#0F0F0F] border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-sm text-slate-500 ml-auto font-mono">{proTools[activeTool].title}</span>
              </div>

              {/* Image with transition */}
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-900">
                {proTools.map((tool, index) => (
                  <img
                    key={tool.id}
                    src={tool.image}
                    alt={tool.title}
                    className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ${index === activeTool ? 'opacity-100' : 'opacity-0'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/** Seção de Features - Módulos principais */
const FeaturesSection = () => (
  <section id="features" className="relative z-10 border-b border-white/5">
    {/* Content Container - 1440px */}
    <div className="max-w-[1440px] mx-auto py-24">
      <div className="text-center mb-16">
        <span className="text-blue-500 text-xs font-bold tracking-widest uppercase mb-2 block">Arquitetura de Vendas</span>
        <h2 className="text-4xl md:text-5xl font-extralight font-outfit mb-4">
          Os módulos que <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-medium">aceleram</span> seu ciclo
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: Database, title: 'CRM Completo', desc: 'Kanban, lista e grade. Filtros avançados e ações em massa.' },
          { icon: MessageSquare, title: 'WhatsApp Integrado', desc: 'Chat nativo com áudio, anexos e histórico unificado.' },
          { icon: Target, title: 'Tarefas e Follow-up', desc: 'Lembretes automáticos e checklist por oportunidade.' },
          { icon: Users, title: 'Gestão de Equipe', desc: 'Convites, papéis e dashboards de performance.' },
          { icon: BarChart2, title: 'Catálogo de Produtos', desc: 'Galeria, filtros e status de disponibilidade.' },
          { icon: Webhook, title: 'Automações', desc: 'Webhooks, API e conexão com marketing.' }
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-2xl p-8 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
              <Icon className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-medium mb-3">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/** Seção Produtividade - Kanban visual */
const ProductivitySection = () => (
  <section id="productivity" className="relative z-10 py-24 bg-[#080808] border-b border-white/5">
    <div className="container mx-auto px-6 md:px-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Kanban Visual */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 blur-3xl" />
          <div className="relative bg-[#0A0A0A] border border-white/10 rounded-xl p-6 shadow-2xl">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[
                { title: 'Novos', color: 'blue', tasks: ['Marina Silva - Interesse Alto', 'Tech Solutions - Proposta'] },
                { title: 'Em Andamento', color: 'cyan', tasks: ['Carlos Mendes - Reunião 15h', 'Global Corp - Documentos'] },
                { title: 'Concluído', color: 'emerald', tasks: ['Startup X - Fechado R$45k'] }
              ].map(({ title, color, tasks }) => (
                <div key={title} className="min-w-[200px] flex-shrink-0">
                  <div className={`flex items-center gap-2 mb-3`}>
                    <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
                    <span className="text-xs text-gray-600">{tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task, i) => (
                      <div key={i} className={`bg-white/5 hover:bg-white/10 border border-white/5 hover:border-${color}-500/30 rounded-lg p-3 text-sm text-gray-300 cursor-pointer transition-all`}>
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Texto */}
        <div>
          <span className="text-cyan-500 text-xs font-bold tracking-widest uppercase mb-2 block">Produtividade</span>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6 leading-tight">
            Organize tarefas com <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">clareza visual</span>
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Kanban intuitivo para gerenciar seu dia. Arraste cards, defina prioridades e nunca mais perca um follow-up importante.
          </p>
          <a href="#" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
            <span>Ver funcionalidades</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  </section>
);

/** Seção Mobile - Acesso pelo celular */
const MobileSection = () => (
  <section className="relative w-full bg-[#080808] overflow-hidden border-b border-white/5">
    {/* Background Ambience - Full Width */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_60%)] pointer-events-none" />

    {/* Content Container - 1440px */}
    <div className="relative max-w-[1440px] mx-auto min-h-[900px] flex flex-col lg:flex-row items-center justify-between py-20 px-6 lg:px-12 gap-16 lg:gap-0">

      {/* LEFT COLUMN: 3D PHONE MOCKUP */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative" style={{ perspective: '1000px' }}>

        {/* Glow Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[600px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none" />

        {/* 3D Phone Container */}
        <div
          className="relative transition-transform duration-700 ease-out hover:scale-105"
          style={{
            transform: 'rotateY(-8deg) rotateX(5deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Phone Frame */}
          <div className="w-[320px] h-[640px] bg-gradient-to-b from-gray-800 to-gray-900 border-[6px] border-gray-700 rounded-[3rem] p-2 relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8),0_30px_60px_-30px_rgba(59,130,246,0.3)]">

            {/* Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20 flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-800 border border-gray-700" />
              <div className="w-12 h-3 rounded-full bg-gray-800" />
            </div>

            {/* Screen */}
            <div className="w-full h-full bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden relative">

              {/* Dashboard Content */}
              <div className="p-5 pt-14 space-y-4">

                {/* Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-[10px]">Bem-vindo de volta</p>
                    <h3 className="font-bold text-white text-base">Bruno Silva</h3>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    BS
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 rounded-2xl text-white">
                  <p className="text-[10px] opacity-80 mb-1">Receita do Mês</p>
                  <p className="text-2xl font-bold">R$ 47.850</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUp className="w-3 h-3 text-green-300" />
                    <span className="text-[10px] text-green-300">+23% vs último mês</span>
                  </div>
                </div>

                {/* Mini Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <p className="text-[10px] text-gray-500">Leads Ativos</p>
                    <p className="text-lg font-bold text-white">48</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <p className="text-[10px] text-gray-500">Em Negociação</p>
                    <p className="text-lg font-bold text-white">12</p>
                  </div>
                </div>

                {/* Leads List */}
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Próximos Follow-ups</p>
                  <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border-l-2 border-green-500">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-[10px] font-bold">MS</div>
                    <div className="flex-1">
                      <p className="text-xs text-white font-medium">Marina Silva</p>
                      <p className="text-[10px] text-green-400">Hoje, 14:00</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border-l-2 border-yellow-500">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold">CT</div>
                    <div className="flex-1">
                      <p className="text-xs text-white font-medium">Carlos Tech</p>
                      <p className="text-[10px] text-yellow-400">Amanhã, 10:30</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="absolute bottom-0 w-full h-14 bg-black/90 backdrop-blur-xl border-t border-white/5 flex justify-around items-center">
                <div className="flex flex-col items-center gap-1">
                  <Home className="w-5 h-5 text-blue-500" />
                  <span className="text-[8px] text-blue-500">Início</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Target className="w-5 h-5 text-gray-500" />
                  <span className="text-[8px] text-gray-500">Pipeline</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                  <span className="text-[8px] text-gray-500">Chat</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-[8px] text-gray-500">Perfil</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reflection Effect */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[280px] h-[100px] bg-gradient-to-b from-blue-500/10 to-transparent blur-2xl rounded-full" />
        </div>
      </div>

      {/* RIGHT COLUMN: CONTENT */}
      <div className="w-full lg:w-2/5 flex flex-col items-start text-left z-20">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
          <Sparkles size={12} />
          <span>100% Responsivo</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-extralight font-outfit text-white mb-6 leading-[1.1]">
          Seu CRM no <br />
          <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
            bolso
          </span>
        </h2>

        <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
          Acesse o Azera de qualquer lugar, direto do navegador do seu celular. Sem precisar instalar nada, você gerencia leads, responde mensagens e acompanha suas vendas em tempo real.
        </p>

        <div className="space-y-6 w-full">
          {[
            { icon: Target, title: "Pipeline na Palma da Mão", desc: "Arraste e mova leads entre etapas com um toque." },
            { icon: MessageSquare, title: "WhatsApp Integrado", desc: "Responda seus leads sem sair da plataforma." },
            { icon: TrendingUp, title: "Métricas em Tempo Real", desc: "Acompanhe vendas, metas e performance onde estiver." }
          ].map((feature, i) => (
            <div key={i} className="flex gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors duration-300">
                <feature.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1 group-hover:text-blue-400 transition-colors">{feature.title}</h4>
                <p className="text-sm text-gray-500 leading-snug">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);



/** Seção Recursos Completos - Tudo em um só lugar */
const FullFeaturesSection = () => {
  const features = [
    {
      icon: Target,
      title: 'Campos Customizados',
      description: '15+ tipos de campos (texto, número, data, lista, arquivo, etc.) para adaptar completamente ao seu negócio.',
      gradient: 'from-violet-500 to-purple-600',
      hoverBorder: 'hover:border-violet-500/50',
      shadow: 'shadow-violet-500/5',
      hoverShadow: 'group-hover:shadow-violet-500/40',
      hoverText: 'group-hover:text-violet-300',
      progressGradient: 'from-violet-500 to-purple-500'
    },
    {
      icon: Smartphone,
      title: '100% Responsivo',
      description: 'Interface otimizada para desktop, tablet e mobile. Trabalhe de qualquer lugar com sincronização em tempo real.',
      gradient: 'from-cyan-500 to-blue-600',
      hoverBorder: 'hover:border-cyan-500/50',
      shadow: 'shadow-cyan-500/5',
      hoverShadow: 'group-hover:shadow-cyan-500/40',
      hoverText: 'group-hover:text-cyan-300',
      progressGradient: 'from-cyan-500 to-blue-500'
    },
    {
      icon: Shield,
      title: 'Segurança Máxima',
      description: 'Row Level Security (RLS), criptografia end-to-end, backups automáticos diários e isolamento multi-tenant.',
      gradient: 'from-amber-500 to-orange-600',
      hoverBorder: 'hover:border-amber-500/50',
      shadow: 'shadow-amber-500/5',
      hoverShadow: 'group-hover:shadow-amber-500/40',
      hoverText: 'group-hover:text-amber-300',
      progressGradient: 'from-amber-500 to-orange-500'
    },
    {
      icon: Clock,
      title: 'Gestão de Tarefas',
      description: 'Kanban, checklists, prazos, anexos e lembretes. Tudo integrado aos leads e processos.',
      gradient: 'from-rose-500 to-pink-600',
      hoverBorder: 'hover:border-rose-500/50',
      shadow: 'shadow-rose-500/5',
      hoverShadow: 'group-hover:shadow-rose-500/40',
      hoverText: 'group-hover:text-rose-300',
      progressGradient: 'from-rose-500 to-pink-500'
    },
    {
      icon: Globe,
      title: 'Integrações Ilimitadas',
      description: 'Webhooks, API REST, n8n, Zapier, WhatsApp Business e Facebook Lead Ads nativos.',
      gradient: 'from-indigo-500 to-cyan-600',
      hoverBorder: 'hover:border-indigo-500/50',
      shadow: 'shadow-indigo-500/5',
      hoverShadow: 'group-hover:shadow-indigo-500/40',
      hoverText: 'group-hover:text-indigo-300',
      progressGradient: 'from-indigo-500 to-cyan-500'
    },
    {
      icon: TrendingUp,
      title: 'Relatórios em Tempo Real',
      description: 'Dashboards dinâmicos, métricas de conversão, análise por vendedor e exportação para Excel.',
      gradient: 'from-emerald-500 to-teal-600',
      hoverBorder: 'hover:border-emerald-500/50',
      shadow: 'shadow-emerald-500/5',
      hoverShadow: 'group-hover:shadow-emerald-500/40',
      hoverText: 'group-hover:text-emerald-300',
      progressGradient: 'from-emerald-500 to-teal-500'
    }
  ];

  return (
    <motion.section
      className="w-full px-6 py-20 relative overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      viewport={{ once: true }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-600/20 to-rose-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '6s' }} />
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
            Recursos Completos
          </motion.div>

          <motion.h2
            className="text-5xl md:text-7xl font-extralight font-outfit bg-gradient-to-r from-white via-violet-200 to-purple-200 bg-clip-text text-transparent mb-8 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Tudo em um só lugar
          </motion.h2>

          <motion.p
            className="text-lg text-slate-300 max-w-4xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            CRM completo, universal e escalável para qualquer tipo de negócio.<br />
            <span className="text-violet-400 font-semibold">Sem complexidade, com resultados reais.</span>
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                className={`group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-10 ${feature.hoverBorder} transition-all duration-700 overflow-hidden shadow-2xl ${feature.shadow}`}
                initial={{ opacity: 0, y: 50, rotateX: 15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.1 * index }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  rotateY: index % 2 === 0 ? 5 : -5,
                  z: 50,
                  transition: { duration: 0.3 }
                }}
                style={{ perspective: "1000px" }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient.replace('from-', 'from-').replace('to-', 'to-')}/10 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl`} />
                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${feature.gradient}/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                <div className="relative z-10">
                  <motion.div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-8 shadow-2xl ${feature.hoverShadow} transition-shadow duration-300`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className={`text-xl font-light text-white mb-4 ${feature.hoverText} transition-colors duration-300 font-outfit`}>{feature.title}</h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed text-sm">{feature.description}</p>
                  <div className={`mt-6 w-0 group-hover:w-full h-1 bg-gradient-to-r ${feature.progressGradient} transition-all duration-700 rounded-full`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

/** Seção Pricing - Planos */
const PricingSection = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqItems = [
    {
      question: 'Posso testar antes de assinar?',
      answer: 'Sim! Oferecemos 7 dias grátis em qualquer plano. Teste todas as funcionalidades sem compromisso e sem precisar de cartão de crédito.'
    },
    {
      question: 'Posso cancelar quando quiser?',
      answer: 'Sim, cancele a qualquer momento pelo portal do cliente, sem multas e sem burocracia. Seus dados ficam disponíveis por 30 dias após o cancelamento.'
    },
    {
      question: 'Vocês oferecem suporte?',
      answer: 'Sim! Todos os planos incluem suporte por chat e email. Planos Pro e Enterprise têm suporte prioritário com tempo de resposta reduzido.'
    },
    {
      question: 'Posso migrar meus dados de outro CRM?',
      answer: 'Claro! Nossa equipe ajuda você a importar leads, contatos e negociações de qualquer CRM ou planilha. O processo é rápido e gratuito.'
    },
    {
      question: 'Como funciona o WhatsApp integrado?',
      answer: 'Conecte seu WhatsApp em segundos via QR Code. Todas as conversas ficam centralizadas no Azera, com histórico, automações e templates disponíveis.'
    },
    {
      question: 'Minhas informações estão seguras?',
      answer: 'Absolutamente. Usamos criptografia de ponta, servidores seguros, backups automáticos e isolamento de dados por empresa (multi-tenant).'
    }
  ];

  return (
    <>
      <motion.section
        id="pricing"
        className="w-full px-6 py-24 bg-gradient-to-b from-slate-950/30 to-black"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              className="text-5xl md:text-7xl font-extralight font-outfit bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent mb-8 leading-tight tracking-tight"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Planos para todos os tamanhos
            </motion.h2>

            <motion.p
              className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Escolha o plano ideal para o seu negócio. Sem taxas ocultas.<br />
              <span className="text-blue-400 font-semibold animate-pulse">
                7 dias grátis para testar!
              </span>
            </motion.p>
          </div>

          {/* Banner Promocional */}
          <motion.div
            className="mb-16 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-[2px]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 animate-pulse opacity-50" />
              <div className="relative bg-slate-950/95 backdrop-blur-xl rounded-3xl p-8 md:p-10">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <motion.div
                    className="flex-shrink-0"
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/30">
                      <Zap className="w-10 h-10 text-white fill-white" />
                    </div>
                  </motion.div>

                  <div className="flex-1 text-center lg:text-left">
                    <motion.div
                      className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-300 text-sm font-bold mb-4"
                      animate={{ boxShadow: ["0 0 0 0 rgba(234, 179, 8, 0)", "0 0 0 8px rgba(234, 179, 8, 0)"] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      🎉 OFERTA DE LANÇAMENTO
                    </motion.div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 font-outfit">
                      De <span className="line-through text-slate-400">R$ 80</span> por apenas <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">R$ 50/mês</span>
                    </h3>
                    <p className="text-base text-slate-300 max-w-2xl">
                      Aproveite o lançamento do Azera CRM e garanta <span className="text-white font-semibold">R$ 50/mês</span> em vez de R$ 80.
                      Automações ilimitadas, suporte prioritário e todos os recursos Pro.
                    </p>
                  </div>

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
                      Ativar Oferta
                    </motion.a>
                    <p className="text-center text-sm text-slate-400 mt-3">Vagas limitadas</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Desktop Layout: All 5 plans side by side */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
            {/* Grátis */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all">
              <h3 className="text-lg font-medium text-white mb-1">Grátis</h3>
              <p className="text-xs text-gray-400 mb-4 h-8">Experimente o Azera sem compromisso.</p>
              <div className="text-3xl font-light text-white mb-6">R$ 0</div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Até 100 leads</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Até 5 produtos</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Tarefas ilimitadas</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> 1 membro na equipe</li>
              </ul>
              <Link to="/login" className="block w-full py-2.5 border border-white/30 text-white text-center rounded-lg text-sm font-medium transition-all hover:bg-white/10">
                Começar Grátis
              </Link>
            </div>

            {/* Mensal */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all">
              <h3 className="text-lg font-medium text-white mb-1">Mensal</h3>
              <p className="text-xs text-gray-400 mb-4 h-8">Flexibilidade máxima, pague mês a mês.</p>
              <div className="mb-6">
                <span className="text-3xl font-light text-white">R$ 80</span>
                <span className="text-sm text-gray-500">/ mês</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Equipe ilimitada</li>
              </ul>
              <Link to="/login" className="block w-full py-2.5 bg-white text-black text-center rounded-lg text-sm font-medium transition-all hover:bg-gray-200">
                Assinar Mensal
              </Link>
            </div>

            {/* Semestral */}
            <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-6 relative hover:border-emerald-500/50 transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[10px] font-bold">
                Economize 12%
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Semestral</h3>
              <p className="text-xs text-gray-400 mb-4 h-8">Economize 12% no plano semestral.</p>
              <div className="mb-6">
                <span className="text-3xl font-light text-white">R$ 70</span>
                <span className="text-sm text-gray-500">/ mês</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Equipe ilimitada</li>
              </ul>
              <Link to="/login" className="block w-full py-2.5 bg-emerald-500 text-white text-center rounded-lg text-sm font-medium transition-all hover:bg-emerald-600">
                Assinar Semestral
              </Link>
            </div>

            {/* Anual - DESTAQUE */}
            <div className="relative p-[2px] rounded-2xl scale-[1.02] z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg z-10 whitespace-nowrap">
                ⭐ Melhor custo-benefício
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse rounded-2xl"></div>
              <div className="relative bg-[#0a0a0a] rounded-2xl p-6">
                <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">Anual</h3>
                <p className="text-xs text-gray-400 mb-4 h-8">Melhor custo-benefício, economize 25%.</p>
                <div className="mb-6">
                  <span className="text-3xl font-light text-white">R$ 65</span>
                  <span className="text-sm text-gray-500">/ mês</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Leads ilimitados</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> WhatsApp integrado</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Automações e IA</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Catálogo completo</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Relatórios avançados</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Equipe ilimitada</li>
                </ul>
                <Link to="/login" className="block w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center rounded-lg text-sm font-medium transition-all hover:opacity-90 shadow-lg shadow-blue-500/25">
                  Assinar Anual
                </Link>
              </div>
            </div>

            {/* Enterprise - DESTAQUE */}
            <div className="relative p-[2px] rounded-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-0.5 rounded-full text-[10px] font-bold z-10">
                White Label
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-50"></div>
              <div className="relative bg-[#0a0a0a] rounded-2xl p-6">
                <h3 className="text-lg font-medium text-amber-400 mb-1">Enterprise</h3>
                <p className="text-xs text-gray-400 mb-4 h-8">CRM White Label personalizado.</p>
                <div className="text-2xl font-light text-white mb-6">Sob Consulta</div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> CRM White Label</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Estrutura personalizada</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Implementação sob medida</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Suporte dedicado</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Integrações customizadas</li>
                </ul>
                <a href="https://wa.me/5531991318312?text=Olá, tenho interesse no plano Enterprise" target="_blank" rel="noopener noreferrer" className="block w-full py-2.5 border border-amber-500/50 text-amber-400 text-center rounded-lg text-sm font-medium transition-all hover:bg-amber-500/10">
                  Entrar em Contato
                </a>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-6">
            {/* Grátis - Full width */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-white mb-1">Grátis</h3>
              <p className="text-xs text-gray-400 mb-4">Experimente o Azera sem compromisso.</p>
              <div className="text-3xl font-light text-white mb-6">R$ 0</div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Até 100 leads</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Até 5 produtos</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Tarefas ilimitadas</li>
                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> 1 membro na equipe</li>
              </ul>
              <Link to="/login" className="block w-full py-3 border border-white/30 text-white text-center rounded-lg font-medium transition-all hover:bg-white/10">
                Começar Grátis
              </Link>
            </div>

            {/* Carousel for paid plans */}
            <div className="overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {/* Mensal */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-w-[280px] snap-center">
                  <h3 className="text-lg font-medium text-white mb-1">Mensal</h3>
                  <p className="text-xs text-gray-400 mb-4">Flexibilidade máxima, pague mês a mês.</p>
                  <div className="mb-6">
                    <span className="text-3xl font-light text-white">R$ 80</span>
                    <span className="text-sm text-gray-500">/ mês</span>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Equipe ilimitada</li>
                  </ul>
                  <Link to="/login" className="block w-full py-3 bg-white text-black text-center rounded-lg font-medium transition-all hover:bg-gray-200">
                    Assinar Mensal
                  </Link>
                </div>

                {/* Semestral */}
                <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-6 min-w-[280px] snap-center relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                    Economize 12%
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">Semestral</h3>
                  <p className="text-xs text-gray-400 mb-4">Economize 12% no plano semestral.</p>
                  <div className="mb-6">
                    <span className="text-3xl font-light text-white">R$ 70</span>
                    <span className="text-sm text-gray-500">/ mês</span>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Leads ilimitados</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Automações e IA</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Catálogo completo</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Relatórios avançados</li>
                    <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-emerald-400" /> Equipe ilimitada</li>
                  </ul>
                  <Link to="/login" className="block w-full py-3 bg-emerald-500 text-white text-center rounded-lg font-medium transition-all hover:bg-emerald-600">
                    Assinar Semestral
                  </Link>
                </div>

                {/* Anual - DESTAQUE */}
                <div className="relative p-[2px] rounded-2xl min-w-[280px] snap-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-0.5 rounded-full text-xs font-bold z-10">
                    ⭐ Melhor custo-benefício
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl"></div>
                  <div className="relative bg-[#0a0a0a] rounded-2xl p-6">
                    <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">Anual</h3>
                    <p className="text-xs text-gray-400 mb-4">Melhor custo-benefício, economize 25%.</p>
                    <div className="mb-6">
                      <span className="text-3xl font-light text-white">R$ 65</span>
                      <span className="text-sm text-gray-500">/ mês</span>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Leads ilimitados</li>
                      <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> WhatsApp integrado</li>
                      <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Automações e IA</li>
                      <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Catálogo completo</li>
                      <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Relatórios avançados</li>
                      <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-blue-400" /> Equipe ilimitada</li>
                    </ul>
                    <Link to="/login" className="block w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center rounded-lg font-medium transition-all hover:opacity-90">
                      Assinar Anual
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="flex justify-center">
              <span className="text-xs text-gray-500">← Deslize para ver mais planos →</span>
            </div>

            {/* Enterprise - Full width */}
            <div className="relative p-[2px] rounded-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-0.5 rounded-full text-xs font-bold z-10">
                White Label
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-50"></div>
              <div className="relative bg-[#0a0a0a] rounded-2xl p-6">
                <h3 className="text-lg font-medium text-amber-400 mb-1">Enterprise</h3>
                <p className="text-xs text-gray-400 mb-4">CRM White Label personalizado para sua empresa.</p>
                <div className="text-2xl font-light text-white mb-6">Sob Consulta</div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> CRM White Label</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Estrutura personalizada</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Implementação sob medida</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Suporte dedicado</li>
                  <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-amber-400" /> Integrações customizadas</li>
                </ul>
                <a href="https://wa.me/5531991318312?text=Olá, tenho interesse no plano Enterprise" target="_blank" rel="noopener noreferrer" className="block w-full py-3 border border-amber-500/50 text-amber-400 text-center rounded-lg font-medium transition-all hover:bg-amber-500/10">
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
            <h2 className="text-4xl md:text-5xl font-extralight font-outfit text-white mb-6">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-lg font-light text-white pr-4 font-outfit">
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
            <h2 className="text-5xl md:text-6xl font-extralight font-outfit text-white mb-4 leading-tight">
              Fale Conosco
            </h2>

            <motion.p
              className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Dúvidas, sugestões ou parcerias?<br />
              <span className="text-emerald-400 font-semibold animate-pulse">Estamos aqui para ajudar!</span>
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
              <p className="text-slate-300 mb-10 text-center text-xl font-light font-outfit">
                Entre em contato pelo canal que preferir
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
                  <div className="text-slate-400 text-sm font-medium mb-2">E-mail</div>
                  <a href="mailto:coordenacaoheavens@gmail.com" className="text-white hover:text-emerald-400 transition-colors text-base block">
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
                  <div className="text-slate-400 text-sm font-medium mb-2">WhatsApp</div>
                  <a href="https://wa.me/5531991318312" className="text-white hover:text-cyan-400 transition-colors text-base block" target="_blank" rel="noopener noreferrer">
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
                  <div className="text-slate-400 text-sm font-medium mb-2">Horário de Atendimento</div>
                  <div className="text-white text-base">Seg-Sex: 9h às 18h</div>
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
                  Iniciar Conversa no WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

/** Footer Animado */
const Footer = () => (
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
          <motion.div
            className="flex items-center gap-2 mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-xl">A</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Azera</span>
          </motion.div>
          <p className="text-slate-300 text-base leading-relaxed">
            Transformando a forma como você gerencia vendas e clientes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <h4 className="text-white font-light mb-6 text-lg">Produto</h4>
          <ul className="space-y-3 text-slate-400">
            <li>
              <motion.a href="#features" className="hover:text-cyan-400 transition-colors duration-300 text-base" whileHover={{ x: 5 }}>
                Funcionalidades
              </motion.a>
            </li>
            <li>
              <motion.a href="#pricing" className="hover:text-cyan-400 transition-colors duration-300 text-base" whileHover={{ x: 5 }}>
                Planos
              </motion.a>
            </li>
            <li>
              <motion.div whileHover={{ x: 5 }}>
                <Link to="/login" className="hover:text-cyan-400 transition-colors duration-300 text-base">
                  Entrar
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
          <h4 className="text-white font-light mb-6 text-lg">Empresa</h4>
          <ul className="space-y-3 text-slate-400">
            <li>
              <motion.div whileHover={{ x: 5 }}>
                <Link to="/sobre-nos" className="hover:text-emerald-400 transition-colors duration-300 text-base">
                  Sobre Nós
                </Link>
              </motion.div>
            </li>
            <li>
              <motion.a href="#contato" className="hover:text-emerald-400 transition-colors duration-300 text-base" whileHover={{ x: 5 }}>
                Contato
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
          <h4 className="text-white font-light mb-6 text-lg">Legal</h4>
          <ul className="space-y-3 text-slate-400">
            <li>
              <motion.div whileHover={{ x: 5 }}>
                <Link to="/politica-privacidade" className="hover:text-blue-400 transition-colors duration-300 text-base">
                  Política de Privacidade
                </Link>
              </motion.div>
            </li>
            <li>
              <motion.div whileHover={{ x: 5 }}>
                <Link to="/termos-uso" className="hover:text-blue-400 transition-colors duration-300 text-base">
                  Termos de Uso
                </Link>
              </motion.div>
            </li>
            <li>
              <motion.div whileHover={{ x: 5 }}>
                <Link to="/lgpd" className="hover:text-blue-400 transition-colors duration-300 text-base">
                  LGPD
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
          © {new Date().getFullYear()} Azera CRM. Todos os direitos reservados.
        </div>
        <div className="flex gap-6 text-base">
          <motion.div whileHover={{ scale: 1.05 }}>
            <Link to="/politica-privacidade" className="text-slate-400 hover:text-cyan-400 transition-colors duration-300">
              Privacidade
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Link to="/termos-uso" className="text-slate-400 hover:text-cyan-400 transition-colors duration-300">
              Termos
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  </footer>
);


// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function TesteLandingPage() {
  return (
    <div className="bg-[#050505] min-h-screen relative selection:bg-blue-500 selection:text-white pb-0 font-inter text-white overflow-x-hidden">
      {/* CSS Customizado */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap');

        .font-inter { font-family: 'Inter', sans-serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 7s ease-in-out infinite 1s; }

        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll { animation: scroll 30s linear infinite; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      <Header />
      <HeroSection />
      <DashboardSection />
      <AIAgentsSection />
      <TimelineSection />
      <GamificationSection />
      <CommandCenterSection />
      <FeaturesSection />
      <MobileSection />
      <FullFeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
