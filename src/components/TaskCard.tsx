import React from 'react';
import { Task, TaskStatus, TaskPriority } from '../types/crm';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Mail, 
  Phone, 
  MoreVertical, 
  ArrowRight, 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Clock,
  Tag,
  Paperclip
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveStatus: (id: string, newStatus: TaskStatus) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; textClass: string; dotClass: string }> = {
  baixa: { label: 'Baixa', textClass: 'text-slate-500', dotClass: 'bg-slate-400' },
  media: { label: 'Média', textClass: 'text-sky-600', dotClass: 'bg-sky-500' },
  alta: { label: 'Alta', textClass: 'text-amber-600', dotClass: 'bg-amber-500' },
  urgente: { label: 'Urgente', textClass: 'text-rose-600', dotClass: 'bg-rose-500' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onMoveStatus,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;

  // Format currency
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(task.value || 0);

  // Due date status
  const getDueDateStatus = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const due = new Date(dateStr + 'T23:59:59');
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Atrasado', isLate: true };
    } else if (diffDays === 0) {
      return { text: 'Vence hoje', isToday: true };
    } else if (diffDays === 1) {
      return { text: 'Vence amanhã', isUpcoming: true };
    }
    return { text: new Date(dateStr).toLocaleDateString('pt-BR'), isUpcoming: false };
  };

  const dueInfo = getDueDateStatus(task.due_date);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-150 cursor-grab active:cursor-grabbing"
    >
      {/* Card Header: Title & Menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 
          onClick={() => onEdit(task)}
          className="text-sm font-semibold text-slate-800 leading-snug hover:text-indigo-600 transition-colors cursor-pointer flex-1"
        >
          {task.title}
        </h4>

        {/* Options dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Opções da tarefa"
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(task);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                      onDelete(task.id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description preview if present */}
      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Client Information */}
      {(task.client_name || task.client_phone || task.client_email) && (
        <div className="space-y-1 mb-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          {task.client_name && (
            <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{task.client_name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-slate-500 text-[11px] truncate">
            {task.client_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                {task.client_phone}
              </span>
            )}
            {task.client_email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{task.client_email}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tags (Zero-pill discipline: unboxed text with subtle separators) */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] text-slate-500">
          <Tag className="w-3 h-3 text-slate-400" />
          {task.tags.map((tag, idx) => (
            <React.Fragment key={idx}>
              <span className="text-slate-600 font-medium">#{tag}</span>
              {idx < task.tags!.length - 1 && <span className="text-slate-300">·</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Card Footer: Value, Priority, Due Date & Fast Move */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        {/* Deal Value */}
        <div className="flex items-center gap-1 font-semibold text-slate-900">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>{formattedValue}</span>
        </div>

        {/* Priority & Due Date */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dotClass}`} />
            <span className={priorityInfo.textClass}>{priorityInfo.label}</span>
          </div>

          {dueInfo && (
            <>
              <span className="text-slate-300">·</span>
              <span className={`flex items-center gap-1 ${
                dueInfo.isLate 
                  ? 'text-rose-600 font-medium' 
                  : dueInfo.isToday 
                  ? 'text-amber-600 font-medium' 
                  : 'text-slate-500'
              }`}>
                <Clock className="w-3 h-3" />
                {dueInfo.text}
              </span>
            </>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span 
                className="flex items-center gap-0.5 text-indigo-600 font-medium" 
                title={`${task.attachments.length} anexo(s) salvo(s)`}
              >
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments.length}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Move Status Arrows */}
      <div className="mt-3 pt-2 border-t border-slate-100/70 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
          Mover etapa:
        </span>
        <div className="flex items-center gap-1">
          {task.status !== 'Não iniciado' && (
            <button
              onClick={() => onMoveStatus(task.id, task.status === 'Finalizado' ? 'Em Andamento' : 'Não iniciado')}
              title={`Voltar para ${task.status === 'Finalizado' ? 'Em Andamento' : 'Não iniciado'}`}
              className="p-1 px-2 text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Voltar</span>
            </button>
          )}
          {task.status !== 'Finalizado' && (
            <button
              onClick={() => onMoveStatus(task.id, task.status === 'Não iniciado' ? 'Em Andamento' : 'Finalizado')}
              title={`Avançar para ${task.status === 'Não iniciado' ? 'Em Andamento' : 'Finalizado'}`}
              className="p-1 px-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded flex items-center gap-1 transition-colors"
            >
              <span>Avançar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
