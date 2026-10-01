import React from 'react';
import { Task } from '../types/crm';
import { 
  TrendingUp, 
  CircleDashed, 
  Clock, 
  CheckCircle2, 
  DollarSign 
} from 'lucide-react';

interface MetricsBarProps {
  tasks: Task[];
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const totalPipeline = tasks.reduce((acc, t) => acc + (t.value || 0), 0);

  const pending = tasks.filter((t) => t.status === 'Não iniciado');
  const pendingValue = pending.reduce((acc, t) => acc + (t.value || 0), 0);

  const inProgress = tasks.filter((t) => t.status === 'Em Andamento');
  const inProgressValue = inProgress.reduce((acc, t) => acc + (t.value || 0), 0);

  const done = tasks.filter((t) => t.status === 'Finalizado');
  const doneValue = done.reduce((acc, t) => acc + (t.value || 0), 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Total Pipeline */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">Pipeline Total</span>
          <TrendingUp className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-lg font-bold text-slate-900 leading-tight">
          {formatBRL(totalPipeline)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {totalTasks} {totalTasks === 1 ? 'oportunidade' : 'oportunidades'} no CRM
        </div>
      </div>

      {/* Não iniciado */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">Não iniciado</span>
          <CircleDashed className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-lg font-bold text-slate-800 leading-tight">
          {pending.length} <span className="text-xs font-normal text-slate-400">tarefas</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {formatBRL(pendingValue)} acumulados
        </div>
      </div>

      {/* Em Andamento */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">Em Andamento</span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-lg font-bold text-amber-900 leading-tight">
          {inProgress.length} <span className="text-xs font-normal text-slate-400">tarefas</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {formatBRL(inProgressValue)} em negociação
        </div>
      </div>

      {/* Finalizado */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium">Finalizado</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-lg font-bold text-emerald-900 leading-tight">
          {done.length} <span className="text-xs font-normal text-slate-400">tarefas</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {formatBRL(doneValue)} convertidos
        </div>
      </div>
    </div>
  );
};
