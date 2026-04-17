import { createClient } from '@supabase/supabase-js'
import { useHeavensStore } from '../stores/heavensStore'

export function getHeavensClient() {
    const { supabaseUrl, supabaseServiceKey } = useHeavensStore.getState()
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('HeavensAI não está configurado. Instale as credenciais em Configurações.')
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    })
}

// Helpers
function generateSlug(name: string) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export async function fetchHeavensClients() {
    const supabase = getHeavensClient()
    const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, portal_enabled')
        .order('name', { ascending: true })

    if (error) throw error
    return data || []
}

export async function fetchHeavensProjects(clientId: string) {
    const supabase = getHeavensClient()
    const { data, error } = await supabase
        .from('portal_projects')
        .select('id, name, description')
        .eq('tenant_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

export async function createHeavensClient(name: string) {
    const supabase = getHeavensClient()
    const { data, error } = await supabase
        .from('tenants')
        .insert([{
            name,
            slug: generateSlug(name),
            primary_color: '#caee58',
            portal_enabled: false,
            wa_enabled: false
        }])
        .select('id, name, slug')
        .single()

    if (error) throw error
    return data
}

export async function ensureHeavensProjectExists(clientId: string) {
    const supabase = getHeavensClient()
    const { data: projects, error: checkError } = await supabase
        .from('portal_projects')
        .select('id, name')
        .eq('tenant_id', clientId)
        .limit(1)

    if (checkError) throw checkError

    if (projects && projects.length > 0) {
        return projects[0].id
    }

    // Define as generic project
    const { data: newProject, error: createError } = await supabase
        .from('portal_projects')
        .insert([{
            tenant_id: clientId,
            name: 'Demandas Gerais',
            description: 'Projeto automático',
            is_active: true
        }])
        .select('id')
        .single()

    if (createError) throw createError
    return newProject.id
}

export async function postHeavensTask(taskPayload: {
    clientId: string
    projectId: string
    title: string
    description?: string
    type: string
    tags?: string[]
    deliveryDate?: string
}) {
    const supabase = getHeavensClient()
    const { data, error } = await supabase
        .from('portal_demands')
        .insert([{
            project_id: taskPayload.projectId,
            tenant_id: taskPayload.clientId,
            title: taskPayload.title,
            description: taskPayload.description || null,
            type: taskPayload.type || 'outro',
            status: 'em_andamento',
            tags: taskPayload.tags || [],
            delivery_date: taskPayload.deliveryDate || null,
            is_pinned: false
        }])
        .select('id, status')
        .single()

    if (error) throw error
    return data
}
