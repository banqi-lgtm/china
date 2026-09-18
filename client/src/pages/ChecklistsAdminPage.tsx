import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { ChecklistCategory } from '../types';
import {
  CheckSquare,
  Plus,
  Trash2,
  FolderPlus,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export const ChecklistsAdminPage: React.FC = () => {
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category Modal / Input
  const [newCatName, setNewCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [requiresEvidence, setRequiresEvidence] = useState(true);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const res = await api.get('/checklists/template');
      setCategories(res.template || []);
      if (res.template && res.template.length > 0 && !selectedCatId) {
        setSelectedCatId(res.template[0].id);
      }
    } catch (err) {
      console.error('Error loading checklist template:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await api.post('/checklists/categories', {
        name: newCatName,
        order_index: categories.length + 1,
      });
      setNewCatName('');
      loadTemplate();
    } catch (err: any) {
      alert(err.message || 'Error al crear categoría');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !newQuestionText) return;
    try {
      await api.post('/checklists/questions', {
        category_id: selectedCatId,
        question_text: newQuestionText,
        requires_evidence_on_fail: requiresEvidence ? 1 : 0,
        order_index: 99,
      });
      setNewQuestionText('');
      loadTemplate();
    } catch (err: any) {
      alert(err.message || 'Error al crear pregunta');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('¿Desea eliminar este punto de inspección?')) return;
    try {
      await api.delete(`/checklists/questions/${id}`);
      loadTemplate();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600" />
          <span>Diseñador de Checklists Dinámicos</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure categorías, preguntas de auditoría y reglas de evidencia fotográfica obligatoria.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add Category & Add Question */}
        <div className="space-y-6">
          {/* Create Category */}
          <form onSubmit={handleCreateCategory} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>Nueva Categoría</span>
            </h3>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ej: Condiciones de Temperatura y Humedad"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
            >
              Agregar Categoría
            </button>
          </form>

          {/* Create Question */}
          <form onSubmit={handleCreateQuestion} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Nuevo Punto de Inspección</span>
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Categoría Destino</label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pregunta / Punto a Verificar</label>
              <textarea
                rows={3}
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Ej: ¿La temperatura interior coincide con el set-point del manifiesto?"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresEvidence}
                onChange={(e) => setRequiresEvidence(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Exigir fotografía obligatoria si es <strong>NO OK</strong></span>
            </label>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
            >
              Guardar Pregunta
            </button>
          </form>
        </div>

        {/* Right Area: List of Active Checklists */}
        <div className="lg:col-span-2 space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs font-bold">
                <span>{cat.name}</span>
                <span className="text-[11px] text-emerald-400">
                  {cat.questions?.length || 0} preguntas activas
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-2">
                {(cat.questions || []).map((q, idx) => (
                  <div key={q.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition rounded-lg">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">
                        {idx + 1}. {q.question_text}
                      </span>
                      {q.requires_evidence_on_fail === 1 && (
                        <span className="text-[10px] text-amber-600 font-medium block">
                          Requiere evidencia fotográfica si falla (NO OK)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
