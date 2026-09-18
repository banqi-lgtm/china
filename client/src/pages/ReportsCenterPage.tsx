import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Report } from '../types';
import { ResultBadge } from '../components/common/StatusBadge';
import {
  FileText,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building2,
} from 'lucide-react';

export const ReportsCenterPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ reports: Report[] }>('/reports');
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filtered = reports.filter(
    (r) =>
      r.report_code.toLowerCase().includes(search.toLowerCase()) ||
      r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.inspection_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Centro Oficial de Informes PDF</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Documentos corporativos de auditoría con código de trazabilidad único internacional.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o empresa..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Cargando informes oficiales...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No hay informes PDF disponibles</h3>
          <p className="text-xs text-slate-400 mt-1">
            Los informes se generan automáticamente desde el detalle de la inspección una vez aprobada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rep) => (
            <div
              key={rep.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-900 text-emerald-400">
                    {rep.report_code}
                  </span>
                  <ResultBadge result={rep.overall_result} />
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{rep.company_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Inspección vinculada: <strong>{rep.inspection_code}</strong></p>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Versión:</span>
                  <span className="font-bold text-slate-800">v{rep.version}.0 (Final)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fecha de Emisión:</span>
                  <span>{new Date(rep.generated_at).toLocaleString()}</span>
                </div>
                {rep.generated_by_name && (
                  <div className="flex items-center justify-between">
                    <span>Certificado por:</span>
                    <span>{rep.generated_by_name}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={`/${rep.pdf_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Visualizar</span>
                </a>

                <a
                  href={`/api/reports/${rep.id}/download`}
                  download
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
