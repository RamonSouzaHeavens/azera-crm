// =====================================================
// DATA: Preset para Agências de Marketing Digital
// Focado em contratos recorrentes, onboarding e serviços digitais
// =====================================================

import type { PresetConfig, CustomFieldPreset, PlaybookPreset, PipelineStagePreset } from '../../services/presetService'

// Pipeline de Vendas Consultivas
export const MARKETING_PIPELINE_STAGES: PipelineStagePreset[] = [
  { key: 'novo_lead', label: 'Novo Lead (Inbound)', color: '#3B82F6', order: 0 },
  { key: 'qualificacao', label: 'Qualificação', color: '#60A5FA', order: 1 },
  { key: 'reuniao_agendada', label: 'Reunião Agendada', color: '#8B5CF6', order: 2 },
  { key: 'briefing', label: 'Briefing Coletado', color: '#A855F7', order: 3 },
  { key: 'proposta', label: 'Proposta Apresentada', color: '#F59E0B', order: 4 },
  { key: 'negociacao', label: 'Em Negociação', color: '#F97316', order: 5 },
  { key: 'contrato', label: 'Contrato Enviado', color: '#14B8A6', order: 6 },
  { key: 'onboarding', label: 'Onboarding Iniciado', color: '#10B981', order: 7 },
  { key: 'perdido', label: 'Perdido', color: '#EF4444', order: 8 }
]

// Campos para Leads (Potenciais Clientes)
export const MARKETING_LEAD_FIELDS: CustomFieldPreset[] = [
  // Grupo: Negócio
  {
    field_key: 'nicho_mercado',
    field_label: 'Nicho de Mercado',
    field_type: 'text',
    field_group: 'Negócio',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'site_atual',
    field_label: 'Site / Instagram',
    field_type: 'url',
    field_group: 'Negócio',
    display_order: 2,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'investimento_atual',
    field_label: 'Investimento Mensal em Mídia',
    field_type: 'currency',
    field_group: 'Negócio',
    field_placeholder: 'Valor investido atualmente',
    display_order: 3,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  // Grupo: Qualificação
  {
    field_key: 'faturamento_estimado',
    field_label: 'Faturamento Estimado',
    field_type: 'select',
    field_options: ['Até 10k', '10k-50k', '50k-100k', '100k-500k', 'Acima de 500k'],
    field_group: 'Qualificação',
    display_order: 4,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'servicos_interesse',
    field_label: 'Serviços de Interesse',
    field_type: 'multiselect',
    field_options: ['Tráfego Pago', 'Social Media', 'SEO', 'Web Design', 'Inbound', 'Lançamentos', 'Branding'],
    field_group: 'Qualificação',
    display_order: 5,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  // Grupo: Dores
  {
    field_key: 'maior_desafio',
    field_label: 'Maior Desafio Atual',
    field_type: 'textarea',
    field_group: 'Dores',
    field_placeholder: 'Falta de leads, vendas baixas, falta de posicionamento...',
    display_order: 6,
    required: false,
    show_in_list: false,
    show_in_filters: false
  }
]

// Campos para Produtos/Serviços
export const MARKETING_PRODUCT_FIELDS: CustomFieldPreset[] = [
  {
    field_key: 'tipo_contrato',
    field_label: 'Tipo de Contrato',
    field_type: 'select',
    field_options: ['Fee Mensal (Recorrente)', 'Pontual (Job)', 'Consultoria', 'Performance (%)'],
    field_group: 'Comercial',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'escopo_detalhado',
    field_label: 'Escopo do Serviço',
    field_type: 'textarea',
    field_group: 'Escopo',
    field_placeholder: 'Descreva o que está e não está incluso',
    display_order: 2,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'setup_inicial',
    field_label: 'Valor de Setup/Implementação',
    field_type: 'currency',
    field_group: 'Comercial',
    display_order: 3,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'entregaveis_mensais',
    field_label: 'Entregáveis Mensais',
    field_type: 'multiselect',
    field_options: ['Relatório de Performance', '4 Posts Semanais', 'Gestão de Campanhas', 'Reunião Mensal', 'Artigos Blog'],
    field_group: 'Escopo',
    display_order: 4,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'ferramentas_necessarias',
    field_label: 'Ferramentas Necessárias (Custo Cliente)',
    field_type: 'text',
    field_group: 'Técnico',
    field_placeholder: 'Ex: RD Station, Hosting, Verba de Mídia',
    display_order: 5,
    required: false,
    show_in_list: false,
    show_in_filters: false
  }
]

// Playbooks para Agências
export const MARKETING_PLAYBOOKS: PlaybookPreset[] = [
  {
    name: 'Briefing Inicial (Call)',
    category: 'scripts',
    content: `## 📝 Roteiro de Briefing Inicial

**Objetivo:** Coletar informações para montar a proposta

---

### 1. Visão Geral
- "Como está o marketing da empresa hoje?"
- "O que já foi feito que deu certo? E o que deu errado?"
- "Quem são seus principais concorrentes hoje?"

### 2. Metas e Expectativas
- "Qual a meta de faturamento/leads para os próximos 6 meses?"
- "Quanto vocês estão dispostos a investir em mídia (ads) mensais?"
- "O que seria um 'sucesso absoluto' pra você nessa parceria?"

### 3. Público e Oferta
- "Quem é o cliente ideal (persona)?"
- "Qual o produto/serviço carro-chefe?"
- "Qual o diferencial de vocês frente aos concorrentes?"

### 4. Processo Comercial
- "Se eu te entregar 50 leads hoje, como seu time atende?"
- "Usam algum CRM atualmente?"`,
    order: 1
  },
  {
    name: 'Apresentação de Proposta',
    category: 'scripts',
    content: `## 🚀 Script de Apresentação de Proposta

**Estrutura da Reunião:**

1. **Recap do Problema (5 min)**
   "Baseado no que conversamos, o principal desafio hoje é [PROBLEMA] que está impedindo vocês de [META]. Correto?"

2. **A Solução (10 min)**
   "Para resolver isso, desenhamos uma estratégia em 3 pilares:
   - Pilar 1: [Atração - Tráfego]
   - Pilar 2: [Conversão - Landing Page]
   - Pilar 3: [Retenção - Email/Social]"

3. **O Investimento (5 min)**
   "Para executar tudo isso, teremos um time multidisciplinar alocado."
   (Apresentar valor ancorado no retorno esperado)

4. **Fechamento**
   "Faz sentido começarmos esse trabalho agora em [MÊS] para já colhermos resultados em [PRAZO]?"`,
    order: 2
  },
  {
    name: 'Qualificação de Lead (SDR)',
    category: 'scripts',
    content: `## 🎯 Qualificação Rápida

**Validar se o lead tem Fit**

1. "Qual o faturamento mensal aproximado da empresa hoje?" (Validar porte)
2. "Já investem em marketing digital ou seria a primeira vez?" (Validar maturidade)
3. "Qual a urgência para começar esse projeto?" (Validar timing)
4. "Você é o responsável por essa decisão?" (Validar autoridade)

**Se não tiver perfil:**
"Fulano, sendo bem transparente, para o estágio atual de vocês, nossa agência talvez não seja o melhor custo-benefício. Recomendo começar com [SOLUÇÃO MAIS BARATA/CURSO]. Quando atingirem [MARCO], voltem a nos procurar!"`,
    order: 3
  }
]

export const MARKETING_PRESET: PresetConfig = {
  id: 'digial_marketing_agency',
  name: 'Agência de Marketing',
  description: 'Para agências digitais, gestores de tráfego e social media. Foco em contratos recorrentes e briefings.',
  icon: '🚀',
  category: 'services',
  pipelineStages: MARKETING_PIPELINE_STAGES,
  leadCustomFields: MARKETING_LEAD_FIELDS,
  productCustomFields: MARKETING_PRODUCT_FIELDS,
  playbooks: MARKETING_PLAYBOOKS
}
