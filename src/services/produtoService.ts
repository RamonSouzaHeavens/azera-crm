import { supabase } from '../lib/supabase'

interface UpdateProdutoData {
  nome?: string
  descricao?: string
  price?: number
  preco?: number
  tipo?: string
  finalidade?: string
  area_total?: number | null
  area_construida?: number | null
  quartos?: number | null
  banheiros?: number | null
  vagas_garagem?: number | null
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  cep?: string | null
  destaque?: boolean
  ativo?: boolean
  tags?: string[]
  capa_url?: string | null
  galeria_urls?: string[] | null
  arquivo_urls?: string[] | null
  filtros?: Record<string, unknown>
  proprietario_id?: string | null
}

/**
 * Atualiza um produto com tratamento robusto para evitar cache issues
 * Se encontrar erro de schema cache, tenta novamente após delay
 */
export async function updateProdutoRobust(
  id: string,
  tenantId: string,
  data: UpdateProdutoData
) {
  try {
    // Tentar atualização normal primeiro
    const { error, data: result } = await supabase
      .from('produtos')
      .update(data)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      // Se for erro de cache, tentar novamente após um pequeno delay
      if (error.message?.includes('schema cache')) {
        console.warn('Schema cache desatualizado, tentando novamente...')
        await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar 1 segundo
        return await updateProdutoRobust(id, tenantId, data)
      }
      throw error
    }

    return { success: true, data: result }
  } catch (err) {
    console.error('Erro ao atualizar produto:', err)
    return { success: false, error: err }
  }
}

/**
 * Cria um novo produto com tratamento de cache
 */
export async function createProdutoRobust(tenantId: string, data: UpdateProdutoData & { nome: string; preco: number }) {
  try {
    const insertData = {
      tenant_id: tenantId,
      ...data,
    }

    const { error, data: result } = await supabase
      .from('produtos')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar produto:', error)
      return { success: false, error }
    }

    return { success: true, data: result }
  } catch (err) {
    console.error('Erro ao criar produto:', err)
    return { success: false, error: err }
  }
}

/**
 * Exclui múltiplos produtos de uma vez, removendo todas as dependências
 * Tenta usar RPC primeiro, se falhar usa o método tradicional
 */
export async function deleteProdutosInBulk(produtoIds: string[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>
  }

  try {
    // Tentar usar função RPC para melhor performance
    const { data, error } = await supabase.rpc('delete_produtos_bulk', {
      produto_ids: produtoIds
    })

    if (!error && data) {
      // Processar resultados da RPC
      data.forEach((result: { produto_id: string; success: boolean; error_message: string | null }) => {
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push({
            id: result.produto_id,
            error: result.error_message || 'Erro desconhecido'
          })
        }
      })
      return results
    }

    // Se RPC falhar, usar método tradicional
    console.warn('RPC não disponível, usando método tradicional')
  } catch (rpcError) {
    console.warn('Erro ao usar RPC, fallback para método tradicional:', rpcError)
  }

  // Método tradicional (fallback)
  for (const id of produtoIds) {
    try {
      // 1. Remover dependências em tarefas_produtos
      await supabase
        .from('tarefas_produtos')
        .delete()
        .eq('produto_id', id)

      // 2. Remover dependências em cliente_produtos (se existir)
      try {
        await supabase
          .from('cliente_produtos')
          .delete()
          .eq('produto_id', id)
      } catch {
        // Ignorar se a tabela não existir
      }

      // 3. Atualizar tarefas (remover referência)
      await supabase
        .from('tarefas')
        .update({ produto_id: null })
        .eq('produto_id', id)

      // 4. Excluir o produto
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id)

      if (error) throw error

      results.success++
    } catch (error) {
      console.error(`Erro ao excluir produto ${id}:`, error)
      results.failed++
      results.errors.push({
        id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  return results
}
