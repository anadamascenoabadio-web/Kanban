import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task, SupabaseConfig } from '../types/crm';

const CONFIG_STORAGE_KEY = 'crm_supabase_config_v1';
const LOCAL_TASKS_KEY = 'crm_kanban_tasks_v1';

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCRIPT DE BANCO DE DADOS & POLÍTICAS DE ARMAZENAMENTO COMPLETO (SUPABASE)
-- Execute este script no "SQL Editor" do seu painel Supabase
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUIDs
create extension if not exists "pgcrypto";

-- 2. Criação da Tabela de Tarefas / Oportunidades do CRM
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client_name text,
  client_email text,
  client_phone text,
  value numeric default 0,
  priority text default 'media' check (priority in ('baixa', 'media', 'alta', 'urgente')),
  due_date text,
  status text not null default 'Não iniciado' check (status in ('Não iniciado', 'Em Andamento', 'Finalizado')),
  tags text[] default '{}'::text[],
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices de performance para busca e filtros rápidos
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_created_at on public.tasks (created_at desc);
create index if not exists idx_tasks_priority on public.tasks (priority);

-- Função e Trigger para atualizar automaticamente o campo updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- ==============================================================================
-- 3. POLÍTICAS DE SEGURANÇA E ARMAZENAMENTO NA TABELA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
alter table public.tasks enable row level security;

-- Política de Leitura (SELECT): Permite visualizar todas as tarefas
drop policy if exists "tasks_select_policy" on public.tasks;
create policy "tasks_select_policy"
  on public.tasks
  for select
  using (true);

-- Política de Inserção (INSERT): Permite criar novas tarefas
drop policy if exists "tasks_insert_policy" on public.tasks;
create policy "tasks_insert_policy"
  on public.tasks
  for insert
  with check (true);

-- Política de Atualização (UPDATE): Permite alterar dados e status das tarefas
drop policy if exists "tasks_update_policy" on public.tasks;
create policy "tasks_update_policy"
  on public.tasks
  for update
  using (true)
  with check (true);

-- Política de Exclusão (DELETE): Permite remover tarefas
drop policy if exists "tasks_delete_policy" on public.tasks;
create policy "tasks_delete_policy"
  on public.tasks
  for delete
  using (true);

-- ==============================================================================
-- 4. BUCKET DE ARMAZENAMENTO DE ARQUIVOS (SUPABASE STORAGE)
-- Armazena anexos, propostas, contratos e documentos vinculados às tarefas
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('crm-arquivos', 'crm-arquivos', true)
on conflict (id) do update set public = true;

-- ==============================================================================
-- 5. POLÍTICAS DE ARMAZENAMENTO DO STORAGE (storage.objects)
-- Observação: storage.objects já possui RLS habilitado nativamente no Supabase
-- ==============================================================================

-- Política de Armazenamento 1: Leitura Pública / Download de arquivos do CRM
drop policy if exists "storage_select_crm_files" on storage.objects;
create policy "storage_select_crm_files"
  on storage.objects
  for select
  using (bucket_id = 'crm-arquivos');

-- Política de Armazenamento 2: Upload de novos arquivos no CRM
drop policy if exists "storage_insert_crm_files" on storage.objects;
create policy "storage_insert_crm_files"
  on storage.objects
  for insert
  with check (bucket_id = 'crm-arquivos');

-- Política de Armazenamento 3: Atualização de arquivos no CRM
drop policy if exists "storage_update_crm_files" on storage.objects;
create policy "storage_update_crm_files"
  on storage.objects
  for update
  using (bucket_id = 'crm-arquivos')
  with check (bucket_id = 'crm-arquivos');

-- Política de Armazenamento 4: Exclusão de arquivos no CRM
drop policy if exists "storage_delete_crm_files" on storage.objects;
create policy "storage_delete_crm_files"
  on storage.objects
  for delete
  using (bucket_id = 'crm-arquivos');

-- ==============================================================================
-- 6. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
-- ==============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
`;

// Retrieve saved or env-based Supabase config
export function getSavedConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
      };
    }
  } catch (e) {
    console.warn('Erro ao ler configuração do localStorage', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

export function saveConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    // Reset client cache
    cachedClient = null;
  } catch (e) {
    console.error('Erro ao salvar configuração do Supabase', e);
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSavedConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const currentKey = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url.trim(), config.anonKey.trim(), {
      auth: {
        persistSession: false,
      },
    });
    cachedKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar Supabase Client', err);
    return null;
  }
}

export async function testConnection(
  url?: string,
  anonKey?: string
): Promise<{ success: boolean; message: string; tableExists: boolean }> {
  const testUrl = (url ?? getSavedConfig().url)?.trim();
  const testKey = (anonKey ?? getSavedConfig().anonKey)?.trim();

  if (!testUrl || !testKey) {
    return {
      success: false,
      message: 'URL e Chave Anon do Supabase são obrigatórias.',
      tableExists: false,
    };
  }

  try {
    const client = createClient(testUrl, testKey, {
      auth: { persistSession: false },
    });

    // Test querying the tasks table
    const { data, error } = await client.from('tasks').select('id').limit(1);

    if (error) {
      // Check if error is because table doesn't exist
      if (
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('relation') ||
        error.message?.toLowerCase().includes('does not exist')
      ) {
        return {
          success: true,
          message: 'Conectado ao Supabase! A tabela "tasks" ainda não foi criada. Execute o script SQL no painel.',
          tableExists: false,
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message}`,
        tableExists: false,
      };
    }

    return {
      success: true,
      message: 'Conexão bem-sucedida! Banco de dados e tabela "tasks" prontos.',
      tableExists: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Falha na conexão: ${msg}`,
      tableExists: false,
    };
  }
}

// Local storage fallback for tasks
export function getLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler tarefas locais', e);
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Erro ao salvar tarefas locais', e);
  }
}

// Supabase CRUD operations
export async function fetchTasks(): Promise<{ tasks: Task[]; isFromSupabase: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { tasks: getLocalTasks(), isFromSupabase: false };
  }

  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar tarefas do Supabase, usando cache local:', error.message);
      return {
        tasks: getLocalTasks(),
        isFromSupabase: false,
        error: `Supabase: ${error.message}. Carregando cache local.`,
      };
    }

    const tasks: Task[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      client_name: row.client_name || '',
      client_email: row.client_email || '',
      client_phone: row.client_phone || '',
      value: Number(row.value) || 0,
      priority: (row.priority as any) || 'media',
      due_date: row.due_date || null,
      status: row.status,
      tags: Array.isArray(row.tags) ? row.tags : [],
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }));

    // Keep local cache updated
    saveLocalTasks(tasks);

    return { tasks, isFromSupabase: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { tasks: getLocalTasks(), isFromSupabase: false, error: msg };
  }
}

export async function insertTask(
  taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): Promise<{ task: Task; savedToSupabase: boolean }> {
  const now = new Date().toISOString();
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('tasks')
        .insert([
          {
            title: taskData.title,
            description: taskData.description || null,
            client_name: taskData.client_name || null,
            client_email: taskData.client_email || null,
            client_phone: taskData.client_phone || null,
            value: taskData.value || 0,
            priority: taskData.priority,
            due_date: taskData.due_date || null,
            status: taskData.status,
            tags: taskData.tags || [],
            attachments: taskData.attachments || [],
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          client_name: data.client_name || '',
          client_email: data.client_email || '',
          client_phone: data.client_phone || '',
          value: Number(data.value) || 0,
          priority: data.priority,
          due_date: data.due_date || null,
          status: data.status,
          tags: data.tags || [],
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        // Update local cache
        const local = getLocalTasks();
        saveLocalTasks([newTask, ...local]);

        return { task: newTask, savedToSupabase: true };
      } else {
        console.warn('Supabase insert error, salvando localmente:', error?.message);
      }
    } catch (e) {
      console.warn('Erro ao inserir no Supabase, salvando local:', e);
    }
  }

  // Fallback to local
  const localTask: Task = {
    ...taskData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'local-' + Date.now(),
    created_at: now,
    updated_at: now,
  };
  const local = getLocalTasks();
  saveLocalTasks([localTask, ...local]);
  return { task: localTask, savedToSupabase: false };
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<{ updated: Task; syncedSupabase: boolean }> {
  const now = new Date().toISOString();
  const client = getSupabaseClient();
  let synced = false;

  if (client) {
    try {
      const payload: any = {
        updated_at: now,
      };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.client_name !== undefined) payload.client_name = updates.client_name;
      if (updates.client_email !== undefined) payload.client_email = updates.client_email;
      if (updates.client_phone !== undefined) payload.client_phone = updates.client_phone;
      if (updates.value !== undefined) payload.value = updates.value;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.due_date !== undefined) payload.due_date = updates.due_date;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.attachments !== undefined) payload.attachments = updates.attachments;

      const { data, error } = await client
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        synced = true;
      }
    } catch (e) {
      console.warn('Falha no update do Supabase, aplicando localmente:', e);
    }
  }

  // Always update local storage
  const current = getLocalTasks();
  let updatedTask: Task | null = null;
  const next = current.map((t) => {
    if (t.id === id) {
      updatedTask = { ...t, ...updates, updated_at: now };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) {
    // If not found in local array, build one
    updatedTask = {
      id,
      title: updates.title || 'Sem título',
      priority: updates.priority || 'media',
      status: updates.status || 'Não iniciado',
      created_at: now,
      updated_at: now,
      ...updates,
    };
    next.unshift(updatedTask);
  }

  saveLocalTasks(next);
  return { updated: updatedTask, syncedSupabase: synced };
}

export async function deleteTask(id: string): Promise<{ success: boolean; syncedSupabase: boolean }> {
  const client = getSupabaseClient();
  let synced = false;

  if (client) {
    try {
      const { error } = await client.from('tasks').delete().eq('id', id);
      if (!error) synced = true;
    } catch (e) {
      console.warn('Erro ao deletar no Supabase:', e);
    }
  }

  const current = getLocalTasks();
  const filtered = current.filter((t) => t.id !== id);
  saveLocalTasks(filtered);

  return { success: true, syncedSupabase: synced };
}

export async function syncLocalTasksToSupabase(tasks: Task[]): Promise<{ count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não está configurado.' };
  }

  if (tasks.length === 0) {
    return { count: 0 };
  }

  try {
    const payload = tasks.map((t) => ({
      title: t.title,
      description: t.description || null,
      client_name: t.client_name || null,
      client_email: t.client_email || null,
      client_phone: t.client_phone || null,
      value: t.value || 0,
      priority: t.priority,
      due_date: t.due_date || null,
      status: t.status,
      tags: t.tags || [],
      attachments: t.attachments || [],
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    const { data, error } = await client.from('tasks').insert(payload).select();
    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || 0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { count: 0, error: msg };
  }
}

// Supabase Storage upload
export async function uploadFileToStorage(
  file: File,
  folder = 'anexos'
): Promise<{ success: boolean; url?: string; name: string; size: number; type: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      name: file.name,
      size: file.size,
      type: file.type,
      error: 'Supabase não está configurado. Conecte ao Supabase para fazer upload.',
    };
  }

  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await client.storage
      .from('crm-arquivos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        name: file.name,
        size: file.size,
        type: file.type,
        error: uploadError.message,
      };
    }

    const { data: publicUrlData } = client.storage
      .from('crm-arquivos')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      name: file.name,
      size: file.size,
      type: file.type,
      error: msg,
    };
  }
}
