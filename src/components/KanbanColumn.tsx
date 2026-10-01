import React, { useState } from 'react';
import { Task, TaskStatus } from '../types/crm';
import { TaskCard } from './TaskCard';
import { Plus, CircleDashed, Clock, CheckCircle2 } from 'lucide-react';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveStatus: (id: string, newStatus: TaskStatus) => void;
  onOpenCreateWithStatus: (status: TaskStatus) => void;
}

const COLUMN_CONFIG: Record<
  TaskStatus,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  'Não iniciado': {
    title: 'Não iniciado',
    icon: CircleDashed,
    accentColor: 'border-t-slate-400',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
  },
  'Em Andamento': {
    title: 'Em Andamento',
    icon: Clock,
    accentColor: 'border-t-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  'Finalizado': {
    title: 'Finalizado',
    icon: CheckCircle2,
    accentColor: 'border-t-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onEditTask,
  onDeleteTask,
  onMoveStatus,
  onOpenCreateWithStatus,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = COLUMN_CONFIG[status];
  const Icon = config.icon;

  const totalValue = tasks.reduce((sum, t) => sum + (t.value || 0), 0);
  const formattedTotalValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(totalValue);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveStatus(taskId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-1 min-w-[310px] max-w-[420px] bg-slate-50/80 rounded-2xl border ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20'
          : 'border-slate-200/80'
      } border-t-4 ${config.accentColor} p-3.5 transition-all duration-200`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-sm text-slate-800 tracking-tight">
            {config.title}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${config.badgeBg} ${config.badgeText}`}>
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500" title="Valor total das oportunidades nesta etapa">
            {formattedTotalValue}
          </span>
          <button
            onClick={() => onOpenCreateWithStatus(status)}
            aria-label={`Adicionar tarefa em ${status}`}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards list / droppable container */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[420px]">
        {tasks.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
            <p className="text-xs font-medium text-slate-500 mb-1">
              Nenhuma tarefa aqui
            </p>
            <p className="text-[11px] text-slate-400 mb-3">
              Arraste um card para cá ou crie manualmente.
            </p>
            <button
              onClick={() => onOpenCreateWithStatus(status)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Tarefa</span>
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMoveStatus={onMoveStatus}
            />
          ))
        )}
      </div>

      {/* Quick Add Button at bottom of column */}
      <button
        onClick={() => onOpenCreateWithStatus(status)}
        className="mt-3 w-full py-2 px-3 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5 text-slate-400" />
        <span>Adicionar nesta etapa</span>
      </button>
    </div>
  );
};
