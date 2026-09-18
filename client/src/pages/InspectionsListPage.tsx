import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Inspection, InspectionStatus } from '../types';
import { api } from '../api/client';
import { StatusBadge, ResultBadge } from '../components/common/StatusBadge';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  FileText,
  AlertCircle,
  Truck,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface InspectionsListPageProps {
  onSelectInspection: (id: string) => void;
  onOpenWizard: (id: string) => void;
  onNewInspection: () => void;
}

export const InspectionsListPage: React.FC<InspectionsListPageProps> = ({
  onSelectInspection,
  onOpenWizard,
  onNewInspection,
}) => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isConsultant = user?.role === 'CONSULTANT';
  const isOperator = user?.role === 'OPERATOR';
  const isClient = user?.role === 'CLIENT';

  const loadInspections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get<{ inspections: Inspection[] }>(`/inspections?${params.toString()}`);
      setInspections(res.inspections || []);
    } catch (err: any) {
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInspections();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {isOperator ? 'Mis Inspecciones Asignadas' : 'Gestión de Inspecciones'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isConsultant
              ? 'Bandeja de supervisión operativa y aprobación técnica de Mateo.'
              : 'Auditorías de cargue, evidencias y trazabilidad en tiempo real.'}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={onNewInspection}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isOperator ? 'Iniciar Nueva Inspección' : 'Crear Inspección'}</span>
          </button>
        )}
      </div>

      {/* Consultant Work Queue Tabs (Requested by Prompt) */}
      {isConsultant && (
        <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PENDIENTE_REVISION', label: 'Pendientes de Revisión' },
            { id: 'EN_CORRECCION', label: 'En Corrección' },
            { id: 'APROBADA', label: 'Aprobadas' },
            { id: 'FINALIZADA', label: 'Finalizadas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Search & Standard Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, contenedor, empresa o producto..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </form>

        {!isConsultant && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ASIGNADA">Asignada</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="PENDIENTE_REVISION">Pendiente de Revisión</option>
              <option value="EN_CORRECCION">En Corrección</option>
              <option value="APROBADA">Aprobada</option>
              <option value="FINALIZADA">Finalizada</option>
            </select>
          </div>
        )}
      </div>

      {/* MOBILE-FIRST CARDS FOR OPERATOR */}
      {isOperator ? (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Cargando inspecciones...</div>
          ) : inspections.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No tienes inspecciones asignadas en este estado</p>
              <p className="text-[11px] text-slate-400 mt-1">Usa el botón de arriba para iniciar una nueva inspección.</p>
            </div>
          ) : (
            inspections.map((insp) => (
              <div
                key={insp.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs px-2.5 py-1 rounded bg-slate-900 text-emerald-400 font-mono">
                    {insp.code}
                  </span>
                  <StatusBadge status={insp.status} />
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-sm font-bold text-slate-900">{insp.company_name}</div>
                  <div className="flex items-center gap-2 text-slate-600 font-mono">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contenedor: {insp.container_number || 'Por registrar'}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Fecha: {insp.scheduled_date || new Date(insp.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Progreso del proceso</span>
                    <span className="font-bold text-slate-800">{insp.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${insp.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => onSelectInspection(insp.id)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Ver Detalle
                  </button>
                  <button
                    onClick={() => onOpenWizard(insp.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition flex items-center justify-center gap-1"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* DESKTOP / TABLE VIEW FOR ADMIN, CONSULTANT, AND CLIENT */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Contenedor</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Operario</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Dictamen</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Cargando registros...
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No se encontraron inspecciones con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  inspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {insp.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {insp.company_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {insp.container_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                        {insp.product_name || 'Carga General'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {insp.operator_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(insp.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={insp.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ResultBadge result={insp.overall_result} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectInspection(insp.id)}
                            title="Ver detalles"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(insp.status === 'BORRADOR' || insp.status === 'EN_PROCESO' || insp.status === 'EN_CORRECCION') && (
                            <button
                              onClick={() => onOpenWizard(insp.id)}
                              title="Editar en Wizard"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
