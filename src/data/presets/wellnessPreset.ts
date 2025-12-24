// =====================================================
// DATA: Preset para Clínicas, Estética e Bem-estar
// Focado em agendamento, avaliação e fidelização
// Ideal para massoterapia, clínicas de estética, spas
// =====================================================

import type { PresetConfig, CustomFieldPreset, PlaybookPreset, PipelineStagePreset } from '../../services/presetService'

// Pipeline focado em Agendamentos e Tratamentos
export const WELLNESS_PIPELINE_STAGES: PipelineStagePreset[] = [
  { key: 'novo_interessado', label: 'Novo Interessado', color: '#EC4899', order: 0 },
  { key: 'contato_realizado', label: 'Contato Realizado', color: '#D946EF', order: 1 },
  { key: 'agendado', label: 'Agendado', color: '#8B5CF6', order: 2 },
  { key: 'confirmado', label: 'Confirmado', color: '#6366F1', order: 3 },
  { key: 'em_avaliacao', label: 'Avaliação/Anamnese', color: '#0EA5E9', order: 4 },
  { key: 'tratamento_iniciado', label: 'Em Tratamento', color: '#10B981', order: 5 },
  { key: 'concluido', label: 'Concluído/Alta', color: '#22C55E', order: 6 },
  { key: 'recorrencia', label: 'Clube/Recorrência', color: '#F59E0B', order: 7 },
  { key: 'cancelado', label: 'Cancelado/No-show', color: '#EF4444', order: 8 }
]

// Campos para Pacientes/Clientes
export const WELLNESS_LEAD_FIELDS: CustomFieldPreset[] = [
  // Grupo: Perfil
  {
    field_key: 'queixa_principal',
    field_label: 'Queixa Principal',
    field_type: 'textarea',
    field_group: 'Perfil Clínico',
    field_placeholder: 'Dores, incômodos ou objetivos estéticos',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'como_prefere_contato',
    field_label: 'Preferência de Contato',
    field_type: 'select',
    field_options: ['WhatsApp', 'Ligação', 'Email'],
    field_group: 'Perfil',
    display_order: 2,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'ja_fez_procedimento',
    field_label: 'Já realizou procedimentos antes?',
    field_type: 'boolean',
    field_group: 'Histórico',
    display_order: 3,
    required: false,
    show_in_list: false,
    show_in_filters: true
  },
  {
    field_key: 'contra_indicacoes',
    field_label: 'Contraindicações/Alergias',
    field_type: 'textarea',
    field_group: 'Histórico',
    field_placeholder: 'Alergias, gestação, cirurgias recentes...',
    display_order: 4,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  // Grupo: Objetivos
  {
    field_key: 'objetivo',
    field_label: 'Objetivo Principal',
    field_type: 'select',
    field_options: ['Relaxamento', 'Estético', 'Terapêutico', 'Recuperação', 'Manutenção'],
    field_group: 'Perfil Clínico',
    display_order: 5,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'disponibilidade',
    field_label: 'Melhor Horário',
    field_type: 'select',
    field_options: ['Manhã', 'Tarde', 'Noite', 'Sábado'],
    field_group: 'Agendamento',
    display_order: 6,
    required: false,
    show_in_list: true,
    show_in_filters: true
  }
]

// Campos para Serviços/Tratamentos
export const WELLNESS_PRODUCT_FIELDS: CustomFieldPreset[] = [
  {
    field_key: 'tipo_procedimento',
    field_label: 'Tipo de Procedimento',
    field_type: 'select',
    field_options: ['Massagem', 'Facial', 'Corporal', 'Injetável', 'Equipamentos', 'Outro'],
    field_group: 'Detalhes',
    display_order: 1,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'duracao_sessao',
    field_label: 'Duração da Sessão',
    field_type: 'select',
    field_options: ['30 min', '45 min', '60 min', '90 min', '2 horas'],
    field_group: 'Detalhes',
    display_order: 2,
    required: false,
    show_in_list: true,
    show_in_filters: true
  },
  {
    field_key: 'qtde_sessoes',
    field_label: 'Quantidade de Sessões (Pacote)',
    field_type: 'number',
    field_group: 'Comercial',
    field_default: '1',
    display_order: 3,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'cuidados_pos',
    field_label: 'Cuidados Pós-Procedimento',
    field_type: 'textarea',
    field_group: 'Técnico',
    field_placeholder: 'Recomendações para o paciente após a sessão',
    display_order: 4,
    required: false,
    show_in_list: false,
    show_in_filters: false
  },
  {
    field_key: 'sala_equipamento',
    field_label: 'Sala/Equipamento Necessário',
    field_type: 'text',
    field_group: 'Logística',
    display_order: 5,
    required: false,
    show_in_list: false,
    show_in_filters: false
  }
]

// Playbooks para Clínicas
export const WELLNESS_PLAYBOOKS: PlaybookPreset[] = [
  {
    name: 'Confirmação de Agendamento',
    category: 'scripts',
    content: `## 📅 Script de Confirmação (WhatsApp)

**Enviar 24h antes do atendimento**

"Olá [NOME], tudo bem? 🌸

Passando para confirmar seu horário amanhã às [HORA] para [PROCEDIMENTO].

Lembrando algumas recomendações:
- Chegar 10 minutos antes
- [Recomendação específica 1]
- [Recomendação específica 2]

Caso precise reagendar, pedimos a gentileza de avisar com 12h de antecedência.

Posso confirmar sua presença?"`,
    order: 1
  },
  {
    name: 'Reativação de Pacientes',
    category: 'scripts',
    content: `## ♻️ Script para Reativação (Sumidos)

**Objetivo:** Trazer de volta clientes que não vêm há mais de 30 dias

"Oi [NOME], sentimos sua falta por aqui! ✨

Vi que faz um tempinho desde sua última sessão de [PROCEDIMENTO]. Como você tem se sentido?

Como você é um(a) cliente especial, liberei um voucher de **[DESCONTO]% OFF** ou um **[MIMO EXTRA]** para você retomar seus cuidados essa semana.

Temos horários disponíveis na [DIA DA SEMANA]. Vamos agendar?"`,
    order: 2
  },
  {
    name: 'Pós-Atendimento (NPS)',
    category: 'scripts',
    content: `## 💌 Script de Pós-Venda

**Enviar no dia seguinte ao atendimento**

"Bom dia [NOME]! ☀️

Como você está se sentindo após o procedimento de ontem?

Estamos sempre buscando melhorar. Se puder responder rapidinho:
De 0 a 10, qual nota você daria para sua experiência conosco?

Obrigado(a) pela confiança! 💜"`,
    order: 3
  },
  {
    name: 'Oferta de Pacotes',
    category: 'objections',
    content: `## 📦 Convertendo Sessão Única em Pacote

**Quando oferecer:** Após a primeira sessão, se o cliente gostou.

**Abordagem:**
"Fico muito feliz que tenha gostado do resultado de hoje!

Para atingirmos o objetivo [OBJETIVO DO CLIENTE] de forma duradoura, o ideal seria um protocolo contínuo.

Fazendo o pacote de [X] sessões, além de garantir seu horário fixo (o que ajuda muito na disciplina do tratamento), você consegue **[X]% de desconto** em relação à sessão avulsa.

Basicamente, você ganha [X] sessões de graça. Faz sentido pra você estruturarmos esse plano de tratamento?"`,
    order: 4
  }
]

export const WELLNESS_PRESET: PresetConfig = {
  id: 'wellness_beauty',
  name: 'Clinicas & Bem-estar',
  description: 'Ideal para massoterapia, clínicas de estética, spas e profissionais de saúde. Foco em agendamento e recorrência.',
  icon: '🌸',
  category: 'services',
  pipelineStages: WELLNESS_PIPELINE_STAGES,
  leadCustomFields: WELLNESS_LEAD_FIELDS,
  productCustomFields: WELLNESS_PRODUCT_FIELDS,
  playbooks: WELLNESS_PLAYBOOKS
}
