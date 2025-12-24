
import { supabase } from '../lib/supabase'

export interface Sale {
  id: string
  tenant_id: string
  lead_id: string
  title: string
  value: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'canceled'
  recurrence_id?: string | null
  created_at: string
}

export type NewSale = Omit<Sale, 'id' | 'created_at' | 'tenant_id'> & { tenant_id?: string }

export async function getLeadSales(leadId: string) {
  const { data, error } = await supabase
    .from('lead_sales')
    .select('*')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: false })

  if (error) throw error
  return data as Sale[]
}

export async function createSale(sale: NewSale) {
  const { data, error } = await supabase
    .from('lead_sales')
    .insert(sale)
    .select()
    .single()

  if (error) throw error
  return data as Sale
}

export async function createRecurringSales(sales: NewSale[]) {
  const { data, error } = await supabase
    .from('lead_sales')
    .insert(sales)
    .select()

  if (error) throw error
  return data as Sale[]
}

export async function updateSale(id: string, updates: Partial<Sale>) {
  const { data, error } = await supabase
    .from('lead_sales')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Sale
}

export async function deleteSale(id: string) {
  const { error } = await supabase
    .from('lead_sales')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getSalesSummary(leadId: string) {
    const sales = await getLeadSales(leadId)

    const totalRevenue = sales
        .filter(s => s.status === 'paid')
        .reduce((sum, s) => sum + Number(s.value), 0)

    const pendingRevenue = sales
        .filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + Number(s.value), 0)

    return { totalRevenue, pendingRevenue, count: sales.length }
}
