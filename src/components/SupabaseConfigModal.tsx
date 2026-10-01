import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw,
  UploadCloud,
  KeyRound,
  Globe,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { 
  getSavedConfig, 
  saveConfig, 
  testConnection, 
  SUPABASE_SQL_SCHEMA,
  syncLocalTasksToSupabase,
  getLocalTasks
} from '../lib/supabase';
import { Task } from '../types/crm';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
  tasks: Task[];
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  tasks,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    tableExists: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSavedConfig();
      setUrl(cfg.url || '');
      setAnonKey(cfg.anonKey || '');
      setTestResult(null);
      setSyncStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(url, anonKey);
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        tableExists: res.tableExists,
      });

      // If successful, save config automatically
      if (res.success) {
        saveConfig({ url: url.trim(), anonKey: anonKey.trim() });
        onConfigUpdated();
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveOnly = () => {
    saveConfig({ url: url.trim(), anonKey: anonKey.trim() });
    onConfigUpdated();
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const currentTasks = tasks.length > 0 ? tasks : getLocalTasks();
      const res = await syncLocalTasksToSupabase(currentTasks);
      if (res.error) {
        setSyncStatus(`Erro ao sincronizar: ${res.error}`);
      } else {
        setSyncStatus(`Sucesso! ${res.count} tarefas foram enviadas para o Supabase.`);
        onConfigUpdated();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Conectar ao Banco de Dados Supabase
              </h3>
              <p className="text-xs text-slate-500">
                Guarde e sincronize suas tarefas e clientes diretamente na sua nuvem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Quick Guide */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Como obter suas credenciais no Supabase:</span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 ml-auto text-[11px]"
              >
                Abrir Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-500">
              <li>Acesse o seu projeto no <strong>Supabase Dashboard</strong>.</li>
              <li>Vá em <strong>Project Settings</strong> (ícone de engrenagem) &gt; <strong>API</strong>.</li>
              <li>Copie a <strong>Project URL</strong> e a chave <strong>Project API key (anon / public)</strong>.</li>
              <li>Cole nos campos abaixo e clique em <strong>Testar Conexão</strong>.</li>
            </ol>
          </div>

          {/* Form Credentials */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Project URL do Supabase
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo-seu-id.supabase.co"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                Chave Anon / Public (anon key)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !url || !anonKey}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Testar & Conectar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveOnly}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Salvar Credenciais
              </button>
            </div>
          </div>

          {/* Test Result Alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                testResult.success
                  ? testResult.tableExists
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  testResult.tableExists ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {!testResult.tableExists && testResult.success && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      Importante: copie o script SQL abaixo, abra o <strong>SQL Editor</strong> do seu Supabase e clique em <strong>Run</strong> para criar a tabela.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SQL Script Section with Storage Policies */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Script SQL Completo (Banco de Dados + Políticas de Armazenamento)
                  </span>
                </div>
                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL com Políticas</span>
                    </>
                  )}
                </button>
              </div>

              {/* Policies breakdown checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Políticas da Tabela (RLS):</strong>
                    <div className="text-slate-500">SELECT, INSERT, UPDATE, DELETE ativas</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Políticas de Storage (Arquivos):</strong>
                    <div className="text-slate-500">Bucket <code>crm-arquivos</code> + Upload/Download</div>
                  </div>
                </div>
              </div>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>

          {/* Sync Local Tasks to Supabase if any exist */}
          {tasks.length > 0 && (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">
                    Sincronizar Tarefas Criadas Localmente
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Você tem {tasks.length} tarefa(s) criadas no sistema. Deseja enviá-las para a tabela do Supabase?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncing || !url || !anonKey}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar para Supabase</span>
                </button>
              </div>
              {syncStatus && (
                <p className="text-[11px] font-medium text-indigo-900 pt-1">
                  {syncStatus}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
