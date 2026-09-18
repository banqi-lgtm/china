import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  CheckSquare,
  Building2,
  Users,
  ShieldAlert,
  Smartphone,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onNewInspection?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onNewInspection,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === 'SUPER_ADMIN';
  const isConsultant = user.role === 'CONSULTANT';
  const isOperator = user.role === 'OPERATOR';
  const isClient = user.role === 'CLIENT';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inspections', label: isOperator ? 'Mis Inspecciones' : 'Inspecciones', icon: ClipboardList },
    { id: 'reports', label: 'Centro de Informes', icon: FileText },
  ];

  const adminItems = [
    { id: 'checklists', label: 'Checklists Dinámicos', icon: CheckSquare },
    { id: 'companies', label: 'Empresas / Clientes', icon: Building2 },
    { id: 'users', label: 'Usuarios y Roles', icon: Users },
    { id: 'audit', label: 'Auditoría & Logs', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 flex-shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Action Button: Nueva Inspección */}
        {!isClient && onNewInspection && (
          <button
            onClick={onNewInspection}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            {isOperator ? 'Iniciar Inspección' : 'Nueva Inspección'}
          </button>
        )}

        {/* Main Navigation */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-2">
            Operaciones
          </span>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
                    active
                      ? 'bg-emerald-600/15 text-emerald-400 font-semibold border-r-2 border-emerald-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin & Audit Section */}
        {(isAdmin || isConsultant) && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-2">
              {isAdmin ? 'Administración Global' : 'Auditoría Técnica'}
            </span>
            <nav className="space-y-1">
              {(isAdmin ? adminItems : adminItems.filter(i => i.id === 'audit')).map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
                      active
                        ? 'bg-emerald-600/15 text-emerald-400 font-semibold border-r-2 border-emerald-500'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Footer / Mobile App hint */}
      <div className="pt-4 border-t border-slate-800">
        <div className="bg-slate-800/60 p-3 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white">Modo Mobile-First</div>
            <div className="text-[10px] text-slate-400">Optimizada para celulares</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
