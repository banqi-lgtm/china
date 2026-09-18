import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { Shield, User, LogOut, ArrowLeftRight, Building2, Bell } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout, switchRole } = useAuth();

  const roleLabels: Record<UserRole, { label: string; badge: string }> = {
    SUPER_ADMIN: { label: 'Super Admin', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
    CONSULTANT: { label: 'Consultor (Mateo)', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
    OPERATOR: { label: 'Operario de Campo', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    CLIENT: { label: 'Cliente / Empresa', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  };

  const currentRole = user ? roleLabels[user.role] : null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
      {/* Brand & Workspace Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-inner">
          <Shield className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <span className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
            INSPECTION<span className="text-emerald-600 font-extrabold">PRO</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Enterprise SaaS
            </span>
          </span>
          {user?.company_name && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              {user.company_name}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls: Role Switcher & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Switcher */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 px-2 flex items-center gap-1 font-medium">
            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
            Rol demo:
          </span>
          <button
            onClick={() => switchRole('SUPER_ADMIN')}
            className={`px-2 py-1 rounded transition font-medium ${
              user?.role === 'SUPER_ADMIN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchRole('CONSULTANT')}
            className={`px-2 py-1 rounded transition font-medium ${
              user?.role === 'CONSULTANT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mateo (Consultor)
          </button>
          <button
            onClick={() => switchRole('OPERATOR')}
            className={`px-2 py-1 rounded transition font-medium ${
              user?.role === 'OPERATOR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Operario
          </button>
          <button
            onClick={() => switchRole('CLIENT')}
            className={`px-2 py-1 rounded transition font-medium ${
              user?.role === 'CLIENT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cliente
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-none">{user.name}</div>
              <span
                className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                  currentRole?.badge || 'bg-slate-100 text-slate-700'
                }`}
              >
                {currentRole?.label}
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
