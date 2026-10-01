import React from 'react';
import { Plus, Database, RefreshCw, CheckCircle2, AlertCircle, Kanban } from 'lucide-react';
import { ConnectionStatus } from '../types/crm';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  onOpenCreateTask: () => void;
  onOpenSupabaseConfig: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus,
  onOpenCreateTask,
  onOpenSupabaseConfig,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                CRM Kanban
              </h1>
              <span className="text-[11px] font-medium text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">
                Gestão de Tarefas & Oportunidades
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Etapas: Não iniciado · Em Andamento · Finalizado</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Supabase status trigger */}
          <button
            onClick={onOpenSupabaseConfig}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              connectionStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Clique para configurar ou ver status do Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {connectionStatus === 'connected' ? 'Supabase Conectado' : 'Supabase: Configurar Banco'}
            </span>
            <span className="sm:hidden">
              {connectionStatus === 'connected' ? 'Supabase OK' : 'Supabase'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Recarregar dados"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Create Task Button */}
          <button
            onClick={onOpenCreateTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>
    </header>
  );
};
