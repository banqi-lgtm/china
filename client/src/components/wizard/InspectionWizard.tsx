import React, { useState, useEffect, useRef } from 'react';
import type {
  Inspection,
  ContainerDetails,
  CargoDetails,
  LoadingProcess,
  ProductDetails,
  VehicleDetails,
  ChecklistCategory,
  ChecklistAnswer,
  Evidence,
  Finding,
  OverallResult,
} from '../../types';
import { api } from '../../api/client';
import { EvidenceManager } from '../evidences/EvidenceManager';
import { SignaturePad } from '../common/SignaturePad';
import {
  MapPin,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Truck,
  Box,
  ClipboardList,
  Camera,
  Layers,
  Sparkles,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface InspectionWizardProps {
  inspectionId: string;
  onFinish?: () => void;
  onCancel?: () => void;
}

export const InspectionWizard: React.FC<InspectionWizardProps> = ({
  inspectionId,
  onFinish,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Guardado');

  // Data States
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [container, setContainer] = useState<ContainerDetails>({});
  const [cargo, setCargo] = useState<CargoDetails>({});
  const [loadingProcess, setLoadingProcess] = useState<LoadingProcess>({});
  const [product, setProduct] = useState<ProductDetails>({});
  const [vehicle, setVehicle] = useState<VehicleDetails>({});
  const [checklistCategories, setChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [answers, setAnswers] = useState<Record<string, { status: 'OK' | 'NO_OK' | 'NA'; observations: string; severity?: string }>>({});
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [operatorSignature, setOperatorSignature] = useState<string>('');
  const [signerName, setSignerName] = useState<string>('');
  const [overallResult, setOverallResult] = useState<OverallResult>('PASS');
  const [generalNotes, setGeneralNotes] = useState('');

  // Fetch full details
  const loadInspectionData = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/inspections/${inspectionId}`);
      setInspection(data.inspection);
      setContainer(data.container || {});
      setCargo(data.cargo || {});
      setLoadingProcess(data.loading || {});
      setProduct(data.product || {});
      setVehicle(data.vehicle || {});
      setEvidences(data.evidences || []);
      setGeneralNotes(data.inspection?.notes || '');
      setOverallResult(data.inspection?.overall_result || 'PASS');
      if (data.inspection?.current_step) {
        setCurrentStep(data.inspection.current_step);
      }

      // Existing signature
      const opSig = (data.signatures || []).find((s: any) => s.signer_type === 'OPERATOR');
      if (opSig) {
        setOperatorSignature(opSig.signature_data);
        setSignerName(opSig.signer_name);
      } else {
        setSignerName(data.inspection?.operator_name || '');
      }

      // Load checklist template & existing answers
      const tmplData = await api.get('/checklists/template');
      setChecklistCategories(tmplData.template || []);

      const ansMap: Record<string, { status: 'OK' | 'NO_OK' | 'NA'; observations: string; severity?: string }> = {};
      (data.answers || []).forEach((a: any) => {
        ansMap[a.question_id] = {
          status: a.status,
          observations: a.observations || '',
        };
      });
      setAnswers(ansMap);
    } catch (err: any) {
      alert(err.message || 'Error al cargar la inspección');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspectionData();
  }, [inspectionId]);

  // GPS Geolocation capture
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada por el navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (inspection) {
          setInspection({ ...inspection, latitude, longitude });
        }
        alert(`Ubicación GPS fijada: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      (err) => {
        alert('No se pudo obtener la ubicación GPS: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Save current step data to DB
  const saveCurrentData = async (targetStep = currentStep) => {
    setSaving(true);
    setAutoSaveStatus('Guardando...');
    try {
      // Calculate progress (Step 1 to 10)
      const progressPct = Math.min(Math.round((targetStep / 10) * 100), 100);

      await api.put(`/inspections/${inspectionId}`, {
        current_step: targetStep,
        progress: progressPct,
        overall_result: overallResult,
        general: {
          latitude: inspection?.latitude,
          longitude: inspection?.longitude,
          location_address: inspection?.location_address,
          notes: generalNotes,
        },
        container,
        cargo,
        loading: loadingProcess,
        product,
        vehicle,
      });

      // Save checklist answers
      const answersArray = Object.entries(answers).map(([qId, val]) => ({
        question_id: qId,
        status: val.status,
        observations: val.observations,
        severity: val.severity || 'MEDIA',
      }));

      if (answersArray.length > 0) {
        await api.post(`/inspections/${inspectionId}/checklist-answers`, {
          answers: answersArray,
        });
      }

      setAutoSaveStatus('Guardado');
    } catch (err: any) {
      console.error('Save error:', err);
      setAutoSaveStatus('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const nextStep = Math.min(currentStep + 1, 10);
    await saveCurrentData(nextStep);
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = async () => {
    const prevStep = Math.max(currentStep - 1, 1);
    await saveCurrentData(prevStep);
    setCurrentStep(prevStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final submission to Mateo (Consultant)
  const handleSubmitToConsultant = async () => {
    if (!operatorSignature) {
      alert('Se requiere la firma digital del operario antes de enviar a revisión.');
      return;
    }
    if (!signerName) {
      alert('Por favor ingrese el nombre del firmante.');
      return;
    }

    setSaving(true);
    try {
      // Save signature
      await api.post(`/inspections/${inspectionId}/signatures`, {
        signer_type: 'OPERATOR',
        signer_name: signerName,
        signature_data: operatorSignature,
      });

      // Update state to PENDIENTE_REVISION
      await api.post(`/inspections/${inspectionId}/status`, {
        new_status: 'PENDIENTE_REVISION',
        comment: 'Inspección completada por operario en campo y enviada a revisión técnica.',
        overall_result: overallResult,
      });

      alert('¡Inspección enviada exitosamente a revisión técnica de Mateo!');
      if (onFinish) onFinish();
    } catch (err: any) {
      alert(err.message || 'Error al enviar inspección');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Cargando inspección en vivo...</p>
      </div>
    );
  }

  const stepTitles = [
    'Información General & GPS',
    'Datos del Contenedor',
    'Cantidad y Carga',
    'Condiciones Generales (Checklist)',
    'Proceso de Cargue',
    'Evidencias Fotográficas y Video',
    'Detalles del Producto',
    'Vehículo y Maquinaria',
    'Resultado & Resumen',
    'Firma Digital & Envío',
  ];

  const progressPercentage = Math.round((currentStep / 10) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24">
      {/* Top Header Card with Mobile-Ready Progress */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm sticky top-16 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-emerald-400">
                {inspection?.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Paso {currentStep} de 10: <strong className="text-slate-900">{stepTitles[currentStep - 1]}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${autoSaveStatus === 'Guardado' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              {autoSaveStatus}
            </span>
            <button
              onClick={() => saveCurrentData(currentStep)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar borrador
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* STEP CONTENT CONTAINER */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        {/* ===================================================
            PASO 1: INFORMACIÓN GENERAL & GPS
        =================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 1: Información General de la Inspección</h3>
              <p className="text-xs text-slate-500">Registre empresa, tipo de auditoría y ubicación geoespacial.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa Contratante</label>
                <input
                  type="text"
                  disabled
                  value={inspection?.company_name || 'Empresa Asignada'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Inspección</label>
                <input
                  type="text"
                  disabled
                  value="Inspección de Cargue y Contenedor (Full Loading Audit)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inspector / Operario Asignado</label>
                <input
                  type="text"
                  disabled
                  value={inspection?.operator_name || 'Operario de Campo'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consultor Supervisor</label>
                <input
                  type="text"
                  disabled
                  value={inspection?.consultant_name || 'Mateo (Lead Quality Auditor)'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ubicación / Instalación de Cargue</label>
                <input
                  type="text"
                  value={inspection?.location_address || ''}
                  onChange={(e) => inspection && setInspection({ ...inspection, location_address: e.target.value })}
                  placeholder="Ej: Terminal Marítimo Buenaventura Muelle 2, Bodega C"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* GPS Geolocation Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Coordenadas GPS de la Inspección</h4>
                  <p className="text-[11px] text-emerald-700">
                    {inspection?.latitude && inspection?.longitude
                      ? `Latitud: ${inspection.latitude.toFixed(5)} | Longitud: ${inspection.longitude.toFixed(5)} (Fijado)`
                      : 'Presione el botón para obtener coordenadas automáticas desde el celular.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCaptureGPS}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Capturar GPS Ahora
              </button>
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 2: INFORMACIÓN DEL CONTENEDOR
        =================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 2: Información del Contenedor</h3>
              <p className="text-xs text-slate-500">Registre número de contenedor, tipo, sellos y condiciones de transporte.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Contenedor *</label>
                <input
                  type="text"
                  value={container.container_number || ''}
                  onChange={(e) => setContainer({ ...container, container_number: e.target.value.toUpperCase() })}
                  placeholder="Ej: MSKU-729401-8"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Precinto / Sello *</label>
                <input
                  type="text"
                  value={container.seal_number || ''}
                  onChange={(e) => setContainer({ ...container, seal_number: e.target.value.toUpperCase() })}
                  placeholder="Ej: CO-MAERSK-981245"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Contenedor</label>
                <select
                  value={container.container_type || 'Dry Cargo Box'}
                  onChange={(e) => setContainer({ ...container, container_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Dry Cargo Box">Dry Cargo Box (Estándar)</option>
                  <option value="High Cube Dry Box">High Cube Dry Box (HC)</option>
                  <option value="Reefer (Refrigerado)">Reefer (Refrigerado)</option>
                  <option value="Open Top">Open Top</option>
                  <option value="Flat Rack">Flat Rack</option>
                  <option value="Isotanque">Isotanque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tamaño</label>
                <select
                  value={container.size || '40ft HC'}
                  onChange={(e) => setContainer({ ...container, size: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="20ft GP">20ft GP (Estándar)</option>
                  <option value="40ft GP">40ft GP (Estándar)</option>
                  <option value="40ft HC">40ft High Cube (HC)</option>
                  <option value="45ft HC">45ft High Cube</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa Transportadora</label>
                <input
                  type="text"
                  value={container.transporter || ''}
                  onChange={(e) => setContainer({ ...container, transporter: e.target.value })}
                  placeholder="Ej: Maersk Logistics Colombia"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Placa del Cabezote / Vehículo</label>
                <input
                  type="text"
                  value={container.license_plate || ''}
                  onChange={(e) => setContainer({ ...container, license_plate: e.target.value.toUpperCase() })}
                  placeholder="Ej: TLX-408"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Estructural del Contenedor</label>
                <input
                  type="text"
                  value={container.condition || ''}
                  onChange={(e) => setContainer({ ...container, condition: e.target.value })}
                  placeholder="Ej: Excelente estado, sin deformaciones ni óxido en travesaños."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 3: CANTIDAD Y CARGA
        =================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 3: Cantidad y Carga Total</h3>
              <p className="text-xs text-slate-500">Detalles de peso, volumen, embalaje y unidades cargadas.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad Total Cargada</label>
                <input
                  type="number"
                  value={cargo.total_quantity || ''}
                  onChange={(e) => setCargo({ ...cargo, total_quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej: 1450"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                <select
                  value={cargo.unit || 'Cajas'}
                  onChange={(e) => setCargo({ ...cargo, unit: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Cajas">Cajas</option>
                  <option value="Pallets / Tarimas">Pallets / Tarimas</option>
                  <option value="Sacos / Bultos">Sacos / Bultos</option>
                  <option value="Tambores">Tambores</option>
                  <option value="Unidades">Unidades</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peso Bruto (kg)</label>
                <input
                  type="number"
                  value={cargo.gross_weight || ''}
                  onChange={(e) => setCargo({ ...cargo, gross_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej: 22450.0"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peso Neto (kg)</label>
                <input
                  type="number"
                  value={cargo.net_weight || ''}
                  onChange={(e) => setCargo({ ...cargo, net_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej: 21200.0"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Volumen Total (CBM / m³)</label>
                <input
                  type="number"
                  value={cargo.volume || ''}
                  onChange={(e) => setCargo({ ...cargo, volume: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej: 68.5"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Embalaje</label>
                <input
                  type="text"
                  value={cargo.packaging_type || ''}
                  onChange={(e) => setCargo({ ...cargo, packaging_type: e.target.value })}
                  placeholder="Ej: Tarimas Europeas Termotratadas NIMF-15"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones de la Carga</label>
                <textarea
                  rows={3}
                  value={cargo.remarks || ''}
                  onChange={(e) => setCargo({ ...cargo, remarks: e.target.value })}
                  placeholder="Detalles adicionales sobre zunchado, plástico termoencogible o esquineros..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 4: CHECKLIST DINÁMICO & CONDICIONES GENERALES
        =================================================== */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 4: Checklist Dinámico de Condiciones</h3>
              <p className="text-xs text-slate-500">
                Responda cada punto con OK, NO OK o N/A. Si selecciona <strong>NO OK</strong>, el sistema abrirá automáticamente el campo de hallazgo obligatorio.
              </p>
            </div>

            <div className="space-y-6">
              {checklistCategories.map((cat) => (
                <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    <span>{cat.name}</span>
                  </div>

                  <div className="divide-y divide-slate-100 bg-white">
                    {(cat.questions || []).map((q, idx) => {
                      const ans = answers[q.id] || { status: 'OK', observations: '' };
                      const isNoOk = ans.status === 'NO_OK';

                      return (
                        <div key={q.id} className={`p-4 transition ${isNoOk ? 'bg-rose-50/50' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-slate-800">
                                {idx + 1}. {q.question_text}
                              </span>
                            </div>

                            {/* Button Selector OK / NO OK / N/A */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setAnswers({
                                    ...answers,
                                    [q.id]: { ...ans, status: 'OK' },
                                  })
                                }
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                  ans.status === 'OK'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                ✓ OK
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAnswers({
                                    ...answers,
                                    [q.id]: { ...ans, status: 'NO_OK', severity: ans.severity || 'MEDIA' },
                                  })
                                }
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                  ans.status === 'NO_OK'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                ✕ NO OK
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAnswers({
                                    ...answers,
                                    [q.id]: { ...ans, status: 'NA' },
                                  })
                                }
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                  ans.status === 'NA'
                                    ? 'bg-slate-700 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                N/A
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Finding Area on NO OK */}
                          {isNoOk && (
                            <div className="mt-3 p-3 bg-white border border-rose-200 rounded-lg space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Hallazgo Detectado (Obligatorio)
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-semibold text-slate-600">Severidad:</label>
                                  <select
                                    value={ans.severity || 'MEDIA'}
                                    onChange={(e) =>
                                      setAnswers({
                                        ...answers,
                                        [q.id]: { ...ans, severity: e.target.value },
                                      })
                                    }
                                    className="text-xs font-bold px-2 py-1 rounded border border-rose-300 bg-white text-rose-800"
                                  >
                                    <option value="BAJA">BAJA</option>
                                    <option value="MEDIA">MEDIA</option>
                                    <option value="ALTA">ALTA</option>
                                    <option value="CRITICA">CRÍTICA</option>
                                  </select>
                                </div>
                              </div>

                              <textarea
                                rows={2}
                                value={ans.observations}
                                onChange={(e) =>
                                  setAnswers({
                                    ...answers,
                                    [q.id]: { ...ans, observations: e.target.value },
                                  })
                                }
                                placeholder="Describa el hallazgo y adjunte evidencia fotográfica en el paso de evidencias..."
                                className="w-full px-3 py-1.5 text-xs rounded border border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          )}

                          {/* Simple Note on OK or NA */}
                          {!isNoOk && (
                            <input
                              type="text"
                              value={ans.observations}
                              onChange={(e) =>
                                setAnswers({
                                  ...answers,
                                  [q.id]: { ...ans, observations: e.target.value },
                                })
                              }
                              placeholder="Observación opcional..."
                              className="w-full px-3 py-1 text-xs rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 5: PROCESO DE CARGUE
        =================================================== */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 5: Proceso de Cargue y Estiba</h3>
              <p className="text-xs text-slate-500">Horarios, personal, maquinaria y condiciones ambientales.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Inicio del Cargue</label>
                <input
                  type="time"
                  value={loadingProcess.started_at || '08:30'}
                  onChange={(e) => setLoadingProcess({ ...loadingProcess, started_at: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Finalización</label>
                <input
                  type="time"
                  value={loadingProcess.finished_at || '11:30'}
                  onChange={(e) => setLoadingProcess({ ...loadingProcess, finished_at: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Operarios Involucrados</label>
                <input
                  type="number"
                  value={loadingProcess.personnel_count || 4}
                  onChange={(e) => setLoadingProcess({ ...loadingProcess, personnel_count: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Condiciones Climáticas</label>
                <input
                  type="text"
                  value={loadingProcess.weather_conditions || ''}
                  onChange={(e) => setLoadingProcess({ ...loadingProcess, weather_conditions: e.target.value })}
                  placeholder="Ej: Seco / Sin lluvia, temperatura 24°C"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipos y Maquinaria Utilizada</label>
                <input
                  type="text"
                  value={loadingProcess.equipment_used || ''}
                  onChange={(e) => setLoadingProcess({ ...loadingProcess, equipment_used: e.target.value })}
                  placeholder="Ej: Montacargas Toyota 3.5T + Transpaletas manuales y bolsas de aire"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones del Cargue</label>
                <textarea
                  rows={3}
                  value={loadingProcess.observations || ''}
                  onChange={(e) => setLoadingProcess({ ...loadingProcess, observations: e.target.value })}
                  placeholder="Detalles sobre el orden de carga, amarres, aseguramiento y condiciones generales..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 6: GESTOR DE EVIDENCIAS MULTIMEDIA
        =================================================== */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 6: Evidencias Fotográficas y Multimedia</h3>
              <p className="text-xs text-slate-500">
                Tome o suba fotos organizadas por categorías (Contenedor, Cargue, Producto, Vehículo, Daños).
              </p>
            </div>

            <EvidenceManager
              inspectionId={inspectionId}
              evidences={evidences}
              onEvidencesChange={loadInspectionData}
            />
          </div>
        )}

        {/* ===================================================
            PASO 7: DETALLES DEL PRODUCTO
        =================================================== */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 7: Detalles del Producto Cargado</h3>
              <p className="text-xs text-slate-500">Referencia, marca, lote de fabricación y estado de calidad.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  value={product.product_name || ''}
                  onChange={(e) => setProduct({ ...product, product_name: e.target.value })}
                  placeholder="Ej: Café Especial Tostado en Grano"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Referencia / Código SKU</label>
                <input
                  type="text"
                  value={product.reference || ''}
                  onChange={(e) => setProduct({ ...product, reference: e.target.value })}
                  placeholder="Ej: COF-EXP-2026"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marca Comercial</label>
                <input
                  type="text"
                  value={product.brand || ''}
                  onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                  placeholder="Ej: Mountain Reserve"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lote / Batch Number</label>
                <input
                  type="text"
                  value={product.batch_lot || ''}
                  onChange={(e) => setProduct({ ...product, batch_lot: e.target.value })}
                  placeholder="Ej: LOT-2026-A48"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de Calidad y Embalaje</label>
                <input
                  type="text"
                  value={product.condition || ''}
                  onChange={(e) => setProduct({ ...product, condition: e.target.value })}
                  placeholder="Ej: Embalaje intacto, sellos termosellados sin fugas ni humedad."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones Específicas del Producto</label>
                <textarea
                  rows={3}
                  value={product.observations || ''}
                  onChange={(e) => setProduct({ ...product, observations: e.target.value })}
                  placeholder="Muestreo aleatorio, verificación de temperatura o condiciones especiales..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 8: VEHÍCULO Y MAQUINARIA
        =================================================== */}
        {currentStep === 8 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 8: Vehículo y Maquinaria</h3>
              <p className="text-xs text-slate-500">Datos del conductor, cabezote y condiciones del transporte terrestre.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Vehículo</label>
                <input
                  type="text"
                  value={vehicle.vehicle_type || ''}
                  onChange={(e) => setVehicle({ ...vehicle, vehicle_type: e.target.value })}
                  placeholder="Ej: Tractocamión Kenworth T800"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Placa Vehicular</label>
                <input
                  type="text"
                  value={vehicle.license_plate || ''}
                  onChange={(e) => setVehicle({ ...vehicle, license_plate: e.target.value.toUpperCase() })}
                  placeholder="Ej: SZK-912"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Conductor</label>
                <input
                  type="text"
                  value={vehicle.driver_name || ''}
                  onChange={(e) => setVehicle({ ...vehicle, driver_name: e.target.value })}
                  placeholder="Ej: Carlos Mendoza R."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula / Documento de Identidad</label>
                <input
                  type="text"
                  value={vehicle.driver_id || ''}
                  onChange={(e) => setVehicle({ ...vehicle, driver_id: e.target.value })}
                  placeholder="Ej: CC 79.432.100"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Mecánico y Observaciones</label>
                <textarea
                  rows={3}
                  value={vehicle.observations || ''}
                  onChange={(e) => setVehicle({ ...vehicle, observations: e.target.value })}
                  placeholder="Verificación de documentación vial, SOAT, revisión técnico-mecánica..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 9: RESULTADO Y RESUMEN AUTOMÁTICO
        =================================================== */}
        {currentStep === 9 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 9: Resumen de Calidad y Resultado</h3>
              <p className="text-xs text-slate-500">Evaluación consolidada antes del cierre y firma final.</p>
            </div>

            {/* Overall Result Selector */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2">Dictamen General de la Inspección</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setOverallResult('PASS')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                    overallResult === 'PASS'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>✓ PASS (Aprobado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverallResult('CONDITIONAL')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                    overallResult === 'CONDITIONAL'
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>⚠ CONDICIONAL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverallResult('FAIL')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                    overallResult === 'FAIL'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>✕ FAIL (Rechazado)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Contenedor</span>
                <span className="text-xs font-bold text-slate-900">{container.container_number || 'N/A'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Carga Total</span>
                <span className="text-xs font-bold text-slate-900">{cargo.total_quantity || 0} {cargo.unit || 'uds'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Evidencias</span>
                <span className="text-xs font-bold text-slate-900">{evidences.length} fotos/videos</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Hallazgos</span>
                <span className="text-xs font-bold text-rose-600">
                  {Object.values(answers).filter(a => a.status === 'NO_OK').length} detectados
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones Finales del Inspector</label>
              <textarea
                rows={3}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Observaciones generales para el consultor Mateo y la empresa cliente..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ===================================================
            PASO 10: FIRMA DIGITAL Y ENVÍO
        =================================================== */}
        {currentStep === 10 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Paso 10: Firma Digital y Envío a Revisión</h3>
              <p className="text-xs text-slate-500">
                Firme en el recuadro para validar formalmente los datos de la inspección y enviarla a la bandeja del consultor.
              </p>
            </div>

            <SignaturePad
              signerName={signerName}
              onSignerNameChange={setSignerName}
              initialDataUrl={operatorSignature}
              onSave={(dataUrl) => setOperatorSignature(dataUrl)}
              title="Firma Digital del Operario / Inspector Responsable"
            />

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Declaración de Conformidad</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Certifico que la información, checklist de condiciones del contenedor, datos de cargue y evidencias multimedia aquí registradas corresponden fielmente a los hechos presenciados durante el proceso de inspección.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitToConsultant}
                disabled={saving}
                className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{saving ? 'Enviando a Mateo...' : 'Enviar Inspección a Revisión Técnica'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING MOBILE & DESKTOP NAVIGATION BAR */}
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 sticky bottom-4 z-30">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1 || saving}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        <div className="text-center">
          <span className="text-[11px] font-bold text-slate-800">
            {currentStep} / 10
          </span>
        </div>

        {currentStep < 10 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            <span>Continuar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitToConsultant}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finalizar y Enviar</span>
          </button>
        )}
      </div>
    </div>
  );
};
