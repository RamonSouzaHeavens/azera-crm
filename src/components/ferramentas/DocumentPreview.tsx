import React from 'react'

export interface FormData {
  clientName: string
  documentValue: string
  validityDays: string
  notes: string
}

export const DocumentPreview = ({ templateId, data }: { templateId: string; data: FormData }) => {
  if (!templateId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs uppercase tracking-widest font-semibold bg-slate-50">
        Selecione um modelo
      </div>
    )
  }

  if (templateId === 't1') {
    return (
      <div className="w-full aspect-[210/297] bg-white shadow-md flex flex-col text-[10px] text-slate-700 overflow-hidden animate-in fade-in duration-500">
        <div className="bg-blue-600 h-16 flex items-center px-6 justify-between text-white">
          <div className="font-bold text-lg">AZERA</div>
          <div className="text-[8px] opacity-80">Proposta #2024-001</div>
        </div>
        <div className="p-8 flex-1 flex flex-col">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Proposta Comercial</h1>
          <p className="text-slate-500 text-[9px] mb-6">Preparado para: <strong>{data.clientName}</strong></p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded">
              <span className="text-slate-400 block mb-1 text-[8px]">Valor Total</span>
              <span className="text-blue-600 font-bold text-sm">R$ {data.documentValue}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="text-slate-400 block mb-1 text-[8px]">Validade</span>
              <span className="text-slate-700 font-bold text-sm">{data.validityDays} dias</span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-[9px] font-bold text-slate-700 uppercase mb-2 border-b pb-1">Escopo</h3>
            <p className="text-slate-600 leading-relaxed text-[9px] whitespace-pre-wrap">{data.notes}</p>
          </div>

          <div className="mt-auto pt-6 border-t flex justify-between items-end">
            <div className="text-[8px] text-slate-400">
              Azera Tecnologia Ltda<br />CNPJ: 00.000.000/0001-00
            </div>
            <div className="w-24 border-b border-slate-300 text-center pb-1">
              <span className="text-[8px] text-slate-400">Assinatura</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (templateId === 't2') {
    return (
      <div className="w-full aspect-[210/297] bg-white shadow-md p-8 flex flex-col font-sans text-[10px] text-slate-800 overflow-hidden animate-in fade-in duration-500">
        <div className="text-center mb-5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Contrato</p>
          <h1 className="text-base font-bold text-slate-900">Prestacao de Servicos</h1>
        </div>
        <div className="text-[9px] leading-relaxed text-justify space-y-3 text-slate-700">
          <p>
            <strong>Contratada:</strong> Azera Tecnologia Ltda.
            <br />
            <strong>Contratante:</strong> {data.clientName || 'Cliente'}
          </p>
          <p>
            <strong>Clausula 1 - Objeto.</strong> Prestacao de servicos customizados conforme escopo abaixo.
          </p>
          <p>
            <strong>Clausula 2 - Valor.</strong> Investimento total de <strong>R$ {data.documentValue || '0,00'}</strong>, valido por {data.validityDays} dias.
          </p>
          <p>
            <strong>Clausula 3 - Escopo.</strong> {data.notes}
          </p>
        </div>
        <div className="mt-auto pt-6">
          <div className="grid grid-cols-2 gap-6 items-end">
            <div className="text-center">
              <div className="border-b border-slate-400 w-full mb-1"></div>
              <span className="text-[8px] text-slate-500">CONTRATADA</span>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-full mb-1"></div>
              <span className="text-[8px] text-slate-500">CONTRATANTE</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full aspect-[210/297] bg-white shadow-md p-6 flex flex-col text-[10px] text-slate-800 overflow-hidden animate-in fade-in duration-500 border-t-4 border-amber-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Orçamento</h1>
          <p className="text-amber-600 text-[9px] font-medium">#{Math.floor(Math.random() * 1000)}</p>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-slate-500">Data: {new Date().toLocaleDateString()}</div>
          <div className="text-[9px] text-slate-500">Validade: {data.validityDays} dias</div>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded mb-4">
        <p className="text-[9px] font-bold text-slate-700">Cliente:</p>
        <p className="text-[10px] text-slate-600">{data.clientName}</p>
      </div>

      <table className="w-full text-[9px] mb-4">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="text-left p-2">Descrição</th>
            <th className="text-right p-2">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2 text-slate-600">{data.notes.substring(0, 50)}...</td>
            <td className="p-2 text-right text-slate-800 font-mono">R$ {data.documentValue}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-amber-50">
            <td className="p-2 font-bold text-amber-900 text-right">TOTAL</td>
            <td className="p-2 font-bold text-amber-900 text-right font-mono">R$ {data.documentValue}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
