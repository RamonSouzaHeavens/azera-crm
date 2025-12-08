import { useCallback, useMemo, useState } from 'react'
// @ts-expect-error: optional dependency
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import ImportCsvOptimize from './ImportCsvOptimize'
import { addIncorporadora, addRegiao, addBairro } from '../../services/produtoFiltersService'
import { FileSpreadsheet, ChevronRight, CheckCircle2, AlertCircle, Download } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  onImported?: () => void
}

type ImportResult = {
  total: number
  imported: number
  skipped: Array<{ index: number; reason: string }>
  errors: Array<{ index: number; error: string }>
}

// Campos esperados na tabela produtos — mapeie conforme necessário (mesmos nomes da página de editar)
const TARGET_FIELDS = [
  'nome', 'descricao', 'preco', 'ativo', 'destaque', 'capa_url', 'galeria_urls', 'arquivo_urls',
  'tags', 'tipo', 'finalidade', 'fase', 'entrega', 'area_total', 'area_construida', 'quartos', 'banheiros', 'vagas_garagem',
  'endereco', 'bairro', 'cidade', 'cep', 'incorporadora', 'regiao', 'estado', 'decorado', 'financiamento', 'modalidade'
]

// Heurística simples para sugerir mapeamento a partir de header CSV
function suggestMapping(header: string, sampleValue?: string) {
  const h = header.toLowerCase().trim()
  const sample = (sampleValue || '').toLowerCase().trim()
  
  // Detectar preço por símbolos no header ou nos dados
  if (/(preco|price|valor|r\$|\$)/.test(h) || /r\$|\$/.test(sample)) return 'preco'
  if (/(nome|title|titulo)/.test(h)) return 'nome'
  if (/(descricao|description|desc)/.test(h)) return 'descricao'
  if (/(area|metragem|m2|m²)/.test(h)) return 'area_total'
  if (/(construida|area_construida)/.test(h)) return 'area_construida'
  if (/(quarto|quartos|bed)/.test(h)) return 'quartos'
  if (/(banheiro|banheiros|bath)/.test(h)) return 'banheiros'
  if (/(vaga|vagas|garagem)/.test(h)) return 'vagas_garagem'
  if (/(endereço|endereco|address)/.test(h)) return 'endereco'
  if (/(bairro)/.test(h)) return 'bairro'
  if (/(cidade|city)/.test(h)) return 'cidade'
  if (/(cep|zip|postal)/.test(h)) return 'cep'
  if (/(capa|cover|image)/.test(h)) return 'capa_url'
  if (/(tag|tags)/.test(h)) return 'tags'
  if (/(fase|fase_imovel|fase_obra|lan[cç]amento|lancamento)/.test(h)) return 'fase'
  if (/(entrega|delivery|entrega_date|entrega_data|delivery_date)/.test(h)) return 'entrega'
  if (/(incorporadora|developer|empreendedor)/.test(h)) return 'incorporadora'
  if (/(regiao|região|area|zona)/.test(h)) return 'regiao'
  if (/(estado|state|uf)/.test(h)) return 'estado'
  if (/(decorado|decoração|decoracao)/.test(h)) return 'decorado'
  if (/(financiamento|financeira|financia)/.test(h)) return 'financiamento'
  if (/(modalidade|modality|tipo_programa|programa)/.test(h)) return 'modalidade'
  return ''
}

export default function ImportCsv({ isOpen, onClose, tenantId, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [useAI, setUseAI] = useState(false)
  const [showOptimizeModal, setShowOptimizeModal] = useState(false)
  const [optimizedRows, setOptimizedRows] = useState<Record<string, unknown>[]>([])
  // selecionar qual linha é o header
  const [rawData, setRawData] = useState<string[][]>([])
  const [headerLineIndex, setHeaderLineIndex] = useState(0)

  const handleFile = useCallback((file: File | null) => {
    if (!file) return
    setFileName(file.name)
    Papa.parse(file, {
      header: false, // não usar header automático — processar manualmente
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<string[]>) => {
        const allRows = results.data as string[][]
        setRawData(allRows)
        setHeaderLineIndex(0) // default: primeira linha é header
        
        // Mostrar preview das primeiras 5 linhas para o usuário escolher qual é header
        console.log('Raw CSV data (first 5 rows):', allRows.slice(0, 5))
        toast.success(`CSV carregado com ${allRows.length} linhas — escolha qual linha é o header abaixo`)
      },
      error: (err: Papa.ParseError) => {
        console.error('CSV parse error', err)
        toast.error('Erro ao processar CSV')
      }
    })
  }, [])

  const handleMapChange = useCallback((header: string, field: string) => {
    setMapping(prev => ({ ...prev, [header]: field }))
  }, [])

  async function sendToSupabase(records: Record<string, unknown>[]) {
    // Inserimos em lote (max 100 por request)
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize)
      
      // Garantir que campos obrigatórios existam e serializar filtros como JSON
      const validChunk = chunk.map(record => {
        const cleaned: Record<string, unknown> = {
          ...record,
          preco: record.preco ?? 0,
          tipo: record.tipo || 'apartamento',
          finalidade: record.finalidade || 'venda'
        }
        
        // Se filtros existir como objeto, serializar para JSON string
        if (cleaned.filtros && typeof cleaned.filtros === 'object') {
          cleaned.filtros = JSON.stringify(cleaned.filtros)
        }
        
        return cleaned
      })
      
      // Debug: mostrar primeiro registro para verificar estrutura
      if (i === 0) {
        console.log('📦 Primeiro registro a ser inserido:', validChunk[0])
        console.log('📦 Tipo de filtros:', typeof validChunk[0].filtros)
      }
      
      const { error, data } = await supabase.from('produtos').insert(validChunk).select()
      if (error) {
        console.error('❌ Erro ao inserir no Supabase:', error)
        console.error('❌ Dados que tentaram ser inseridos:', validChunk[0])
        throw error
      }
      console.log('✅ Dados inseridos com sucesso:', data?.[0])
      // Atualizar progresso
      const processed = Math.min(i + batchSize, records.length)
      setImportProgress(Math.round((processed / records.length) * 100))
    }
  }

  // Auto-provisioning: criar incorporadoras, regiões, etc. encontradas nos dados
  const autoProvisionFilters = useCallback(async (payload: Record<string, unknown>[]) => {
    const incorporadorasSet = new Set<string>()
    const regioesSet = new Set<string>()
    const bairrosSet = new Set<string>()

    // Coletar todos os valores únicos
    payload.forEach(row => {
      const filtros = row.filtros as Record<string, unknown> | null | undefined
      if (filtros) {
        if (filtros.incorporadora && typeof filtros.incorporadora === 'string') {
          incorporadorasSet.add(filtros.incorporadora.trim())
        }
        if (filtros.regiao && typeof filtros.regiao === 'string') {
          regioesSet.add(filtros.regiao.trim())
        }
        if (filtros.bairro && typeof filtros.bairro === 'string') {
          bairrosSet.add(filtros.bairro.trim())
        }
      }
    })

    // Criar registros no Supabase
    const total = incorporadorasSet.size + regioesSet.size + bairrosSet.size
    let created = 0

    for (const inc of incorporadorasSet) {
      try {
        await addIncorporadora(tenantId, inc)
        created++
      } catch (err) {
        console.warn('Erro ao criar incorporadora:', inc, err)
      }
    }

    for (const reg of regioesSet) {
      try {
        await addRegiao(tenantId, reg)
        created++
      } catch (err) {
        console.warn('Erro ao criar região:', reg, err)
      }
    }

    for (const bai of bairrosSet) {
      try {
        await addBairro(tenantId, bai)
        created++
      } catch (err) {
        console.warn('Erro ao criar bairro:', bai, err)
      }
    }

    if (total > 0) {
      toast.success(`✅ ${created}/${total} categorias criadas automaticamente`)
    }
  }, [tenantId])

  const handleSelectHeaderLine = useCallback(() => {
    // Processar o rawData usando a linha headerLineIndex como header
    if (rawData.length === 0) return toast.error('Nenhum dado no CSV')
    if (headerLineIndex >= rawData.length) return toast.error('Linha selecionada não existe')
    
    const headerRow = rawData[headerLineIndex]
    const dataRows = rawData.slice(headerLineIndex + 1)
    
    // Converter array de arrays em array de objetos
    const processed: Record<string, string>[] = dataRows.map(row => {
      const obj: Record<string, string> = {}
      headerRow.forEach((h, i) => {
        obj[h] = row[i] || ''
      })
      return obj
    })
    
    setHeaders(headerRow)
    setRows(processed)
    
    // Sugerir mapeamento
    const suggested: Record<string, string> = {}
    for (const h of headerRow) {
      const sampleValue = processed[0]?.[h] || ''
      const s = suggestMapping(h, sampleValue)
      if (s) suggested[h] = s
    }
    setMapping(suggested)
    setRawData([]) // limpar rawData após processar
    toast.success('Header selecionado — verifique o mapeamento')
  }, [headerLineIndex, rawData])

  const handleImport = useCallback(async () => {
    if (!tenantId) return toast.error('Tenant não encontrado')
    if (rows.length === 0) return toast.error('Nenhum registro para importar')
        // Normalizar mapeamento: se alguém mapeou para 'price', convertemos para 'preco'
    const normalizedMapping: Record<string, string> = { ...mapping }
    let hadPriceMapping = false
    for (const k of Object.keys(normalizedMapping)) {
      if (normalizedMapping[k] === 'price') {
        normalizedMapping[k] = 'preco'
        hadPriceMapping = true
      }
    }
    if (hadPriceMapping) {
      toast('Mapeamento com campo `price` normalizado para `preco`')
    }

    // Construir objetos para inserir
    // Identificar coluna usada como 'nome' (mapeada ou heurística).
    const mappedNomeHeader = Object.keys(normalizedMapping).find(h => normalizedMapping[h] === 'nome')
    // Se não houver mapeamento explícito, tentar heurística no header (nome, titulo, empreendimento)
    const heuristicNomeHeader = !mappedNomeHeader ? headers.find(h => /nome|title|titulo|empreendimento|nome_do_imovel/i.test(h)) : undefined
    const nomeHeaderToUse = mappedNomeHeader || heuristicNomeHeader || null
    
    if (!mappedNomeHeader && heuristicNomeHeader) {
      // OK
    } else if (!nomeHeaderToUse) {
      return toast.error(`Nenhuma coluna mapeada para "nome". Mapeie uma coluna para "nome" antes de importar.`)
    }

    const rowsToImport = nomeHeaderToUse ? rows.filter(r => String(r[nomeHeaderToUse] || '').trim() !== '') : rows

    // Construir payload, com fallback para 'nome' e coleta de linhas puladas
    const payload: Record<string, unknown>[] = []
    const skipped: { idx: number; reason: string }[] = []
    rowsToImport.forEach((r, idx) => {
      const obj: Record<string, unknown> = { tenant_id: tenantId }
      
      // Debug: mostrar primeira linha do CSV
      if (idx === 0) {
        console.log('🔍 Primeira linha do CSV:', r)
        console.log('🔍 Headers disponíveis:', headers)
        console.log('🔍 Mapeamento completo:', normalizedMapping)
      }
      
      for (const h of headers) {
        const target = normalizedMapping[h]
        if (!target) {
          if (idx === 0) console.log(`⚠️ Coluna "${h}" não mapeada (valor: ${r[h]})`)
          continue
        }
        let value: string | number | string[] | boolean | null = r[h]
        
        if (idx === 0) {
          console.log(`✅ Mapeando "${h}" → "${target}" = "${value}"`)
        }
        // transformar arrays de tags e tipo (podem ter múltiplos valores separados por vírgula)
        if ((target === 'tags' || target === 'tipo') && typeof value === 'string') {
          value = value.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
        }
        if ((target === 'preco' || target === 'area_total' || target === 'area_construida' || target === 'quartos' || target === 'banheiros' || target === 'vagas_garagem') && value !== undefined && value !== null && value !== '') {
          // Normalize numeric strings taking into account different formats:
          // - If contains both '.' and ',', assume '.' thousands and ',' decimal (e.g. 1.234,56)
          // - If contains only ',', treat it as decimal separator (24,5 -> 24.5)
          // - If contains only '.', treat it as decimal separator (or integer with dot) and keep it
          // - Remove currency symbols like R$ or $
          // - Extract first number from ranges (e.g. "25,7 a 32,1" -> "25,7")
          let s = String(value).trim()
          
          // Remove units like m², m, etc
          s = s.replace(/\s*m[²2]?\s*/gi, '')
          
          // Extract first number from ranges (e.g. "25,7 a 32,1" -> "25,7")
          const rangeMatch = s.match(/[\d.,]+/)
          if (rangeMatch) {
            s = rangeMatch[0]
          }
          
          s = s.replace(/\s+/g, '')
          s = s.replace(/R\$/gi, '')
          s = s.replace(/\$/g, '')
          s = s.replace(/[^\d.,]/g, '') // Remove any remaining non-numeric chars except . and ,
          
          const hasDot = s.indexOf('.') >= 0
          const hasComma = s.indexOf(',') >= 0
          let cleaned = s
          if (hasDot && hasComma) {
            // e.g. 1.234,56 -> 1234.56
            cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.')
          } else if (!hasDot && hasComma) {
            // e.g. 24,5 -> 24.5
            cleaned = cleaned.replace(/,/g, '.')
          } // else: hasDot && !hasComma -> keep dot as decimal
          const num = Number(cleaned)
          if (Number.isFinite(num)) {
            // integer fields should be integer
            const integerFields = ['quartos', 'banheiros', 'vagas_garagem']
            if (integerFields.includes(target)) {
              // round to nearest integer to avoid Postgres 22P02
              value = Math.round(num)
            } else {
              value = num
            }
          } else {
            value = null
          }
        } else if ((target === 'preco' || target === 'area_total' || target === 'area_construida' || target === 'quartos' || target === 'banheiros' || target === 'vagas_garagem') && (value === undefined || value === null || value === '')) {
          // converter strings vazias para null em campos numéricos para evitar erro 22P02
          value = null
        }
        if (target === 'ativo' || target === 'destaque' || target === 'decorado' || target === 'financiamento') {
          const v = String(value || '').toLowerCase()
          value = v === 'true' || v === '1' || v === 'sim' || v === 's' || v === 'yes'
        }

        // Campos que vão para `filtros` JSON (não são colunas da tabela)
        const filtroFields = ['fase', 'entrega', 'incorporadora', 'regiao', 'estado', 'modalidade']
        if (filtroFields.includes(target)) {
          const prev = (obj.filtros as Record<string, unknown>) || {}
          // Se for modalidade, converte string separada por vírgula em array
          if (target === 'modalidade' && typeof value === 'string') {
            prev[target] = value.split(',').map(v => v.trim()).filter(Boolean)
          } else {
            prev[target] = value
          }
          obj.filtros = prev
        } else {
          // Campos top-level da tabela (nome, tipo, preco, endereco, bairro, cidade, etc.)
          obj[target] = value
        }
      }
      
      // Garantir que 'nome' exista: fallback para descricao ou endereco
      const nomeVal = obj['nome'] || obj['descricao'] || obj['endereco'] || ''
      
      if (!nomeVal || String(nomeVal).trim() === '') {
        // pular esta linha — nome obrigatório no DB
        skipped.push({ idx, reason: 'nome ausente' })
        return
      }
      
      // normalizar nome como string
      obj['nome'] = String(nomeVal).trim()
      
      // Garantir campos obrigatórios do banco
      if (!obj['preco'] && obj['preco'] !== 0) {
        obj['preco'] = 0 // Default para preço
      }
      if (!obj['tipo']) {
        obj['tipo'] = 'apartamento' // Default
      }
      
      payload.push(obj)
    })

    if (payload.length === 0) {
      toast.error('Nenhum registro válido para importar — todas linhas faltam campo obrigatório `nome`.')
      return
    }

    // Debug: mostrar payload antes de enviar
    console.log('📊 Total de registros a importar:', payload.length)
    console.log('📋 Primeiro registro do payload:', payload[0])
    console.log('🗂️ Campos do primeiro registro:', Object.keys(payload[0]))
    console.log('🔗 Mapeamento usado:', normalizedMapping)
    console.log('📑 Headers do CSV:', headers)

    // Importar direto
    try {
      setImporting(true)
      setImportProgress(0)
      
      // Passo 1: Auto-provisioning de filtros
      await autoProvisionFilters(payload)
      
      // Passo 2: Importar produtos
      await sendToSupabase(payload)
      setImportProgress(100)
      toast.success(`✅ ${payload.length} imóveis importados com sucesso!`)
      onImported?.()
      onClose()
    } catch (err) {
      console.error('Import error', err)
      toast.error('Erro ao importar — veja console')
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }, [headers, mapping, rows, tenantId, autoProvisionFilters, onClose, onImported])



  // Sugestão IA (placeholder): envia headers + amostras para um endpoint OpenAI se configurado
  const tryAiSuggest = useCallback(async () => {
    const member = useAuthStore.getState().member
    if (!member?.tenant_id) {
      return toast.error('Erro: usuário sem tenant')
    }

    try {
      toast('Pedindo sugestão à IA...')
      // Simples payload: headers + 3 linhas
      const sample = rows.slice(0, 3)
      // Usar o prompt personalizado do usuário — retornar apenas JSON puro
      const prompt = `Você é um assistente especializado em mapear colunas de CSV para campos de um sistema de CRM imobiliário.

CAMPOS VÁLIDOS DO SISTEMA (USAR APENAS ESTES):
- nome (nome do imóvel/empreendimento - obrigatório)
- descricao (descrição detalhada do imóvel)
- preco (valor em R$ - número)
- ativo (booleano: true/false)
- destaque (booleano: true/false)
- capa_url (URL da imagem principal)
- galeria_urls (URLs de imagens adicionais)
- arquivo_urls (URLs de arquivos/documentos)
- tags (array de tags/palavras-chave)
- tipo (tipo do imóvel: apartamento, casa, terreno, etc)
- finalidade (venda, aluguel, etc)
- fase (fase da obra: lançamento, construção, pronto)
- modalidade (modalidade do programa: R2V, HMP, HIS2, N.R., etc)
- entrega (data ou previsão de entrega)
- area_total (área total em m² - número)
- area_construida (área construída em m² - número)
- quartos (quantidade de quartos - número)
- banheiros (quantidade de banheiros - número)
- vagas_garagem (quantidade de vagas - número)
- endereco (endereço completo)
- bairro (bairro/região)
- cidade (cidade)
- cep (código postal)

REGRAS IMPORTANTES:
1. RETORNE APENAS campos da lista acima. NUNCA invente campos novos.
2. Se uma coluna não corresponder a nenhum campo válido, use string vazia "".
3. Colunas com símbolos monetários (R$, $) ou palavras como "valor", "preço", "price" → "preco"
4. Retorne APENAS um objeto JSON puro no formato: {"nome_coluna_csv": "campo_sistema"}
5. Não adicione explicações, markdown, ou texto extra. Apenas o JSON.

HEADERS DO CSV:
${JSON.stringify(headers)}

AMOSTRAS (primeiras 3 linhas):
${JSON.stringify(sample)}

Retorne agora o mapeamento em JSON puro:`

      // Chamar Edge Function no Supabase
      const { data, error } = await supabase.functions.invoke('openai-proxy', {
        body: {
          tenant_id: member.tenant_id,
          prompt,
          max_tokens: 800,
          model: 'gpt-4o-mini'
        }
      })

      if (error) {
        console.error('Erro ao chamar Edge Function:', error)
        toast.error('Erro ao conectar com IA. Tente novamente.')
        return
      }

      // Extrair conteúdo de forma robusta
      const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || ''
      // Se não houver texto, logar objeto inteiro para debug e avisar o usuário
      if (!text || String(text).trim() === '') {
        console.warn('AI suggestion empty — full response:', json)
        toast.error('IA não retornou conteúdo útil — verifique o console para a resposta bruta.')
        // não lançar para permitir inspeção manual
        return
      }
      // tentar parse robustamente: 1) JSON.parse direto 2) extrair bloco ```json``` 3) extrair primeiro {...}
      let parsed: Record<string, string> | null = null
      try {
        parsed = JSON.parse(text)
      } catch (parseErr) {
        // tentar extrair bloco ```json
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
        const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : null
        const fallback = candidate || (() => {
          const first = text.indexOf('{')
          const last = text.lastIndexOf('}')
          if (first >= 0 && last > first) return text.slice(first, last + 1)
          return null
        })()
        if (fallback) {
          try {
            parsed = JSON.parse(fallback as string)
          } catch (err2) {
            console.error('AI mapping parse failed, raw text:', text)
            throw err2
          }
        } else {
          console.warn('AI mapping returned non-JSON response:', text, parseErr)
          throw new Error('AI returned non-JSON response')
        }
      }
  if (!parsed || typeof parsed !== 'object') throw new Error('Parsed suggestion is not an object')
      if (Object.keys(parsed).length === 0) {
        toast('IA retornou mapeamento vazio — verifique a resposta bruta abaixo')
      } else {
        // Normalizar sugestões da IA para os campos canônicos do sistema
        const canonicalize = (s: unknown) => {
          if (!s && s !== 0) return ''
          const str = String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
          const cleaned = str.replace(/[^a-z0-9_]/g, '_')
          // mapeamentos manuais comuns
          const dict: Record<string, string> = {
            'tipologia': 'tipo',
            'tipologia_s': 'tipo',
            'tipologia_imovel': 'tipo',
            'tipo_de_imovel': 'tipo',
            'tipo_imovel': 'tipo',
            'descricao_do_imovel': 'descricao',
            'descricao': 'descricao',
            'nome': 'nome',
            'nome_do_imovel': 'nome',
            'empreendimento': 'nome',
            'preco': 'preco',
            'price': 'preco',
            'valor': 'preco',
            'preco_a_partir_de': 'preco',
            'valor_a_partir_de': 'preco',
            'r_': 'preco',
            '_': 'preco',
            'valores': 'preco',
            'precos': 'preco',
            'area': 'area_total',
            'area_total': 'area_total',
            'metragem': 'area_total',
            'area_construida': 'area_construida',
            'construida': 'area_construida',
            'quartos': 'quartos',
            'banheiros': 'banheiros',
            'vagas': 'vagas_garagem',
            'vagas_garagem': 'vagas_garagem',
            'garagem': 'vagas_garagem',
            'tags': 'tags',
            'tipo': 'tipo',
            'finalidade': 'finalidade',
            'modalidade': 'modalidade',
            'fase': 'fase',
            'lancamento': 'fase',
            'entrega': 'entrega',
            'data_entrega': 'entrega',
            'previsao_entrega': 'entrega',
            'endereco': 'endereco',
            'bairro': 'bairro',
            'regiao': 'regiao',
            'regiao_imovel': 'regiao',
            'zona': 'regiao',
            'area_regiao': 'regiao',
            'cidade': 'cidade',
            'cep': 'cep',
            'capa': 'capa_url',
            'capa_url': 'capa_url',
            'galeria': 'galeria_urls',
            'galeria_urls': 'galeria_urls',
            'arquivo': 'arquivo_urls',
            'arquivo_urls': 'arquivo_urls',
            'ativo': 'ativo',
            'destaque': 'destaque',
            'incorporadora': 'incorporadora',
            'incorporadora_imovel': 'incorporadora',
            'developer': 'incorporadora',
            'empreendedor': 'incorporadora',
            'estado': 'estado',
            'uf': 'estado',
            'unidade_federativa': 'estado',
            'decorado': 'decorado',
            'decoracao': 'decorado',
            'decoração': 'decorado',
            'financiamento': 'financiamento',
            'financia': 'financiamento',
            'financeira': 'financiamento'
          }
          if (dict[cleaned]) return dict[cleaned]
          if (TARGET_FIELDS.includes(cleaned)) return cleaned
          return ''
        }

        // Para garantir que as chaves do mapping batam com os headers atuais, mapeamos por header
        const normalized: Record<string, string> = {}
        const unknowns = new Set<string>()
        const parsedKeys = Object.keys(parsed)
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i]
          // procurar correspondência direta nas chaves retornadas pela IA
          let foundKey: string | undefined = parsedKeys.find(k => String(k) === String(h))
          if (!foundKey) {
            // tentativas menos rígidas
            const low = h.toLowerCase().trim()
            foundKey = parsedKeys.find(k => String(k).toLowerCase().trim() === low)
          }
          if (!foundKey) {
            // fallback: usar a mesma posição (quando IA retornou sem header legível)
            foundKey = parsedKeys[i]
          }

          const raw = foundKey ? parsed[foundKey] : undefined
          const cand = canonicalize(raw)
          if (cand) normalized[h] = cand
          else {
            const maybe = String(raw || '').toLowerCase()
            if (TARGET_FIELDS.includes(maybe)) normalized[h] = maybe
            else {
              normalized[h] = ''
              if (raw) unknowns.add(String(raw))
            }
          }
        }

        setMapping(normalized)
        if (unknowns.size > 0) {
          toast(`IA sugeriu campos desconhecidos: ${Array.from(unknowns).slice(0,5).join(', ')}. Verifique manualmente.`)
        } else {
          toast.success('Mapeamento sugerido pela IA aplicado')
        }
      }
    } catch (err) {
      console.error('AI mapping error', err)
      // mostrar aviso mais amigável ao usuário
      toast.error('Erro ao solicitar sugestão da IA — resposta inesperada. Veja console para detalhes.')
    }
  }, [headers, rows])

  const preview = useMemo(() => {
    if (optimizedRows.length > 0) return optimizedRows.slice(0, 6)
    return rows.slice(0, 6)
  }, [rows, optimizedRows])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar CSV de Imóveis" maxWidthClass="max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-4 py-2 rounded-2xl cursor-pointer shadow-md hover:brightness-95">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            Escolher arquivo
          </label>
          <div className="text-sm text-slate-300 truncate max-w-xs">{fileName ?? 'Nenhum arquivo selecionado'}</div>
        </div>

        {/* UI para escolher qual linha é o header */}
        {rawData.length > 0 && (
          <div className="bg-slate-800/40 p-4 rounded-xl border border-white/10 space-y-3">
            <div className="text-sm font-semibold text-slate-200">Qual linha contém os nomes das colunas?</div>
            <div className="flex items-end gap-3">
              <div>
                <label className="text-xs text-slate-400">Linha:</label>
                <select
                  value={headerLineIndex}
                  onChange={e => setHeaderLineIndex(Number(e.target.value))}
                  className="mt-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
                >
                  {rawData.slice(0, 10).map((_, idx) => (
                    <option key={idx} value={idx}>
                      Linha {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSelectHeaderLine} size="sm">Confirmar header</Button>
            </div>
            
            {/* Preview das linhas */}
            <div className="text-xs text-slate-400 mt-3">Preview:</div>
            <div className="bg-slate-900 rounded overflow-auto max-h-48 text-xs border border-white/5">
              {rawData.slice(0, 5).map((row, idx) => (
                <div key={idx} className={`p-2 border-b border-white/5 ${idx === headerLineIndex ? 'bg-cyan-500/20 font-bold text-cyan-300' : ''}`}>
                  {row.slice(0, 5).join(' | ')} {row.length > 5 ? '...' : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="ml-auto flex items-center gap-3">
            <label className="text-sm text-slate-300 flex items-center gap-2">
              <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} className="accent-cyan-500" />
              Usar IA (mapa)
            </label>
            {useAI && (
              <button className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm hover:bg-white/6" onClick={tryAiSuggest}>Sugerir mapeamento</button>
            )}

            <div className="h-6 border-l border-white/6" />

            <button 
              className="px-3 py-1 rounded bg-emerald-600 text-white text-sm shadow-sm hover:brightness-95 disabled:opacity-50"
              onClick={() => setShowOptimizeModal(true)}
              disabled={rows.length === 0}
            >
              ✨ Otimizar com IA
            </button>
          </div>
        </div>

        {headers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">Mapeamento de colunas:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-auto p-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate font-medium">{h}</div>
                    <div className="text-xs text-slate-400 truncate">{rows[0] && String(rows[0][h] ?? '')}</div>
                  </div>
                  <div className="w-56">
                    <select value={mapping[h] || ''} onChange={e => handleMapChange(h, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm">
                      <option value="">-- ignorar --</option>
                      {TARGET_FIELDS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
          </div>
        )}

        {preview.length > 0 && (
          <div>
            <div className="text-sm text-gray-300 mb-2">
              Preview (primeiras {preview.length} linhas)
            </div>

            {importing && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Importando...</span>
                  <span className="font-semibold text-cyan-400">{importProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300 rounded-full shadow-lg shadow-cyan-500/50"
                    style={{ width: `${importProgress}%` }}
                  />

                </div>
              </div>
            )}

            <div className="overflow-auto max-h-80 border border-white/10 rounded bg-white/2 text-sm">
              <table className="w-full table-auto text-left text-xs">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).map(k => (
                      <th key={k} className="px-3 py-2 text-gray-300 sticky top-0 bg-slate-900/90 z-10 text-xs font-semibold border-b border-white/10">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, idx) => (
                    <tr key={idx} className={`align-top border-t border-white/5 ${idx % 2 === 0 ? 'bg-white/3' : ''} hover:bg-white/5 transition`}>
                      {Object.keys(preview[0]).map(k => {
                        const val = r[k]
                        const displayVal = val == null ? '—' : (Array.isArray(val) ? JSON.stringify(val) : String(val))
                        return (
                          <td key={k} className="px-3 py-2 text-white align-top" title={displayVal}>
                            <div className="max-w-xs truncate">{displayVal}</div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button disabled={importing || rows.length === 0} onClick={handleImport}>{importing ? 'Importando...' : 'Importar para o CRM'}</Button>
        </div>
      </div>

      {/* Modal separado para otimização com IA */}
      <ImportCsvOptimize
        isOpen={showOptimizeModal}
        onClose={() => setShowOptimizeModal(false)}
        rows={rows}
        onOptimized={(optimized) => {
          // Garantir que TODOS os registros otimizados tenham tenant_id
          const withTenantId = optimized.map(r => ({
            ...r,
            tenant_id: tenantId
          }))
          setOptimizedRows(withTenantId)
          setRows(withTenantId.map(r => {
            const out: Record<string, string> = {}
            for (const k of Object.keys(r)) {
              const val = (r as Record<string, unknown>)[k]
              out[k] = val == null ? '' : String(val)
            }
            return out
          }))
          toast.success('✨ Dados otimizados aplicados ao preview!')
        }}
      />
    </Modal>
  )
}
