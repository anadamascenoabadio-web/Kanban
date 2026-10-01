export type TaskStatus = 'Não iniciado' | 'Em Andamento' | 'Finalizado';

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploaded_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  value?: number;
  priority: TaskPriority;
  due_date?: string | null; // ISO YYYY-MM-DD
  status: TaskStatus;
  tags?: string[];
  attachments?: TaskAttachment[];
  created_at: string;
  updated_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
