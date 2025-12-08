import { supabase } from '../lib/supabase'

interface AIResponse<T> {
  data: T | null
  error: string | null
}

async function callOpenAI(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<any> {
  try {
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    const { data, error } = await supabase.functions.invoke('openai-proxy', {
      body: {
        prompt: fullPrompt,
        max_tokens: 1500,
        model: 'gpt-4o-mini',
        response_format: jsonMode ? { type: 'json_object' } : undefined
      }
    })

    if (error) {
      throw new Error(error.message || 'OpenAI API Error')
    }

    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text

    if (!content) {
      throw new Error('No response from AI')
    }

    if (jsonMode) {
      // Limpar markdown se existir
      let cleanContent = content.trim()

      // Remover blocos de código markdown
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      // Tentar extrair JSON entre { } ou [ ]
      const jsonMatch = cleanContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        cleanContent = jsonMatch[1]
      }

      try {
        return JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse AI response:', cleanContent)
        throw new Error('AI returned invalid JSON format')
      }
    }

    return content
  } catch (error) {
    console.error('AI Service Error:', error)
    throw error
  }
}

export const aiService = {
  async analyzeProfile(data: { transcript: string, leadName: string, linkedin?: string, instagram?: string, role?: string, company?: string }): Promise<AIResponse<any>> {
    const systemPrompt = `You are an expert sales psychologist and DISC profiler.
Analyze the provided information about a lead (Transcript, LinkedIn, Instagram, Role, Company).
Return ONLY a valid JSON object with:
- personality: "Dominant", "Influential", "Steady", or "Conscientious" (DISC)
- tone: 1-3 words describing their tone (e.g. "Urgent and Direct")
- confidence: 0-100 score of how likely they are to buy based on sentiment
- recommendation: A strategic advice paragraph for the salesperson.
- template: A suggested email/message response.
- triggers: Array of strings (keywords found).

Language: Portuguese (BR).
IMPORTANT: Return ONLY the JSON object, no additional text.`

    try {
      const userPrompt = `Lead Name: ${data.leadName}
Role: ${data.role || 'N/A'}
Company: ${data.company || 'N/A'}
LinkedIn: ${data.linkedin || 'N/A'}
Instagram: ${data.instagram || 'N/A'}

Transcript/Notes:
${data.transcript}`

      const response = await callOpenAI(systemPrompt, userPrompt)
      return { data: response, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  },

  async analyzeCompetitor(competitorName: string): Promise<AIResponse<any>> {
    const systemPrompt = `You are a competitive intelligence expert.
Analyze the competitor provided.
Return ONLY a valid JSON object with:
- strengths: Array of 3 key strengths.
- weaknesses: Array of 3 key weaknesses.
- kill_points: Array of 2 "kill points" (arguments to win against them).
- price_estimate: Estimated price range (if known, else "Sob consulta").

Language: Portuguese (BR).
IMPORTANT: Return ONLY the JSON object, no additional text.`

    try {
      const data = await callOpenAI(systemPrompt, `Competitor: ${competitorName}`)
      return { data, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  },

  async generateEmailSequence(params: {
    goal: string
    targetPersona: string
    prospectName?: string
    companyName?: string
    painPoints?: string
    tone?: string
    template?: string
  }): Promise<AIResponse<any>> {
    const systemPrompt = `You are a copywriter expert in cold outreach and sales cadences.
Create a 4-step multichannel sales sequence.
Return ONLY a valid JSON object with a "steps" array. Each step must include:
- day: number (0, 1, 3, 5, etc)
- channel: one of "email", "linkedin", "sms", "call"
- trigger: one of "none", "open", "reply", "click"
- subject: string
- body: string (use [Nome] for placeholders or the provided prospect info)

Language: Portuguese (BR).
IMPORTANT: Return ONLY the JSON object, no additional text.`

    const userPrompt = [
      `Goal: ${params.goal}`,
      `Target Persona: ${params.targetPersona}`,
      params.prospectName ? `Prospect: ${params.prospectName}` : '',
      params.companyName ? `Company: ${params.companyName}` : '',
      params.painPoints ? `Pain Points: ${params.painPoints}` : '',
      params.tone ? `Desired Tone: ${params.tone}` : '',
      params.template ? `Framework: ${params.template}` : ''
    ].filter(Boolean).join('\n')

    try {
      const data = await callOpenAI(systemPrompt, userPrompt)
      return { data, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  },

  async summarizeMeeting(transcript: string): Promise<AIResponse<any>> {
    const systemPrompt = `You are an executive assistant. Summarize the meeting transcript.
Return ONLY a valid JSON object with:
- summary: Concise paragraph.
- action_items: Array of strings (next steps).
- sentiment: "Positive", "Neutral", "Negative".

Language: Portuguese (BR).
IMPORTANT: Return ONLY the JSON object, no additional text.`

    try {
      const data = await callOpenAI(systemPrompt, transcript)
      return { data, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  },

  async handleObjection(objection: string): Promise<AIResponse<any>> {
    const systemPrompt = `You are a senior sales coach. Provide a response to the objection.
Return ONLY a valid JSON object with:
- response: The script to say.
- tactic: The name of the technique used (e.g. "Feel-Felt-Found").
- rationale: Why this works.

Language: Portuguese (BR).
IMPORTANT: Return ONLY the JSON object, no additional text.`

    try {
      const data = await callOpenAI(systemPrompt, objection)
      return { data, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  },

  async generateContract(data: {
    contratada: string
    contratante: string
    cnpjContratada?: string
    cnpjContratante?: string
    enderecoContratada?: string
    enderecoContratante?: string
    escopo: string
    valor: string
    validadeDias: string
    obrigacoes?: string
    penalidades?: string
    foro?: string
  }): Promise<AIResponse<any>> {
    const systemPrompt = `Voce e um advogado brasileiro especializado em contratos de prestacao de servicos de tecnologia (SaaS/CRM/IA).
Crie um contrato robusto e direto. Retorne APENAS um JSON com:
{
  "summary": "Resumo em 1 paragrafo com quem contrata, quem presta, CNPJ/endereco e objetivo",
  "clauses": [
    { "title": "Clausula 1 - Objeto", "body": "..." },
    { "title": "Clausula 2 - Valor e Forma de Pagamento", "body": "..." },
    { "title": "Clausula 3 - Vigencia e Cronograma", "body": "..." },
    { "title": "Clausula 4 - Obrigacoes das Partes", "body": "..." },
    { "title": "Clausula 5 - Penalidades", "body": "..." },
    { "title": "Clausula 6 - Propriedade Intelectual", "body": "..." },
    { "title": "Clausula 7 - Garantias e Suporte", "body": "..." },
    { "title": "Clausula 8 - Rescisao", "body": "..." },
    { "title": "Clausula 9 - Foro", "body": "..." }
  ],
  "signatures": ["CONTRATADA", "CONTRATANTE"]
}
Regras: portugues (BR); cite valores, forma de pagamento, vigencia, cronograma basico, SLAs e confidencialidade; penalidades com multa e juros simples; PI pertence a CONTRATADA; foro conforme informado ou Sao Paulo/SP.`

    const userPrompt = `
Contratada: ${data.contratada} (${data.cnpjContratada || 'CNPJ nao informado'}) - ${data.enderecoContratada || 'Endereco nao informado'}
Contratante: ${data.contratante} (${data.cnpjContratante || 'CNPJ nao informado'}) - ${data.enderecoContratante || 'Endereco nao informado'}
Escopo/servicos: ${data.escopo}
Valor e pagamento: ${data.valor}
Vigencia (dias): ${data.validadeDias}
Obrigacoes extra: ${data.obrigacoes || 'Nao informado'}
Penalidades: ${data.penalidades || 'Nao informado'}
Foro desejado: ${data.foro || 'Sao Paulo/SP'}
`

    try {
      const result = await callOpenAI(systemPrompt, userPrompt)
      return { data: result, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  },

  async generateROINarrative(metrics: any): Promise<string> {
    const systemPrompt = `You are a financial consultant. Write a persuasive executive summary (1 paragraph) about the ROI of a project based on the provided metrics.
Focus on the Payback period and Net Profit.
Language: Portuguese (BR).
Return plain text.`

    try {
      const content = await callOpenAI(systemPrompt, JSON.stringify(metrics), false)
      return content
    } catch (e: any) {
      return "Erro ao gerar narrativa."
    }
  },

  async analyzeConversation(data: { history: string, leadName: string, leadFields: string[] }): Promise<AIResponse<any>> {
    const systemPrompt = `You are an expert CRM assistant. Analyze the conversation history and extract key insights about the lead.
Return ONLY a valid JSON object with:
- summary: A brief summary of the conversation (max 2 sentences).
- sentiment: "Positive", "Neutral", or "Negative".
- interests: Array of strings (products/services interested in).
- key_facts: Array of strings (important facts learned, e.g., "Prefers email", "Budget is 5k", "Located in SP").
- next_steps: Array of strings (suggested next actions).

Language: Portuguese (BR).
IMPORTANT: Return ONLY the JSON object, no additional text.`

    const userPrompt = `Lead Name: ${data.leadName}
Available Fields: ${data.leadFields.join(', ')}

Conversation History:
${data.history}`

    try {
      const response = await callOpenAI(systemPrompt, userPrompt)
      return { data: response, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  }
}
