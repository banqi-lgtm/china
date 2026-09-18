import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  signerName: string;
  onSignerNameChange?: (name: string) => void;
  title?: string;
  initialDataUrl?: string;
  readOnly?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  signerName,
  onSignerNameChange,
  title = 'Firma Digital del Responsable',
  initialDataUrl,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialDataUrl));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && !readOnly) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSave('');
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpiar firma
          </button>
        )}
      </div>

      <div className="relative border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="w-full h-44 cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
            Firme aquí con el dedo o puntero
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1 items-start sm:items-center justify-between">
        <div className="w-full sm:w-2/3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del Firmante</label>
          <input
            type="text"
            value={signerName}
            disabled={readOnly}
            onChange={(e) => onSignerNameChange && onSignerNameChange(e.target.value)}
            placeholder="Ej: Juan Pérez - Operario de Calidad"
            className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
        </div>
        {hasSignature && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium self-end sm:self-center">
            <Check className="w-4 h-4" />
            Firma capturada
          </div>
        )}
      </div>
    </div>
  );
};
