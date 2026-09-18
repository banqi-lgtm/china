import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { AuditLog } from '../types';
import { ShieldAlert, Search, RefreshCw, Calendar, Terminal } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get<{ logs: AuditLog[] }>(`/audit-logs?${params.toString()}`);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            <span>Pista de Auditoría & Trazabilidad (Audit Log)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico inmutable de todas las acciones, cambios de estado y descargas.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuario o acción..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Acción Registrada</th>
                <th className="px-4 py-3">Tabla Afectada</th>
                <th className="px-4 py-3">IP Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No hay registros de auditoría que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {log.user_email || 'Sistema'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {log.role || 'SYS'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-700">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {log.affected_table || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
