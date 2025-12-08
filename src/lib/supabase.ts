import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
})

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          email: string
          role: 'owner' | 'vendedor'
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          email: string
          role: 'owner' | 'vendedor'
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          email?: string
          role?: 'owner' | 'vendedor'
          name?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          telefone: string | null
          email: string | null
          status: 'lead' | 'negociacao' | 'fechado' | 'perdido'
          notas: string | null
          valor_potencial: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          telefone?: string | null
          email?: string | null
          status?: 'lead' | 'negociacao' | 'fechado' | 'perdido'
          notas?: string | null
          valor_potencial?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          telefone?: string | null
          email?: string | null
          status?: 'lead' | 'negociacao' | 'fechado' | 'perdido'
          notas?: string | null
          valor_potencial?: number | null
          updated_at?: string
        }
      }
      vendas: {
        Row: {
          id: string
          tenant_id: string
          cliente_id: string
          vendedor_id: string
          valor: number
          produto: string
          status: 'pendente' | 'concluida' | 'cancelada'
          data_venda: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cliente_id: string
          vendedor_id: string
          valor: number
          produto: string
          status?: 'pendente' | 'concluida' | 'cancelada'
          data_venda: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cliente_id?: string
          vendedor_id?: string
          valor?: number
          produto?: string
          status?: 'pendente' | 'concluida' | 'cancelada'
          data_venda?: string
          updated_at?: string
        }
      }
    }
  }
}