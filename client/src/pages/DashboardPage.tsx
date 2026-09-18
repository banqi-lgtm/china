import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Building2,
  TrendingUp,
  Activity,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
  onSelectInspection?: (id: string) => void;
  onNewInspection?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onSelectInspection,
  onNewInspection,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    counts: {
      total: 0,
      pending_review: 0,
      in_progress: 0,
      in_correction: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    },
    byCompany: [],
    recentActivity: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/stats/dashboard');
        setStats(res);
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const counts = stats.counts || {};
  const isConsultant = user?.role === 'CONSULTANT';
  const isOperator = user?.role === 'OPERATOR';
  const isClient = user?.role === 'CLIENT';

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome & Role Context Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hola, {user?.name || 'Usuario'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isConsultant && 'Panel de control de auditoría técnica y supervisión operativa (Mateo).'}
            {isOperator && 'Panel móvil de inspecciones en campo y registro de evidencias.'}
            {isClient && 'Centro ejecutivo de consulta y trazabilidad de sus cargas.'}
            {user?.role === 'SUPER_ADMIN' && 'Visión global corporativa de operaciones, empresas y usuarios.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isClient && onNewInspection && (
            <button
              onClick={onNewInspection}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isOperator ? 'Iniciar Inspección' : 'Nueva Inspección'}</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Centro de Informes</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
            <ClipboardCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.total || 0}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Inspecciones</span>
        </div>

        {/* Card 2: En Proceso */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Proceso</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.in_progress || 0}</div>
          <span className="text-[10px] text-amber-600 mt-1 block font-medium">En campo</span>
        </div>

        {/* Card 3: Pendiente Revisión */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Revisión</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.pending_review || 0}</div>
          <span className="text-[10px] text-purple-600 mt-1 block font-medium">Por Mateo</span>
        </div>

        {/* Card 4: En Corrección */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Corrección</span>
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.in_correction || 0}</div>
          <span className="text-[10px] text-orange-600 mt-1 block font-medium">Devueltas</span>
        </div>

        {/* Card 5: Aprobadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aprobadas</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.approved || 0}</div>
          <span className="text-[10px] text-emerald-600 mt-1 block font-medium">Validadas</span>
        </div>

        {/* Card 6: Finalizadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cerradas</span>
            <FileText className="w-4 h-4 text-slate-900" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.completed || 0}</div>
          <span className="text-[10px] text-slate-500 mt-1 block font-medium">PDF entregado</span>
        </div>
      </div>

      {/* Main Grid: Status Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Distribution & Shortcuts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Breakdown Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Distribución de Estados Operativos
              </h3>
              <button
                onClick={() => onNavigateTab('inspections')}
                className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Ver lista completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Aprobadas', count: counts.approved || 0, color: 'bg-emerald-500' },
                { label: 'Pendientes de Revisión (Mateo)', count: counts.pending_review || 0, color: 'bg-purple-500' },
                { label: 'En Proceso en Campo', count: counts.in_progress || 0, color: 'bg-amber-500' },
                { label: 'En Corrección Técnica', count: counts.in_correction || 0, color: 'bg-orange-500' },
                { label: 'Rechazadas', count: counts.rejected || 0, color: 'bg-rose-500' },
              ].map((item) => {
                const pct = counts.total > 0 ? Math.round((item.count / counts.total) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspections by Company (Admin / Mateo) */}
          {stats.byCompany && stats.byCompany.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Inspecciones por Empresa Contratante</span>
              </h3>
              <div className="divide-y divide-slate-100">
                {stats.byCompany.map((c: any) => (
                  <div key={c.name} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                      {c.count} inspecciones
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Live Activity Feed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Actividad Reciente en Vivo</span>
            </h3>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <div className="font-semibold text-slate-800">
                      {act.comment || 'Actualización de estado'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{act.user_name || 'Sistema'} ({act.user_role || 'Auto'})</span>
                      <span>{act.created_at ? new Date(act.created_at).toLocaleTimeString() : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No hay actividad reciente registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
