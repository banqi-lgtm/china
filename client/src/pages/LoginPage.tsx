import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (targetRole: UserRole) => {
    setLoading(true);
    setError('');
    try {
      await switchRole(targetRole);
    } catch (err: any) {
      setError(err.message || 'Error en inicio rápido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <Shield className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          INSPECTION<span className="text-emerald-500 font-extrabold">PRO</span>
        </h2>
        <p className="text-xs text-slate-400">
          Plataforma Empresarial de Inspección, Cargue y Reportes Oficiales
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Corporativo</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Role Testing Sandbox */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Acceso Rápido Demo (1 Clic)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('CONSULTANT')}
                className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-left transition"
              >
                <div className="text-xs font-bold text-purple-300">Mateo</div>
                <div className="text-[10px] text-purple-400/80">Consultor / Aprobador</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('OPERATOR')}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-left transition"
              >
                <div className="text-xs font-bold text-emerald-300">Operario Demo</div>
                <div className="text-[10px] text-emerald-400/80">Móvil en campo</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('CLIENT')}
                className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-950/30 hover:bg-blue-900/40 text-left transition"
              >
                <div className="text-xs font-bold text-blue-300">Cliente Demo</div>
                <div className="text-[10px] text-blue-400/80">TransLogix Global</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('SUPER_ADMIN')}
                className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/40 text-left transition"
              >
                <div className="text-xs font-bold text-rose-300">Super Admin</div>
                <div className="text-[10px] text-rose-400/80">Control total SaaS</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
