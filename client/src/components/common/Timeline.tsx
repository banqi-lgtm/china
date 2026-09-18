import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import type { InspectionStatus, TimelineEvent } from '../../types';

interface TimelineProps {
  currentStatus: InspectionStatus;
  history?: TimelineEvent[];
}

interface StepDef {
  key: string;
  label: string;
  statusMatch: InspectionStatus[];
}

const steps: StepDef[] = [
  { key: 'CREADA', label: 'Creada', statusMatch: ['BORRADOR'] },
  { key: 'ASIGNADA', label: 'Asignada', statusMatch: ['ASIGNADA'] },
  { key: 'EN_PROCESO', label: 'En Proceso / Campo', statusMatch: ['EN_PROCESO', 'EN_CORRECCION'] },
  { key: 'PENDIENTE_REVISION', label: 'Finalizada por Operario', statusMatch: ['PENDIENTE_REVISION'] },
  { key: 'APROBADA', label: 'Revisada y Aprobada', statusMatch: ['APROBADA'] },
  { key: 'FINALIZADA', label: 'Informe y Entrega', statusMatch: ['FINALIZADA'] },
];

export const InspectionTimeline: React.FC<TimelineProps> = ({ currentStatus, history = [] }) => {
  const getStepIndex = (status: InspectionStatus) => {
    switch (status) {
      case 'BORRADOR': return 0;
      case 'ASIGNADA': return 1;
      case 'EN_PROCESO':
      case 'EN_CORRECCION': return 2;
      case 'PENDIENTE_REVISION': return 3;
      case 'APROBADA': return 4;
      case 'FINALIZADA': return 5;
      case 'RECHAZADA': return 3;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isRejected = currentStatus === 'RECHAZADA';
  const isInCorrection = currentStatus === 'EN_CORRECCION';

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center justify-between">
        <span>Trazabilidad y Línea de Tiempo</span>
        {isInCorrection && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
            En fase de corrección técnica
          </span>
        )}
      </h3>

      {/* Horizontal Steps Bar */}
      <div className="relative flex items-center justify-between mb-8 overflow-x-auto pb-2">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full -z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-600 transition-all duration-500 -z-0"
          style={{ width: `${(Math.min(currentIndex, 5) / 5) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 min-w-[70px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? isRejected
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : isInCorrection
                      ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                      : 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-white text-slate-400 border-2 border-slate-300'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  isRejected ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[11px] font-medium mt-2 text-center max-w-[90px] leading-tight ${
                  isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* History Log Feed */}
      {history.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Historial de Eventos</h4>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {history.map((ev, i) => (
              <div key={ev.id || i} className="flex items-start gap-2.5 text-xs text-slate-600">
                <Circle className="w-2 h-2 text-emerald-500 fill-emerald-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{ev.comment || `Cambio a ${ev.new_status}`}</span>
                    <span className="text-[10px] text-slate-400">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  {ev.user_name && (
                    <span className="text-[11px] text-slate-500">Por: {ev.user_name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
