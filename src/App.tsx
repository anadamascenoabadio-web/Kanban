import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskStatus, ConnectionStatus } from './types/crm';
import { 
  fetchTasks, 
  insertTask, 
  updateTask, 
  deleteTask, 
  getSupabaseClient,
  testConnection,
  getSavedConfig
} from './lib/supabase';
import { Navbar } from './components/Navbar';
import { MetricsBar } from './components/MetricsBar';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { Plus, Database, Kanban, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [connectionMessage, setConnectionMessage] = useState<string>('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('Não iniciado');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Toast / notification feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Verify Supabase status
  const checkSupabase = useCallback(async () => {
    const config = getSavedConfig();
    if (!config.url || !config.anonKey) {
      setConnectionStatus('disconnected');
      setConnectionMessage('Supabase não configurado. As tarefas serão salvas localmente até a conexão ser inserida.');
      return;
    }

    try {
      const res = await testConnection(config.url, config.anonKey);
      if (res.success) {
        setConnectionStatus('connected');
        setConnectionMessage(res.message);
      } else {
        setConnectionStatus('error');
        setConnectionMessage(res.message);
      }
    } catch {
      setConnectionStatus('error');
      setConnectionMessage('Falha ao conectar com o Supabase.');
    }
  }, []);

  // Load tasks
  const loadTasks = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const { tasks: loaded, isFromSupabase, error } = await fetchTasks();
      setTasks(loaded);
      if (error && !quiet) {
        console.warn('Aviso ao carregar tarefas:', error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkSupabase();
    loadTasks();
  }, [checkSupabase, loadTasks]);

  // Realtime Supabase listener
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const channel = client
        .channel('crm_tasks_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => {
            // Reload on any database changes
            loadTasks(true);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime subscription not active:', e);
    }
  }, [connectionStatus, loadTasks]);

  // Extract all distinct tags from tasks
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach((t) => {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchClient = task.client_name?.toLowerCase().includes(q);
          const matchEmail = task.client_email?.toLowerCase().includes(q);
          const matchPhone = task.client_phone?.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q);
          const matchTags = task.tags?.some((t) => t.toLowerCase().includes(q));

          if (!matchTitle && !matchClient && !matchEmail && !matchPhone && !matchDesc && !matchTags) {
            return false;
          }
        }

        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false;
        }

        // Tag filter
        if (selectedTag && (!task.tags || !task.tags.includes(selectedTag))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'value_desc') {
          return (b.value || 0) - (a.value || 0);
        }
        if (sortBy === 'value_asc') {
          return (a.value || 0) - (b.value || 0);
        }
        if (sortBy === 'due_date') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (sortBy === 'title_asc') {
          return a.title.localeCompare(b.title);
        }
        // 'recent' by default
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [tasks, searchQuery, priorityFilter, selectedTag, sortBy]);

  // Handlers for Task operations
  const handleOpenCreateModal = (status: TaskStatus = 'Não iniciado') => {
    setEditingTask(null);
    setDefaultTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
    id?: string
  ) => {
    if (id) {
      // Edit existing
      const { updated, syncedSupabase } = await updateTask(id, taskData);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showToast(
        syncedSupabase
          ? 'Tarefa atualizada e salva no Supabase com sucesso!'
          : 'Tarefa atualizada localmente.'
      );
    } else {
      // Create new
      const { task: created, savedToSupabase } = await insertTask(taskData);
      setTasks((prev) => [created, ...prev]);
      showToast(
        savedToSupabase
          ? 'Nova tarefa criada e salva no Supabase com sucesso!'
          : 'Nova tarefa criada e armazenada no sistema!'
      );
    }
  };

  const handleMoveStatus = async (id: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
    );

    const { syncedSupabase } = await updateTask(id, { status: newStatus });
    showToast(
      syncedSupabase
        ? `Etapa atualizada para "${newStatus}" no Supabase.`
        : `Etapa alterada para "${newStatus}".`
    );
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { syncedSupabase } = await deleteTask(id);
    showToast(
      syncedSupabase
        ? 'Tarefa removida do Supabase.'
        : 'Tarefa excluída do sistema.'
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setSelectedTag('');
    setSortBy('recent');
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        connectionStatus={connectionStatus}
        onOpenCreateTask={() => handleOpenCreateModal('Não iniciado')}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
        onRefresh={() => loadTasks(false)}
        isRefreshing={isRefreshing}
      />

      {/* Connection Notice Banner if Supabase is pending or error */}
      {connectionStatus !== 'connected' && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Pronto para conectar ao Supabase:</strong> Insira a URL e Chave Anon do seu banco para sincronização na nuvem.
              </span>
            </div>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-3 py-1 font-semibold text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shadow-2xs whitespace-nowrap"
            >
              Conectar Supabase Agora
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Metrics Bar */}
        <MetricsBar tasks={tasks} />

        {/* Filter and Search Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          availableTags={availableTags}
          totalFiltered={filteredTasks.length}
          totalAll={tasks.length}
          onClearFilters={handleClearFilters}
        />

        {/* Kanban Board or Initial Zero-State */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium text-slate-500">Carregando funil Kanban...</p>
          </div>
        ) : tasks.length === 0 ? (
          /* Zero-state: No mock data created, clean welcome screen */
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-2xl mx-auto my-6 shadow-xs">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Kanban className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Seu CRM Kanban está pronto!
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
              Nenhuma informação modelo foi criada. Você pode começar agora criando manualmente as suas tarefas e oportunidades para movimentá-las entre as etapas <strong>Não iniciado</strong>, <strong>Em Andamento</strong> e <strong>Finalizado</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => handleOpenCreateModal('Não iniciado')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeira Tarefa Manual</span>
              </button>

              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Configurar Banco Supabase</span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-left text-xs text-slate-500">
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">1. Não iniciado</span>
                <span>Tarefas e leads recém-criados que aguardam início de contato.</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">2. Em Andamento</span>
                <span>Propostas enviadas, reuniões agendadas ou negociações ativas.</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">3. Finalizado</span>
                <span>Contratos fechados ou atividades concluídas com sucesso.</span>
              </div>
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveStatus={handleMoveStatus}
            onOpenCreateWithStatus={handleOpenCreateModal}
          />
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CRM Kanban &copy; {new Date().getFullYear()} · Desenvolvido para gestão ágil de oportunidades</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium text-[11px]"
            >
              <Database className="w-3 h-3" />
              Status do Supabase: {connectionStatus === 'connected' ? 'Ativo' : 'Configuração pendente'}
            </button>
          </div>
        </div>
      </footer>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultStatus={defaultTaskStatus}
      />

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={() => {
          checkSupabase();
          loadTasks(false);
        }}
        tasks={tasks}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
