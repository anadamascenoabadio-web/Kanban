import React from 'react';
import { Search, Filter, X, ArrowUpDown } from 'lucide-react';
import { TaskPriority } from '../types/crm';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (p: string) => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  selectedTag: string;
  onTagChange: (t: string) => void;
  availableTags: string[];
  totalFiltered: number;
  totalAll: number;
  onClearFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortChange,
  selectedTag,
  onTagChange,
  availableTags,
  totalFiltered,
  totalAll,
  onClearFilters,
}) => {
  const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'all' || selectedTag !== '' || sortBy !== 'recent';

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 mb-5 shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título, cliente, e-mail ou telefone..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">Todas Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="recent">Mais recentes</option>
              <option value="value_desc">Maior valor (R$)</option>
              <option value="value_asc">Menor valor (R$)</option>
              <option value="due_date">Prazo mais próximo</option>
              <option value="title_asc">Título (A-Z)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="py-1 px-2.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tags row if tags exist */}
      {availableTags.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Filtrar por tag:</span>
          <button
            onClick={() => onTagChange('')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              selectedTag === ''
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagChange(selectedTag === tag ? '' : tag)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Filter status counter if filtered */}
      {hasActiveFilters && (
        <div className="text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Exibindo <strong>{totalFiltered}</strong> de <strong>{totalAll}</strong> tarefas encontradas.
          </span>
        </div>
      )}
    </div>
  );
};
