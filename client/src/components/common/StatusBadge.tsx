import React from 'react';
import type { InspectionStatus, OverallResult } from '../../types';

interface StatusBadgeProps {
  status: InspectionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs: Record<InspectionStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
    BORRADOR: {
      label: 'Borrador',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-400',
    },
    ASIGNADA: {
      label: 'Asignada',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    EN_PROCESO: {
      label: 'En Proceso',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500 animate-pulse',
    },
    PENDIENTE_REVISION: {
      label: 'Pendiente de Revisión',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    },
    EN_CORRECCION: {
      label: 'En Corrección',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
    },
    APROBADA: {
      label: 'Aprobada',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    RECHAZADA: {
      label: 'Rechazada',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    },
    FINALIZADA: {
      label: 'Finalizada',
      bg: 'bg-slate-900',
      text: 'text-slate-100',
      border: 'border-slate-800',
      dot: 'bg-emerald-400',
    },
  };

  const config = configs[status] || configs.BORRADOR;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export const ResultBadge: React.FC<{ result: OverallResult }> = ({ result }) => {
  if (result === 'PASS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-600 text-white tracking-wide">
        ✓ PASS
      </span>
    );
  }
  if (result === 'FAIL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white tracking-wide">
        ✕ FAIL
      </span>
    );
  }
  if (result === 'CONDITIONAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500 text-white tracking-wide">
        ⚠ CONDICIONAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-200 text-slate-600">
      Pendiente
    </span>
  );
};
