import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge, ResultBadge } from '../components/common/StatusBadge';
import { InspectionTimeline } from '../components/common/Timeline';
import { EvidenceManager } from '../components/evidences/EvidenceManager';
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowLeft,
  Truck,
  Box,
  MapPin,
  User,
  ShieldCheck,
  Building2,
  Calendar,
  MessageSquare,
  Edit,
} from 'lucide-react';

interface InspectionDetailPageProps {
  inspectionId: string;
  onBack: () => void;
  onEditWizard?: () => void;
}

export const InspectionDetailPage: React.FC<InspectionDetailPageProps> = ({
  inspectionId,
  onBack,
  onEditWizard,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'CORRECTION' | 'REJECT'>('APPROVE');
  const [reviewComment, setReviewComment] = useState('');
  const [pdfResult, setPdfResult] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inspections/${inspectionId}`);
      setData(res);
      if (res.report?.pdf_path) {
        setPdfResult(res.report.pdf_path);
      }
    } catch (err: any) {
      alert(err.message || 'Error al cargar detalles de la inspección');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [inspectionId]);

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await api.post(`/reports/generate/${inspectionId}`);
      setPdfResult(res.downloadUrl);
      alert(`¡Informe PDF generado exitosamente con código ${res.reportCode}!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al generar el informe PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleStatusChange = async () => {
    let newStatus = 'APROBADA';
    if (reviewAction === 'CORRECTION') newStatus = 'EN_CORRECCION';
    if (reviewAction === 'REJECT') newStatus = 'RECHAZADA';

    try {
      await api.post(`/inspections/${inspectionId}/status`, {
        new_status: newStatus,
        comment: reviewComment,
        overall_result: reviewAction === 'APPROVE' ? 'PASS' : (reviewAction === 'REJECT' ? 'FAIL' : 'CONDITIONAL'),
      });
      setReviewModalOpen(false);
      setReviewComment('');
      alert(`Estado de la inspección actualizado a ${newStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Cargando inspección técnica...</p>
      </div>
    );
  }

  if (!data || !data.inspection) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-600">Inspección no encontrada.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg">
          Volver
        </button>
      </div>
    );
  }

  const { inspection, container, cargo, loading: loadProc, product, vehicle, answers, findings, evidences, signatures, timeline } = data;

  const isConsultantOrAdmin = user?.role === 'CONSULTANT' || user?.role === 'SUPER_ADMIN';
  const isOperator = user?.role === 'OPERATOR';
  const isClient = user?.role === 'CLIENT';

  const canEdit = isOperator && (inspection.status === 'BORRADOR' || inspection.status === 'EN_PROCESO' || inspection.status === 'EN_CORRECCION');
  const canReview = isConsultantOrAdmin && (inspection.status === 'PENDIENTE_REVISION' || inspection.status === 'EN_PROCESO');

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{inspection.code}</h1>
              <StatusBadge status={inspection.status} />
              <ResultBadge result={inspection.overall_result} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {inspection.company_name} • Contenedor: <strong>{container?.container_number || 'N/A'}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && onEditWizard && (
            <button
              onClick={onEditWizard}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <Edit className="w-3.5 h-3.5" />
              Continuar Inspección (Wizard)
            </button>
          )}

          {canReview && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setReviewAction('APPROVE');
                  setReviewModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Aprobar Inspección
              </button>
              <button
                onClick={() => {
                  setReviewAction('CORRECTION');
                  setReviewModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Solicitar Corrección
              </button>
            </div>
          )}

          {/* PDF Generation Button */}
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>{generatingPdf ? 'Generando PDF...' : 'Generar / Actualizar PDF'}</span>
          </button>

          {pdfResult && (
            <a
              href={pdfResult}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg shadow-xs hover:bg-emerald-100 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar PDF
            </a>
          )}
        </div>
      </div>

      {/* Traceability Timeline */}
      <InspectionTimeline currentStatus={inspection.status} history={timeline} />

      {/* Consultant Notes Callout (if in correction) */}
      {inspection.consultant_notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Nota Técnica del Consultor (Mateo):</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{inspection.consultant_notes}</p>
          </div>
        </div>
      )}

      {/* Two Column Grid for Key Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contenedor & Operación */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Datos del Contenedor</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Número Contenedor:</span>
              <span className="font-mono font-bold text-slate-800">{container?.container_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Precinto Oficial:</span>
              <span className="font-mono font-bold text-slate-800">{container?.seal_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tipo y Tamaño:</span>
              <span className="text-slate-800">{container?.container_type || 'Dry Box'} ({container?.size || '40ft'})</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Transportador:</span>
              <span className="text-slate-800">{container?.transporter || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Placa Cabezote:</span>
              <span className="font-mono text-slate-800">{container?.license_plate || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Condición Estructural:</span>
              <span className="text-slate-800">{container?.condition || 'Inspeccionado'}</span>
            </div>
          </div>
        </div>

        {/* Carga & Producto */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Box className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Carga & Especificaciones</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Producto:</span>
              <span className="font-semibold text-slate-800">{product?.product_name || 'Carga General'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Referencia / Lote:</span>
              <span className="text-slate-800">{product?.reference || 'N/A'} (Lote: {product?.batch_lot || 'N/A'})</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Cantidad Total:</span>
              <span className="font-bold text-slate-800">{cargo?.total_quantity || 0} {cargo?.unit || 'uds'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Peso Bruto / Neto:</span>
              <span className="text-slate-800">{cargo?.gross_weight || 0} kg / {cargo?.net_weight || 0} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Volumen (CBM):</span>
              <span className="text-slate-800">{cargo?.volume || 0} m³</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Embalaje:</span>
              <span className="text-slate-800">{cargo?.packaging_type || 'Palletizado'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Checklist Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs font-bold">
          <span>Resultados del Checklist de Condiciones (Audit Points)</span>
          <span className="text-emerald-400 font-semibold">{answers.length} puntos evaluados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-2.5 w-12">#</th>
                <th className="px-4 py-2.5">Punto de Inspección</th>
                <th className="px-4 py-2.5 w-28 text-center">Estado</th>
                <th className="px-4 py-2.5">Observaciones / Hallazgo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {answers.map((a: any, i: number) => {
                const isPass = a.status === 'OK';
                const isFail = a.status === 'NO_OK';
                return (
                  <tr key={a.id || i} className={isFail ? 'bg-rose-50/40' : ''}>
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      <span className="text-[10px] text-slate-500 block">{a.category_name}</span>
                      {a.question_text}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isPass ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ PASS
                        </span>
                      ) : isFail ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          ✕ FAIL
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {a.observations || (isPass ? 'Verificado sin anomalías' : '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings Section */}
      {findings && findings.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="bg-rose-600 text-white px-5 py-3 flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Hallazgos y No Conformidades Detectadas
            </span>
            <span>{findings.length} hallazgo(s)</span>
          </div>
          <div className="divide-y divide-rose-100 p-4 space-y-3">
            {findings.map((f: any) => (
              <div key={f.id} className="pt-2 first:pt-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-900">[{f.code}] {f.category}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    Severidad: {f.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidences Manager (View Mode or Upload Mode) */}
      <EvidenceManager
        inspectionId={inspectionId}
        evidences={evidences}
        onEvidencesChange={loadData}
        readOnly={!canEdit}
      />

      {/* Signatures Verified Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Firmas Digitales Registradas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {signatures && signatures.length > 0 ? (
            signatures.map((sig: any) => (
              <div key={sig.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{sig.signer_type}</span>
                  <span className="text-[10px] text-slate-400">{new Date(sig.signed_at).toLocaleString()}</span>
                </div>
                {sig.signature_data && sig.signature_data.startsWith('data:image') && (
                  <img src={sig.signature_data} alt="Firma" className="h-16 object-contain bg-white rounded border border-slate-200 p-1" />
                )}
                <div className="text-xs font-semibold text-slate-700">{sig.signer_name}</div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 col-span-2">No se han registrado firmas aún.</p>
          )}
        </div>
      </div>

      {/* Review Modal (for Mateo) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {reviewAction === 'APPROVE'
                ? 'Aprobar Inspección Técnica'
                : reviewAction === 'CORRECTION'
                ? 'Solicitar Corrección al Operario'
                : 'Rechazar Inspección'}
            </h3>
            <p className="text-xs text-slate-500">
              {reviewAction === 'APPROVE'
                ? 'Al aprobar, la inspección quedará lista para generar el informe final PDF oficial.'
                : 'Indique claramente qué campos, evidencias o fotografías debe corregir o retomar el operario.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Comentario o Instrucción</label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Observaciones para el operario o cliente..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition ${
                  reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Confirmar Dictamen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
