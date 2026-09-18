import React, { useState, useRef } from 'react';
import type { Evidence, EvidenceSection } from '../../types';
import { api } from '../../api/client';
import {
  Camera,
  Upload,
  RotateCw,
  Star,
  Trash2,
  Image as ImageIcon,
  Video,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface EvidenceManagerProps {
  inspectionId: string;
  evidences: Evidence[];
  onEvidencesChange: () => void;
  readOnly?: boolean;
}

const SECTIONS: { id: EvidenceSection; label: string }[] = [
  { id: 'CONTENEDOR', label: 'Contenedor' },
  { id: 'CARGUE', label: 'Proceso de Cargue' },
  { id: 'PRODUCTO', label: 'Producto' },
  { id: 'VEHICULO', label: 'Vehículo / Maquinaria' },
  { id: 'DANOS', label: 'Daños / Hallazgos' },
  { id: 'DOCUMENTACION', label: 'Documentación' },
  { id: 'OTRAS', label: 'Otras Evidencias' },
];

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  inspectionId,
  evidences,
  onEvidencesChange,
  readOnly = false,
}) => {
  const [selectedSection, setSelectedSection] = useState<EvidenceSection>('CONTENEDOR');
  const [isUploading, setIsUploading] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const filteredEvidences = evidences.filter((e) => e.section === selectedSection);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('section', selectedSection);
      formData.append('description', descriptionInput || file.name);
      formData.append('is_primary', filteredEvidences.length === 0 ? '1' : '0');

      await api.post(`/evidences/inspection/${inspectionId}`, formData);
      setDescriptionInput('');
      onEvidencesChange();
    } catch (err: any) {
      alert(err.message || 'Error al subir evidencia');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRotate = async (evidence: Evidence) => {
    if (readOnly) return;
    const newRotation = (evidence.rotation + 90) % 360;
    try {
      await api.put(`/evidences/${evidence.id}`, { rotation: newRotation });
      onEvidencesChange();
    } catch (err) {
      console.error('Rotate error:', err);
    }
  };

  const handleTogglePrimary = async (evidence: Evidence) => {
    if (readOnly) return;
    try {
      await api.put(`/evidences/${evidence.id}`, { is_primary: evidence.is_primary ? 0 : 1 });
      onEvidencesChange();
    } catch (err) {
      console.error('Primary toggle error:', err);
    }
  };

  const handleDelete = async (evidence: Evidence) => {
    if (readOnly) return;
    if (!confirm('¿Deseas eliminar esta evidencia?')) return;
    try {
      await api.delete(`/evidences/${evidence.id}`);
      onEvidencesChange();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Section Pills */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-3 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
        {SECTIONS.map((sec) => {
          const count = evidences.filter((e) => e.section === sec.id).length;
          const active = selectedSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 transition ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{sec.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Controls for Mobile & Desktop */}
      {!readOnly && (
        <div className="p-4 border-b border-slate-100 bg-emerald-50/40">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <input
                type="text"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Descripción de la fotografía o video (opcional)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Camera Button (Mobile capture) */}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Tomar Foto</span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Upload Button */}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Subir Archivo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
          {isUploading && (
            <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              Subiendo y procesando evidencia multimedia...
            </div>
          )}
        </div>
      )}

      {/* Grid of Evidences */}
      <div className="p-4">
        {filteredEvidences.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-500">No hay evidencias registradas en esta sección</p>
            {!readOnly && (
              <p className="text-[11px] text-slate-400 mt-1">Usa los botones de arriba para tomar o subir fotografías y videos</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEvidences.map((ev) => {
              const isVideo = ev.type === 'VIDEO';
              const fileUrl = `/${ev.file_path}`;

              return (
                <div
                  key={ev.id}
                  className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  {/* Photo Header Ribbon */}
                  <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-medium z-10">
                    <span className="truncate max-w-[120px]">{ev.section}</span>
                    {ev.is_primary ? (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400" /> Principal
                      </span>
                    ) : null}
                  </div>

                  {/* Media Content */}
                  <div className="relative aspect-4/3 bg-slate-200 flex items-center justify-center overflow-hidden">
                    {isVideo ? (
                      <video src={fileUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={fileUrl}
                        alt={ev.description || ev.file_name}
                        style={{ transform: `rotate(${ev.rotation || 0}deg)` }}
                        className="w-full h-full object-cover transition-transform duration-300"
                      />
                    )}
                  </div>

                  {/* Caption & Controls */}
                  <div className="p-2.5 bg-white border-t border-slate-100 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {ev.description || ev.file_name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : ''}</span>
                      <span>{(ev.file_size / 1024).toFixed(0)} KB</span>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                        {!isVideo && (
                          <button
                            type="button"
                            onClick={() => handleRotate(ev)}
                            title="Rotar 90°"
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTogglePrimary(ev)}
                          title={ev.is_primary ? 'Desmarcar principal' : 'Marcar como foto principal'}
                          className={`p-1 rounded transition ${
                            ev.is_primary ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${ev.is_primary ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev)}
                          title="Eliminar evidencia"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
