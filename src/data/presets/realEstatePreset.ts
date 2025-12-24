// =====================================================
// DATA: Preset para Imobiliárias de Alto Padrão
// =====================================================

import type { PipelineStagePreset, CustomFieldPreset, PlaybookPreset, PresetConfig } from '../../services/presetService'

// Pipeline de Leads - Etapas do Funil Imobiliário
export const REAL_ESTATE_PIPELINE_STAGES: PipelineStagePreset[] = [
  { key: 'novo_lead', label: 'Novo Lead', color: '#6366F1', order: 1 },
  { key: 'primeiro_contato', label: 'Primeiro Contato', color: '#8B5CF6', order: 2 },
  { key: 'qualificacao', label: 'Qualificação', color: '#EC4899', order: 3 },
  { key: 'visita_agendada', label: 'Visita Agendada', color: '#F59E0B', order: 4 },
  { key: 'visita_realizada', label: 'Visita Realizada', color: '#10B981', order: 5 },
  { key: 'proposta_enviada', label: 'Proposta Enviada', color: '#3B82F6', order: 6 },
  { key: 'negociacao', label: 'Negociação', color: '#F97316', order: 7 },
  { key: 'fechado', label: 'Fechado', color: '#22C55E', order: 8 },
  { key: 'perdido', label: 'Perdido', color: '#EF4444', order: 9 }
]

// Campos Personalizados para Leads (Perfil do Comprador)
export const REAL_ESTATE_LEAD_FIELDS: CustomFieldPreset[] = [
  // Grupo: Preferências
  {
    field_key: 'faixa_preco_min',
    field_label: 'Faixa de Preço (Mín)',
    field_type: 'currency',
    field_group: 'Preferências',
    field_placeholder: 'Ex: 500.000',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'faixa_preco_max',
    field_label: 'Faixa de Preço (Máx)',
    field_type: 'currency',
    field_group: 'Preferências',
    field_placeholder: 'Ex: 2.000.000',
    display_order: 2,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'regioes_interesse',
    field_label: 'Regiões de Interesse',
    field_type: 'multiselect',
    field_options: ['Zona Sul', 'Zona Norte', 'Zona Oeste', 'Zona Leste', 'Centro', 'Litoral', 'Interior'],
    field_group: 'Preferências',
    display_order: 3,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'tipo_imovel_desejado',
    field_label: 'Tipo de Imóvel Desejado',
    field_type: 'multiselect',
    field_options: ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial', 'Flat', 'Studio'],
    field_group: 'Preferências',
    display_order: 4,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'quartos_minimo',
    field_label: 'Quartos (Mínimo)',
    field_type: 'select',
    field_options: ['1', '2', '3', '4', '5+'],
    field_group: 'Preferências',
    display_order: 5,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'banheiros_minimo',
    field_label: 'Banheiros (Mínimo)',
    field_type: 'select',
    field_options: ['1', '2', '3', '4', '5+'],
    field_group: 'Preferências',
    display_order: 6,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'vagas_minimo',
    field_label: 'Vagas (Mínimo)',
    field_type: 'select',
    field_options: ['1', '2', '3', '4', '5+'],
    field_group: 'Preferências',
    display_order: 7,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  // Grupo: Qualificação
  {
    field_key: 'finalidade',
    field_label: 'Finalidade',
    field_type: 'select',
    field_options: ['Moradia', 'Investimento', 'Segunda Residência', 'Temporada'],
    field_group: 'Qualificação',
    display_order: 8,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'aceita_financiamento',
    field_label: 'Aceita Financiamento?',
    field_type: 'boolean',
    field_group: 'Qualificação',
    display_order: 9,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'tem_imovel_vender',
    field_label: 'Tem Imóvel para Vender?',
    field_type: 'boolean',
    field_group: 'Qualificação',
    display_order: 10,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'valor_disponivel',
    field_label: 'Valor Disponível (Entrada)',
    field_type: 'currency',
    field_group: 'Qualificação',
    field_placeholder: 'Ex: 200.000',
    display_order: 11,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'urgencia',
    field_label: 'Urgência',
    field_type: 'select',
    field_options: ['Imediata', '1-3 meses', '3-6 meses', '6-12 meses', 'Sem pressa'],
    field_group: 'Qualificação',
    display_order: 12,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  // Grupo: Origem
  {
    field_key: 'como_conheceu',
    field_label: 'Como Conheceu',
    field_type: 'select',
    field_options: ['Indicação', 'Portal Imobiliário', 'Google', 'Instagram', 'Facebook', 'Placa', 'Outro'],
    field_group: 'Origem',
    display_order: 13,
    required: false,
    show_in_list: false,
    show_in_filters: true
  }
]

// Campos Personalizados para Produtos (Imóveis)
export const REAL_ESTATE_PRODUCT_FIELDS: CustomFieldPreset[] = [
  // Grupo: Caracterização
  {
    field_key: 'tipo_empreendimento',
    field_label: 'Tipo de Empreendimento',
    field_type: 'select',
    field_options: ['Pronto', 'Na Planta', 'Em Construção'],
    field_group: 'Caracterização',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'incorporadora',
    field_label: 'Incorporadora',
    field_type: 'text',
    field_group: 'Caracterização',
    field_placeholder: 'Nome da incorporadora',
    display_order: 2,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  // Grupo: Custos
  {
    field_key: 'condominio_mensal',
    field_label: 'Condomínio Mensal',
    field_type: 'currency',
    field_group: 'Custos',
    field_placeholder: 'Ex: 1.500',
    display_order: 3,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'iptu_anual',
    field_label: 'IPTU Anual',
    field_type: 'currency',
    field_group: 'Custos',
    field_placeholder: 'Ex: 5.000',
    display_order: 4,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  // Grupo: Características
  {
    field_key: 'possui_lazer',
    field_label: 'Possui Lazer?',
    field_type: 'boolean',
    field_group: 'Características',
    display_order: 5,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'itens_lazer',
    field_label: 'Itens de Lazer',
    field_type: 'multiselect',
    field_options: ['Piscina', 'Academia', 'Salão de Festas', 'Churrasqueira', 'Playground', 'Quadra', 'Sauna', 'Spa'],
    field_group: 'Características',
    display_order: 6,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'vista',
    field_label: 'Vista',
    field_type: 'select',
    field_options: ['Mar', 'Cidade', 'Verde', 'Interna', 'Livre'],
    field_group: 'Características',
    display_order: 7,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'andar',
    field_label: 'Andar',
    field_type: 'number',
    field_group: 'Características',
    field_placeholder: 'Ex: 15',
    display_order: 8,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'posicao_sol',
    field_label: 'Posição do Sol',
    field_type: 'select',
    field_options: ['Nascente', 'Poente', 'Norte', 'Sul'],
    field_group: 'Características',
    display_order: 9,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  // Grupo: Negociação
  {
    field_key: 'aceita_permuta',
    field_label: 'Aceita Permuta?',
    field_type: 'boolean',
    field_group: 'Negociação',
    display_order: 10,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'aceita_financiamento_produto',
    field_label: 'Aceita Financiamento?',
    field_type: 'boolean',
    field_group: 'Negociação',
    display_order: 11,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  // Grupo: Status
  {
    field_key: 'documentacao',
    field_label: 'Documentação',
    field_type: 'select',
    field_options: ['Ok', 'Pendente', 'Em Análise'],
    field_group: 'Status',
    display_order: 12,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'exclusividade',
    field_label: 'Exclusividade?',
    field_type: 'boolean',
    field_group: 'Status',
    display_order: 13,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  // Grupo: Comercial
  {
    field_key: 'comissao_percentual',
    field_label: 'Comissão (%)',
    field_type: 'percentage',
    field_group: 'Comercial',
    field_placeholder: 'Ex: 6',
    display_order: 14,
    required: false,
    show_in_list: false,
    show_in_filters: false
  }
]

// Playbooks para Vendas Imobiliárias
export const REAL_ESTATE_PLAYBOOKS: PlaybookPreset[] = [
  {
    name: 'Primeiro Contato',
    category: 'scripts',
    content: `## 🏠 Script: Primeiro Contato

**Objetivo:** Qualificar o lead e agendar visita

### Abertura
"Olá [NOME]! Aqui é o [SEU_NOME] da [IMOBILIÁRIA].
Vi que você demonstrou interesse em imóveis na região de [REGIÃO].
Posso te ajudar a encontrar o imóvel ideal?"

### Qualificação Rápida
1. "Você está buscando para moradia ou investimento?"
2. "Qual a faixa de valor que está considerando?"
3. "Qual região prefere?"
4. "Quantos quartos no mínimo?"
5. "Tem urgência no fechamento?"

### Fechamento
"Tenho algumas opções que se encaixam perfeitamente no que você busca.
Que tal agendarmos uma visita para amanhã ou [PRÓXIMO_DIA_ÚTIL]?"`,
    order: 1
  },
  {
    name: 'Agendamento de Visita',
    category: 'scripts',
    content: `## 📅 Script: Agendamento de Visita

**Objetivo:** Confirmar e preparar para visita

### Confirmação
"[NOME], confirmando nossa visita amanhã às [HORÁRIO] no imóvel da [ENDEREÇO].

📍 Endereço: [ENDEREÇO_COMPLETO]
⏰ Horário: [HORÁRIO]
🔑 Estarei te esperando na portaria.

Precisa de algo mais antes da nossa visita?"

### Lembrete (1h antes)
"Olá [NOME]! Lembrando que nossa visita é daqui a 1 hora.
Estou a caminho do imóvel. Nos vemos em breve! 🏠"`,
    order: 2
  },
  {
    name: 'Follow-up Pós-Visita',
    category: 'scripts',
    content: `## ✨ Script: Pós-Visita

**Objetivo:** Fechar proposta ou reagendar

### Mesmo dia (2-4h depois)
"[NOME], foi um prazer te mostrar o imóvel hoje!
O que achou? Alguma dúvida sobre o que vimos?"

### Dia seguinte (se não respondeu)
"Bom dia [NOME]!
Pensou mais sobre o imóvel que visitamos ontem?
Estou à disposição para esclarecer qualquer dúvida
ou agendar novas visitas se preferir ver outras opções."

### 3 dias depois (se ainda não respondeu)
"Olá [NOME], tudo bem?
Surgiu uma oportunidade semelhante ao que você busca.
Quer que eu te envie os detalhes?"`,
    order: 3
  },
  {
    name: 'Contorno de Objeções',
    category: 'objections',
    content: `## 💪 Battlecard: Objeções Comuns

### "Está caro"
- "Entendo sua preocupação. Considerando os imóveis da região com características similares, este está até abaixo da média. Posso mostrar um comparativo?"
- "O valor reflete a localização privilegiada e a valorização esperada de X% ao ano. Em 5 anos, você estará pagando menos que o mercado."

### "Preciso pensar"
- "Claro! Qual ponto específico você gostaria de avaliar melhor? Posso te enviar mais informações sobre isso."
- "Enquanto decide, posso verificar se há margem de negociação com o proprietário?"

### "Vou ver outros imóveis"
- "Excelente! É importante comparar. Já visitou algo parecido na mesma faixa? Posso te ajudar a montar um roteiro de visitas mais eficiente."
- "Esse imóvel tem exclusividade conosco, então não encontrará em outra imobiliária."

### "Não tenho pressa"
- "Perfeito, não há pressão. Porém, imóveis nessa faixa costumam ter giro rápido. Posso te avisar caso surja muito interesse de outros clientes?"`,
    order: 4
  }
]

// Configuração Completa do Preset
export const REAL_ESTATE_PRESET: PresetConfig = {
  id: 'real_estate_premium',
  name: 'Imobiliária de Alto Padrão',
  description: 'Pipeline, campos personalizados e scripts de vendas otimizados para corretores que vendem imóveis de alto padrão.',
  icon: '🏠',
  category: 'real_estate',
  pipelineStages: REAL_ESTATE_PIPELINE_STAGES,
  leadCustomFields: REAL_ESTATE_LEAD_FIELDS,
  productCustomFields: REAL_ESTATE_PRODUCT_FIELDS,
  playbooks: REAL_ESTATE_PLAYBOOKS
}
