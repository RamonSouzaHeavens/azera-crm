// =====================================================
// DATA: Preset para Vendas B2B e Serviços Profissionais
// Um preset generalista para consultorias, agências,
// freelancers e prestadores de serviço
// =====================================================

import type { PresetConfig, CustomFieldPreset, PlaybookPreset, PipelineStagePreset } from '../../services/presetService'

// Pipeline de Vendas B2B
export const B2B_PIPELINE_STAGES: PipelineStagePreset[] = [
  { key: 'novo_lead', label: 'Novo Lead', color: '#6366F1', order: 0 },
  { key: 'primeiro_contato', label: 'Primeiro Contato', color: '#8B5CF6', order: 1 },
  { key: 'descoberta', label: 'Descoberta', color: '#A855F7', order: 2 },
  { key: 'proposta', label: 'Proposta Enviada', color: '#F59E0B', order: 3 },
  { key: 'negociacao', label: 'Em Negociação', color: '#EAB308', order: 4 },
  { key: 'fechamento', label: 'Fechamento', color: '#10B981', order: 5 },
  { key: 'ganho', label: 'Ganho', color: '#22C55E', order: 6 },
  { key: 'perdido', label: 'Perdido', color: '#EF4444', order: 7 }
]

// Campos Personalizados para Leads (Perfil do Cliente)
export const B2B_LEAD_FIELDS: CustomFieldPreset[] = [
  // Grupo: Empresa
  {
    field_key: 'empresa',
    field_label: 'Empresa',
    field_type: 'text',
    field_group: 'Empresa',
    field_placeholder: 'Nome da empresa',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'cargo',
    field_label: 'Cargo',
    field_type: 'text',
    field_group: 'Empresa',
    field_placeholder: 'Ex: Diretor de Marketing',
    display_order: 2,
    required: false,
    show_in_list: true,
    show_in_filters: false
  },
  {
    field_key: 'setor',
    field_label: 'Setor/Indústria',
    field_type: 'select',
    field_options: ['Tecnologia', 'Varejo', 'Serviços', 'Indústria', 'Saúde', 'Educação', 'Financeiro', 'Agro', 'Construção', 'Outro'],
    field_group: 'Empresa',
    display_order: 3,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'porte_empresa',
    field_label: 'Porte da Empresa',
    field_type: 'select',
    field_options: ['MEI', 'ME', 'EPP', 'Média', 'Grande'],
    field_group: 'Empresa',
    display_order: 4,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'funcionarios',
    field_label: 'Nº de Funcionários',
    field_type: 'select',
    field_options: ['1-10', '11-50', '51-200', '201-500', '500+'],
    field_group: 'Empresa',
    display_order: 5,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  // Grupo: Qualificação
  {
    field_key: 'orcamento',
    field_label: 'Orçamento Disponível',
    field_type: 'select',
    field_options: ['Até R$ 5k', 'R$ 5k - R$ 20k', 'R$ 20k - R$ 50k', 'R$ 50k - R$ 100k', 'Acima de R$ 100k'],
    field_group: 'Qualificação',
    display_order: 6,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'decisor',
    field_label: 'É o Decisor?',
    field_type: 'boolean',
    field_group: 'Qualificação',
    display_order: 7,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'urgencia',
    field_label: 'Urgência',
    field_type: 'select',
    field_options: ['Imediato', '1-2 semanas', '1 mês', '3 meses', 'Sem prazo'],
    field_group: 'Qualificação',
    display_order: 8,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'necessidade_principal',
    field_label: 'Necessidade Principal',
    field_type: 'textarea',
    field_group: 'Qualificação',
    field_placeholder: 'Descreva o principal problema ou necessidade',
    display_order: 9,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  // Grupo: Origem
  {
    field_key: 'como_conheceu',
    field_label: 'Como nos conheceu?',
    field_type: 'select',
    field_options: ['Google', 'LinkedIn', 'Instagram', 'Indicação', 'Evento', 'Outbound', 'Site', 'Outro'],
    field_group: 'Origem',
    display_order: 10,
    required: false,
    show_in_list: false,
    show_in_filters: true
  }
]

// Campos Personalizados para Produtos/Serviços
export const B2B_PRODUCT_FIELDS: CustomFieldPreset[] = [
  // Grupo: Detalhes do Serviço
  {
    field_key: 'tipo_servico',
    field_label: 'Tipo de Serviço',
    field_type: 'select',
    field_options: ['Consultoria', 'Desenvolvimento', 'Design', 'Marketing', 'Treinamento', 'Suporte', 'Assinatura', 'Projeto', 'Outro'],
    field_group: 'Detalhes',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'modalidade',
    field_label: 'Modalidade',
    field_type: 'select',
    field_options: ['Presencial', 'Remoto', 'Híbrido'],
    field_group: 'Detalhes',
    display_order: 2,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'duracao_estimada',
    field_label: 'Duração Estimada',
    field_type: 'select',
    field_options: ['1 semana', '2 semanas', '1 mês', '2-3 meses', '6 meses', '1 ano', 'Contínuo'],
    field_group: 'Detalhes',
    display_order: 3,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  // Grupo: Comercial
  {
    field_key: 'modelo_cobranca',
    field_label: 'Modelo de Cobrança',
    field_type: 'select',
    field_options: ['Projeto', 'Hora', 'Mensal', 'Anual', 'Resultado'],
    field_group: 'Comercial',
    display_order: 4,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'valor_hora',
    field_label: 'Valor/Hora',
    field_type: 'currency',
    field_group: 'Comercial',
    field_placeholder: 'Ex: 150',
    display_order: 5,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'horas_estimadas',
    field_label: 'Horas Estimadas',
    field_type: 'number',
    field_group: 'Comercial',
    field_placeholder: 'Ex: 40',
    display_order: 6,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  // Grupo: Entregáveis
  {
    field_key: 'entregaveis',
    field_label: 'Entregáveis',
    field_type: 'textarea',
    field_group: 'Entregáveis',
    field_placeholder: 'Liste os principais entregáveis',
    display_order: 7,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'tecnologias',
    field_label: 'Tecnologias/Ferramentas',
    field_type: 'multiselect',
    field_options: ['Figma', 'WordPress', 'React', 'Node.js', 'Python', 'Meta Ads', 'Google Ads', 'SEO', 'Outro'],
    field_group: 'Entregáveis',
    display_order: 8,
    required: false,
    show_in_list: false,
    show_in_filters: true
  }
]

// Playbooks de Vendas B2B
export const B2B_PLAYBOOKS: PlaybookPreset[] = [
  {
    name: 'Qualificação BANT',
    category: 'scripts',
    content: `## 💼 Framework BANT para Qualificação

**Objetivo:** Qualificar leads rapidamente usando o método BANT

---

### B - Budget (Orçamento)
- "Vocês já têm um orçamento definido para esse projeto?"
- "Qual a faixa de investimento que estão considerando?"
- "Esse projeto está no planejamento financeiro deste ano?"

### A - Authority (Autoridade)
- "Quem mais está envolvido nessa decisão?"
- "Você é o responsável final pela aprovação?"
- "Como funciona o processo de aprovação aí na empresa?"

### N - Need (Necessidade)
- "Qual o principal problema que vocês querem resolver?"
- "Como isso impacta os resultados da empresa hoje?"
- "Já tentaram outras soluções? O que funcionou/não funcionou?"

### T - Timeline (Prazo)
- "Vocês têm uma data para começar?"
- "Existe algum evento ou deadline que está direcionando isso?"
- "Qual seria o prazo ideal para ver resultados?"

---

### 🚦 Classificação do Lead

| Critério | 🟢 Quente | 🟡 Morno | 🔴 Frio |
|----------|-----------|----------|---------|
| Budget | Tem verba | Precisa aprovar | Não tem |
| Authority | Decisor | Influenciador | Sem poder |
| Need | Urgente | Importante | Nice-to-have |
| Timeline | < 1 mês | 1-3 meses | > 3 meses |`,
    order: 1
  },
  {
    name: 'Objeções Comuns B2B',
    category: 'objections',
    content: `## 🛡️ Contorno de Objeções B2B

---

### "Está caro"
- "Entendo sua preocupação. Mas me conta: quanto vocês estão perdendo hoje por não resolver esse problema?"
- "O investimento parece alto comparado a quê? Posso mostrar o ROI projetado."
- "Podemos estruturar o pagamento de uma forma que faça sentido pro fluxo de caixa de vocês?"

### "Preciso pensar"
- "Claro! Para eu te ajudar a decidir melhor, qual é a principal dúvida que ainda resta?"
- "Faz sentido agendarmos uma call rápida para tirar todas as dúvidas?"
- "Posso preparar um resumo dos principais pontos para você apresentar internamente?"

### "Vou comparar com outros fornecedores"
- "Ótimo! Inclusive recomendo. Posso te enviar um checklist do que comparar para você não esquecer nenhum critério importante?"
- "Que aspectos são mais importantes para vocês nessa comparação?"
- "Só pra eu entender: o que faria vocês escolherem a gente ao invés de outro?"

### "Não é prioridade agora"
- "Entendo. Quando seria o momento ideal para retomar essa conversa?"
- "O que precisaria acontecer para isso virar prioridade?"
- "Posso deixar uma proposta pronta para quando fizer sentido?"

### "Já tivemos experiência ruim com isso"
- "Lamento ouvir. O que deu errado na experiência anterior?"
- "Justamente por isso nossa abordagem é diferente em [DIFERENCIAL]"
- "Podemos começar com um piloto menor para você validar antes de escalar?"`,
    order: 2
  },
  {
    name: 'Follow-up Estratégico',
    category: 'scripts',
    content: `## 📧 Sequência de Follow-up B2B

**Objetivo:** Manter o lead engajado sem ser invasivo

---

### Dia 1 - Pós-reunião
**Assunto:** Resumo da nossa conversa + próximos passos

"Olá [NOME],

Foi ótimo conversar com você hoje sobre [TEMA].

📋 **Principais pontos:**
- [Ponto 1]
- [Ponto 2]
- [Ponto 3]

📎 Anexei [proposta/apresentação/material] como combinado.

**Próximo passo:** [Ação esperada até data]

Qualquer dúvida, estou à disposição!"

---

### Dia 3 - Se não respondeu
**Assunto:** Rápida dúvida sobre [PROJETO]

"Oi [NOME], tudo bem?

Conseguiu dar uma olhada no material que enviei?
Fico à disposição caso precise de algum esclarecimento."

---

### Dia 7 - Agregar valor
**Assunto:** [Artigo/Case] que pode te interessar

"[NOME],

Vi esse [conteúdo relevante] e lembrei da nossa conversa sobre [tema].
Achei que poderia ser útil pra vocês: [link]

Continuo por aqui quando quiser retomar!"

---

### Dia 14 - Última tentativa
**Assunto:** Devo fechar o arquivo?

"[NOME],

Não tive retorno sobre a proposta e imagino que esteja corrido aí.

Faz sentido remarcar uma conversa rápida?
Caso não seja o momento, sem problemas - só me avisa que fecho o arquivo aqui.

Fico no aguardo!"`,
    order: 3
  },
  {
    name: 'Reunião de Descoberta',
    category: 'scripts',
    content: `## 🔍 Roteiro: Reunião de Descoberta

**Duração:** 30-45 min
**Objetivo:** Entender profundamente as necessidades do cliente

---

### Abertura (2 min)
"Obrigado por reservar esse tempo! Meu objetivo aqui é entender melhor sua situação para ver se e como podemos ajudar. Ao final, se fizer sentido, a gente combina os próximos passos. Pode ser?"

### Contexto (5 min)
- "Me conta um pouco sobre a [EMPRESA] e seu papel lá?"
- "Quantas pessoas têm na equipe?"
- "Quais são os principais desafios do dia a dia?"

### Problema (10 min)
- "O que te motivou a buscar uma solução para [ÁREA]?"
- "Há quanto tempo isso é um problema?"
- "Já tentaram resolver de outra forma? O que deu certo/errado?"
- "Como isso impacta os resultados da empresa?"

### Cenário Ideal (5 min)
- "Se tivesse uma varinha mágica, como seria o cenário ideal?"
- "Que métricas indicariam sucesso pra vocês?"
- "O que mudaria no dia a dia da equipe?"

### Decisão (5 min)
- "Como funciona o processo de decisão aí?"
- "Quem mais precisa estar envolvido?"
- "Vocês têm um prazo em mente?"
- "Existe orçamento disponível este ano?"

### Próximos Passos (3 min)
- "Baseado no que conversamos, acho que podemos ajudar em [X, Y, Z]"
- "O próximo passo seria [proposta/demo/call com time]"
- "Que dia funciona pra você?"`,
    order: 4
  }
]

// Export do Preset Completo
export const B2B_SERVICES_PRESET: PresetConfig = {
  id: 'b2b_services',
  name: 'Vendas B2B & Serviços',
  description: 'Para consultorias, agências, freelancers e prestadores de serviço. Inclui funil de vendas consultivas, campos de qualificação BANT e playbooks de prospecção.',
  icon: '💼',
  category: 'services',
  pipelineStages: B2B_PIPELINE_STAGES,
  leadCustomFields: B2B_LEAD_FIELDS,
  productCustomFields: B2B_PRODUCT_FIELDS,
  playbooks: B2B_PLAYBOOKS
}
