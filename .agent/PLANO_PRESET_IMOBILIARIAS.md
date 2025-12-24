# 🏠 Plano de Implementação: Preset para Imobiliárias de Alto Padrão

## 📋 Visão Geral

**Público-alvo:** Imobiliárias de 1 a 10 membros focadas em alto padrão
**Ticket:** R$80/mês (Brasil) ou U$19/mês (Internacional)
**Proposta:** Pacote que, ao ser ativado, configura automaticamente todo o CRM para o fluxo imobiliário

---

## 🎯 O que o Preset Vai Configurar

### 1. Pipeline de Leads (Etapas do Funil)
```
┌─────────────────────────────────────────────────────────────────┐
│  1. Novo Lead     →  Cor: #6366F1 (Índigo)                      │
│  2. Primeiro Contato  →  Cor: #8B5CF6 (Violeta)                │
│  3. Qualificação  →  Cor: #EC4899 (Pink)                        │
│  4. Visita Agendada   →  Cor: #F59E0B (Âmbar)                   │
│  5. Visita Realizada  →  Cor: #10B981 (Esmeralda)              │
│  6. Proposta Enviada  →  Cor: #3B82F6 (Azul)                    │
│  7. Negociação    →  Cor: #F97316 (Laranja)                     │
│  8. Fechado       →  Cor: #22C55E (Verde)                       │
│  9. Perdido       →  Cor: #EF4444 (Vermelho)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Campos Personalizados para Leads (Perfil do Comprador)

| Campo | Tipo | Opções | Grupo |
|-------|------|--------|-------|
| `faixa_preco_min` | currency | - | Preferências |
| `faixa_preco_max` | currency | - | Preferências |
| `regioes_interesse` | multiselect | Zona Sul, Zona Norte, Zona Oeste, Zona Leste, Centro, Litoral | Preferências |
| `tipo_imovel_desejado` | multiselect | Apartamento, Casa, Cobertura, Terreno, Comercial, Flat | Preferências |
| `quartos_minimo` | select | 1, 2, 3, 4, 5+ | Preferências |
| `banheiros_minimo` | select | 1, 2, 3, 4, 5+ | Preferências |
| `vagas_minimo` | select | 1, 2, 3, 4, 5+ | Preferências |
| `finalidade` | select | Moradia, Investimento, Segunda Residência, Temporada | Qualificação |
| `aceita_financiamento` | boolean | - | Qualificação |
| `tem_imovel_vender` | boolean | - | Qualificação |
| `valor_disponivel` | currency | - | Qualificação |
| `urgencia` | select | Imediata, 1-3 meses, 3-6 meses, 6-12 meses, Sem pressa | Qualificação |
| `como_conheceu` | select | Indicação, Portal, Google, Instagram, Facebook, Placa, Outro | Origem |

### 3. Campos Personalizados para Produtos (Imóveis)

| Campo | Tipo | Opções | Grupo |
|-------|------|--------|-------|
| `tipo_empreendimento` | select | Pronto, Na Planta, Em Construção | Caracterização |
| `incorporadora` | text | - | Caracterização |
| `condominio_mensal` | currency | - | Custos |
| `iptu_anual` | currency | - | Custos |
| `possui_lazer` | boolean | - | Características |
| `itens_lazer` | multiselect | Piscina, Academia, Salão de Festas, Churrasqueira, Playground, Quadra, Sauna | Características |
| `vista` | select | Mar, Cidade, Verde, Interna, Livre | Características |
| `andar` | number | - | Características |
| `posicao_sol` | select | Nascente, Poente, Norte, Sul | Características |
| `aceita_permuta` | boolean | - | Negociação |
| `aceita_financiamento` | boolean | - | Negociação |
| `documentacao` | select | Ok, Pendente, Em Análise | Status |
| `exclusividade` | boolean | - | Status |
| `comissao_percentual` | percentage | - | Comercial |

### 4. Playbooks Imobiliários (Scripts de Vendas)

#### 4.1 Primeiro Contato
```markdown
## 🏠 Script: Primeiro Contato

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
Que tal agendarmos uma visita para amanhã ou [PRÓXIMO_DIA_ÚTIL]?"
```

#### 4.2 Agendamento de Visita
```markdown
## 📅 Script: Agendamento de Visita

**Objetivo:** Confirmar e preparar para visita

### Confirmação
"[NOME], confirmando nossa visita amanhã às [HORÁRIO] no imóvel da [ENDEREÇO].

📍 Endereço: [ENDEREÇO_COMPLETO]
⏰ Horário: [HORÁRIO]
🔑 Estarei te esperando na portaria.

Precisa de algo mais antes da nossa visita?"

### Lembrete (1h antes)
"Olá [NOME]! Lembrando que nossa visita é daqui a 1 hora.
Estou a caminho do imóvel. Nos vemos em breve! 🏠"
```

#### 4.3 Follow-up Pós-Visita
```markdown
## ✨ Script: Pós-Visita

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
Quer que eu te envie os detalhes?"
```

#### 4.4 Contorno de Objeções
```markdown
## 💪 Battlecard: Objeções Comuns

### "Está caro"
- "Entendo sua preocupação. Considerando os imóveis da região com características similares,
  este está até abaixo da média. Posso mostrar um comparativo?"
- "O valor reflete a localização privilegiada e a valorização esperada de X% ao ano.
  Em 5 anos, você estará pagando menos que o mercado."

### "Preciso pensar"
- "Claro! Qual ponto específico você gostaria de avaliar melhor?
  Posso te enviar mais informações sobre isso."
- "Enquanto decide, posso verificar se há margem de negociação com o proprietário?"

### "Vou ver outros imóveis"
- "Excelente! É importante comparar. Já visitou algo parecido na mesma faixa?
  Posso te ajudar a montar um roteiro de visitas mais eficiente."
- "Esse imóvel tem exclusividade conosco, então não encontrará em outra imobiliária."

### "Não tenho pressa"
- "Perfeito, não há pressão. Porém, imóveis nessa faixa costumam ter giro rápido.
  Posso te avisar caso surja muito interesse de outros clientes?"
```

### 5. Simulador de Financiamento (Expansão do ROI)

**Nova aba:** "Simulador de Financiamento"

**Campos de Entrada:**
- Valor do Imóvel
- Valor da Entrada
- Taxa de Juros Anual (%)
- Prazo (meses)
- Sistema (SAC / PRICE)
- Usa FGTS? (valor)

**Cálculos:**
- Valor Financiado
- Primeira Parcela
- Última Parcela (SAC)
- Total Pago
- Total de Juros
- Custo Efetivo Total (CET)
- Tabela de Amortização (primeiros 12 meses + resumo anual)

**PDF Gerado:**
- Logo da imobiliária
- Dados do cliente
- Resumo do financiamento
- Tabela comparativa SAC x PRICE
- Projeção de valorização do imóvel

---

## 🛠️ Plano de Implementação Técnico

### Fase 1: Serviço de Preset (Backend)
**Arquivo:** `src/services/presetService.ts`

```typescript
// Estrutura do Serviço
export interface PresetConfig {
  id: string
  name: string
  description: string
  icon: string
  category: 'real_estate' | 'generic' | 'services'
  pipelineStages: PipelineStagePreset[]
  leadCustomFields: CustomFieldPreset[]
  productCustomFields: CustomFieldPreset[]
  playbooks: PlaybookPreset[]
}

export async function applyPreset(tenantId: string, presetId: string): Promise<{
  success: boolean
  applied: {
    pipelineStages: number
    leadFields: number
    productFields: number
    playbooks: number
  }
  errors: string[]
}>

export async function getAvailablePresets(): Promise<PresetConfig[]>

export async function checkPresetApplied(tenantId: string, presetId: string): Promise<boolean>
```

### Fase 2: Dados do Preset Imobiliário
**Arquivo:** `src/data/presets/realEstatePreset.ts`

```typescript
export const REAL_ESTATE_PRESET: PresetConfig = {
  id: 'real_estate_premium',
  name: 'Imobiliária de Alto Padrão',
  description: 'Pipeline, campos e scripts otimizados para vendas de imóveis',
  icon: '🏠',
  category: 'real_estate',
  pipelineStages: [...],
  leadCustomFields: [...],
  productCustomFields: [...],
  playbooks: [...]
}
```

### Fase 3: Tela de Ativação do Preset
**Arquivo:** `src/components/PresetActivation.tsx`

- Modal ou página dedicada
- Preview do que será criado
- Botão "Aplicar Preset"
- Indicador de progresso
- Mensagem de sucesso com resumo

### Fase 4: Simulador de Financiamento
**Arquivo:** `src/pages/ferramentas/Financiamento.tsx`

Nova aba na calculadora ROI ou página separada.

### Fase 5: Integração no Onboarding
**Modificar:** `src/components/OnboardingSetup.tsx`

Adicionar step para escolher preset antes de configurar pipeline manualmente.

---

## 📅 Cronograma Sugerido

| Semana | Tarefa | Esforço |
|--------|--------|---------|
| **1** | Criar `presetService.ts` com estrutura base | 4h |
| **1** | Criar `realEstatePreset.ts` com todos os dados | 3h |
| **1** | Criar campos customizados para leads via SQL | 2h |
| **2** | Criar tela de ativação do preset | 4h |
| **2** | Criar playbooks no banco de dados | 2h |
| **2** | Testar aplicação do preset completo | 2h |
| **3** | Implementar Simulador de Financiamento | 6h |
| **3** | Integrar preset no onboarding | 2h |
| **4** | Testes e ajustes finais | 4h |

**Total estimado:** ~29 horas

---

## 🗃️ Alterações no Banco de Dados

### Tabela: `tenant_presets` (Nova)
```sql
CREATE TABLE tenant_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  preset_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT now(),
  applied_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, preset_id)
);
```

### Tabela: `lead_custom_fields` (Pode já existir)
Usar a estrutura existente de `product_custom_fields` adaptada para leads.

---

## 🎨 UX da Ativação

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│     🏠  Preset: Imobiliária de Alto Padrão                    │
│                                                                │
│     Otimizado para corretores que vendem imóveis premium.     │
│                                                                │
│     ✅ Pipeline de 9 etapas do fluxo imobiliário              │
│     ✅ 13 campos para perfil do comprador                      │
│     ✅ 14 campos para detalhes dos imóveis                    │
│     ✅ 4 playbooks de vendas prontos                           │
│     ✅ Simulador de financiamento                              │
│                                                                │
│     ⚠️ Os dados existentes NÃO serão apagados.                │
│                                                                │
│     ┌─────────────────────────────────────────────────┐       │
│     │          ⚡ Aplicar Preset Agora                │       │
│     └─────────────────────────────────────────────────┘       │
│                                                                │
│     [ Pular por agora ]                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

- [ ] Criar `presetService.ts`
- [ ] Criar `realEstatePreset.ts` com dados completos
- [ ] Criar migração SQL para `tenant_presets`
- [ ] Criar componente `PresetActivation.tsx`
- [ ] Adicionar rota `/app/configurar-preset`
- [ ] Implementar playbooks no Supabase
- [ ] Expandir ROI com aba de Financiamento
- [ ] Integrar no onboarding (opcional)
- [ ] Testar com tenant de teste
- [ ] Documentar no `app_functionalities_summary.md`

---

## 💰 Valor Percebido

Para uma imobiliária de alto padrão pagando R$80/mês, este preset oferece:

1. **Economia de tempo:** ~4-8 horas de configuração manual
2. **Profissionalismo:** Scripts testados e otimizados
3. **Organização:** Pipeline específico para o fluxo imobiliário
4. **Diferenciação:** Simulador de financiamento para impressionar clientes
5. **Dados estruturados:** Campos que facilitam match automático no futuro

**Este preset pode ser o diferencial que justifica a assinatura!**

---

*Documento criado em: 2025-12-20*
