import { serve } from 'https://deno.land/std@0.214.0/http/server.ts'
import jsPDF from 'https://esm.sh/jspdf@2.5.1'

interface Payload {
  templateId: 't1' | 't2' | 't3' | string
  clientName: string
  value: string
  validity: string
  notes: string
  date: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey'
}

const renderCommercial = (data: Payload) => {
  const doc = new jsPDF()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Proposta Comercial', 20, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(`Cliente: ${data.clientName}`, 20, 40)
  doc.text(`Valor: ${data.value}`, 20, 50)
  doc.text(`Validade: ${data.validity} dias`, 20, 60)

  doc.setFontSize(11)
  const splitNotes = doc.splitTextToSize(data.notes, 170)
  doc.text('Detalhes:', 20, 80)
  doc.text(splitNotes, 20, 88)

  doc.setFontSize(10)
  doc.text(`Data: ${data.date}`, 20, 120)
  return doc
}

const renderContract = (data: Payload) => {
  const doc = new jsPDF()
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 105, 20, { align: 'center' })

  doc.setLineWidth(0.4)
  doc.line(20, 24, 190, 24)

  doc.setFont('times', 'normal')
  doc.setFontSize(12)
  let y = 36
  const addPara = (text: string) => {
    const lines = doc.splitTextToSize(text, 170)
    doc.text(lines, 20, y)
    y += lines.length * 6 + 4
  }

  addPara(`Pelo presente instrumento particular, de um lado AZERA TECNOLOGIA, e de outro lado ${data.clientName}.`)
  doc.setFont('times', 'bold')
  doc.text('CLÁUSULA 1ª - DO VALOR:', 20, y)
  y += 6
  doc.setFont('times', 'normal')
  addPara(`Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de ${data.value}.`)

  doc.setFont('times', 'bold')
  doc.text('CLÁUSULA 2ª - OBSERVAÇÕES:', 20, y)
  y += 6
  doc.setFont('times', 'normal')
  addPara(data.notes)

  doc.setFont('times', 'bold')
  doc.text('CLÁUSULA 3ª - VALIDADE:', 20, y)
  y += 6
  doc.setFont('times', 'normal')
  addPara(`Proposta válida por ${data.validity} dias a contar de ${data.date}.`)

  y += 10
  doc.text('__________________________', 40, y)
  doc.text('__________________________', 140, y)
  y += 6
  doc.text('CONTRATADA', 52, y)
  doc.text('CONTRATANTE', 152, y)

  return doc
}

const renderQuote = (data: Payload) => {
  const doc = new jsPDF()
  // Header
  doc.setFillColor('#f59e0b')
  doc.rect(0, 0, 210, 25, 'F')
  doc.setTextColor('#0f172a')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Orçamento', 15, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Data: ${data.date}  •  Validade: ${data.validity} dias`, 120, 12)
  doc.text(`#${Math.floor(Math.random() * 1000)}`, 120, 18)

  // Body
  let y = 40
  doc.setTextColor('#334155')
  doc.setFontSize(11)
  doc.text('Cliente:', 15, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text(data.clientName, 35, y)

  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text('Descrição', 15, y)
  doc.text('Valor', 180, y, { align: 'right' })

  doc.setDrawColor('#e2e8f0')
  doc.line(15, y + 2, 195, y + 2)

  y += 10
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(data.notes, 150)
  doc.text(descLines, 15, y)
  doc.text(data.value, 195, y, { align: 'right' })

  y += descLines.length * 6 + 10
  doc.setFillColor('#fff7ed')
  doc.rect(15, y, 180, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#b45309')
  doc.text('TOTAL', 20, y + 8)
  doc.text(data.value, 190, y + 8, { align: 'right' })

  return doc
}

const renderDocument = (payload: Payload) => {
  switch (payload.templateId) {
    case 't2':
      return renderContract(payload)
    case 't3':
      return renderQuote(payload)
    case 't1':
    default:
      return renderCommercial(payload)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = (await req.json()) as Payload
    if (!payload?.clientName || !payload?.templateId || !payload?.value) {
      return new Response(JSON.stringify({ error: 'clientName, templateId e value são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const doc = renderDocument(payload)
    const buffer = doc.output('arraybuffer')

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposta_${payload.templateId}.pdf"`
      }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao gerar PDF'
    console.error('[generate-proposal] error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
