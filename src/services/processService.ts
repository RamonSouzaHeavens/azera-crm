import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type ProcessStatus = 'backlog' | 'em_andamento' | 'revisao' | 'concluido'
export type ProcessPriority = 'baixa' | 'media' | 'alta'

export interface ClientProcess {
  id: string
  tenant_id: string
  client_id: string
  title: string
  description?: string
  status: ProcessStatus
  priority: ProcessPriority
  responsible_user_id?: string
  start_date?: string
  expected_end_date?: string
  completed_date?: string
  external_link?: string
  public_token: string
  order_position: number
  created_at: string
  updated_at: string
  created_by?: string
  
  // Relacionamentos
  responsible_user?: {
    id: string
    display_name: string
    avatar_url?: string
  }
  client?: {
    id: string
    nome: string
    email: string
  }
  current_task?: {
    id: string
    titulo: string
    status: string
  }
}

export interface CreateProcessData {
  client_id: string
  title: string
  description?: string
  priority?: ProcessPriority
  responsible_user_id?: string
  start_date?: string
  expected_end_date?: string
  external_link?: string
}

export interface UpdateProcessData {
  title?: string
  description?: string
  status?: ProcessStatus
  priority?: ProcessPriority
  responsible_user_id?: string
  start_date?: string
  expected_end_date?: string
  external_link?: string
  order_position?: number
  completed_date?: string
}

// Buscar processo por ID
export async function getProcessById(id: string): Promise<ClientProcess> {
  const { data, error } = await supabase
    .from('client_processes')
    .select(`*`)
    .eq('id', id)
    .single()

  if (error) throw error

  // Buscar informações do cliente separadamente
  const processesWithClient = await addClientInfo([data])
  return processesWithClient[0]
}

// Buscar todos os processos do tenant
export async function getProcesses(): Promise<ClientProcess[]> {
  const { data, error } = await supabase
    .from('client_processes')
    .select(`
      *,
      responsible_user:responsible_user_id(id, display_name)
    `)
    .order('order_position', { ascending: true })

  if (error) throw error
  
  // Buscar informações dos clientes separadamente
  const processesWithClients = await addClientInfo(data || [])
  
  return processesWithClients
}

// Adicionar informações do cliente aos processos
async function addClientInfo(processes: ClientProcess[]): Promise<ClientProcess[]> {
  if (processes.length === 0) return []
  
  const clientIds = [...new Set(processes.map(p => p.client_id))]
  
  // Buscar clientes
  const { data: clientsData, error: clientsError } = await supabase
    .from('clientes')
    .select('id, nome, email')
    .in('id', clientIds)
  
  if (clientsError) {
    console.error('Erro ao buscar informações dos clientes:', clientsError)
    return processes
  }
  
  const clientsMap: Record<string, { id: string; nome: string; email: string }> = {}
  
  // Mapear clientes por ID
  for (const client of clientsData || []) {
    clientsMap[client.id] = {
      id: client.id,
      nome: client.nome,
      email: client.email
    }
  }
  
  // Buscar tarefas atuais
  const processIds = processes.map(p => p.id)
  const { data: tasksData, error: tasksError } = await supabase
    .from('tarefas')
    .select('id, titulo, status, process_id')
    .in('process_id', processIds)
    .order('created_at', { ascending: false })
  
  if (tasksError) {
    console.error('Erro ao buscar tarefas dos processos:', tasksError)
  }
  
  // Agrupar tarefas por processo
  const tasksMap: Record<string, { id: string; titulo: string; status: string }> = {}
  if (tasksData) {
    for (const task of tasksData) {
      // Apenas a tarefa mais recente por processo
      if (task.process_id && !tasksMap[task.process_id]) {
        tasksMap[task.process_id] = {
          id: task.id,
          titulo: task.titulo,
          status: task.status
        }
      }
    }
  }
  
  // Adicionar informações do cliente e tarefa atual a cada processo
  return processes.map(process => ({
    ...process,
    client: clientsMap[process.client_id],
    current_task: tasksMap[process.id]
  }))
}

// Buscar processos por cliente
export async function getProcessesByClient(clientId: string): Promise<ClientProcess[]> {
  const { data, error } = await supabase
    .from('client_processes')
    .select(`
      *
    `)
    .eq('client_id', clientId)
    .order('order_position', { ascending: true })

  if (error) throw error
  
  return data || []
}

// Criar novo processo
export async function createProcess(processData: CreateProcessData): Promise<ClientProcess> {
  const { tenant, member } = useAuthStore.getState()
  const tenantId = tenant?.id ?? member?.tenant_id
  
  if (!tenantId) throw new Error('Tenant não encontrado')

  // Buscar próxima posição
  const { count } = await supabase
    .from('client_processes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'backlog')

  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('client_processes')
    .insert({
      ...processData,
      tenant_id: tenantId,
      order_position: (count || 0) + 1,
      created_by: userData.user?.id
    })
    .select(`*`)
    .single()

  if (error) throw error

  // Buscar informações do cliente separadamente
  const processesWithClient = await addClientInfo([data])
  const processWithClient = processesWithClient[0]

  // Criar tarefa associada automaticamente
  await createAssociatedTask(processWithClient)

  return processWithClient
}

// Criar tarefa associada ao processo
async function createAssociatedTask(process: ClientProcess) {
  const { tenant, member } = useAuthStore.getState()
  const tenantId = tenant?.id ?? member?.tenant_id
  
  if (!tenantId) return

  try {
    // Verificar se a tabela usa 'cliente_id' ou 'lead_id' para referenciar o cliente
    const { data: tableInfo } = await supabase
      .from('tarefas')
      .select('cliente_id')
      .limit(1)
      .maybeSingle()

    const clientIdColumn = tableInfo ? 'cliente_id' : 'lead_id'

    await supabase
      .from('tarefas')
      .insert({
        tenant_id: tenantId,
        titulo: `Processo: ${process.title}`,
        descricao: `Tarefa criada automaticamente para o processo: ${process.title}${process.description ? '\n\n' + process.description : ''}`,
        status: 'pendente',
        prioridade: process.priority,
        data_vencimento: process.expected_end_date,
        responsavel_id: process.responsible_user_id,
        [clientIdColumn]: process.client_id, // Usar o nome correto da coluna
        process_id: process.id,
        created_by: process.created_by
      })
  } catch (error) {
    console.error('Erro ao criar tarefa associada:', error)
  }
}

// Atualizar processo
export async function updateProcess(id: string, updates: UpdateProcessData): Promise<ClientProcess> {
  const updateData = { ...updates }
  
  // Se status mudou para concluído, adicionar data de conclusão
  if (updates.status === 'concluido' && !updates.completed_date) {
    updateData.completed_date = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('client_processes')
    .update(updateData)
    .eq('id', id)
    .select(`*`)
    .single()

  if (error) throw error

  // Buscar informações do cliente separadamente
  const processesWithClient = await addClientInfo([data])
  return processesWithClient[0]
}

// Deletar processo
export async function deleteProcess(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_processes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Atualizar posições no drag & drop
export async function updateProcessPositions(updates: { id: string; status: ProcessStatus; order_position: number }[]): Promise<void> {
  const { error } = await supabase.rpc('update_process_positions', { updates })
  if (error) throw error
}

// Buscar processo público (para cliente)
export async function getPublicProcesses(token: string): Promise<ClientProcess[]> {
  const { data, error } = await supabase
    .from('client_processes')
    .select(`*`)
    .eq('public_token', token)
    .order('order_position', { ascending: true })

  if (error) throw error

  // Buscar informações dos clientes separadamente
  return await addClientInfo(data || [])
}

// Gerar link público para cliente
export function generatePublicLink(token: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/client-processes/${token}`
}

// Buscar membros da equipe para responsáveis
export async function getTeamMembers(): Promise<Array<{ id: string; nome: string; email: string }>> {
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id, role, email')
    .eq('status', 'ativo')

  if (error) throw error

  // Buscar informações dos usuários para obter os nomes
  const userIds = data?.map(member => member.user_id) || []
  
  if (userIds.length === 0) return []
  
  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds)
  
  if (usersError) {
    console.error('Erro ao buscar perfis de usuários:', usersError)
    return []
  }
  
  const usersMap: Record<string, string> = {}
  for (const user of usersData || []) {
    usersMap[user.user_id] = user.display_name
  }

  return data?.map(member => ({ 
    id: member.user_id, 
    nome: usersMap[member.user_id] || 'Usuário',
    email: member.email
  })) || []
}

// Buscar clientes/leads
export async function getClients(): Promise<Array<{ id: string; nome: string; email: string }>> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, email')
    .order('nome')

  if (error) throw error
  return (data || []).map(client => ({
    id: client.id,
    nome: client.nome,
    email: client.email
  }))
}