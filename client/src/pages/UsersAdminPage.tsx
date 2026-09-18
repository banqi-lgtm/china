import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { User, Company, UserRole } from '../types';
import { Users, Plus, Shield, Building2, Mail, Phone, Lock } from 'lucide-react';

export const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [companyId, setCompanyId] = useState('');
  const [phone, setPhone] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, cRes] = await Promise.all([
        api.get<{ users: User[] }>('/users'),
        api.get<{ companies: Company[] }>('/companies'),
      ]);
      setUsers(uRes.users || []);
      setCompanies(cRes.companies || []);
      if (cRes.companies && cRes.companies.length > 0) {
        setCompanyId(cRes.companies[0].id);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    try {
      await api.post('/users', {
        name,
        email,
        password,
        role,
        company_id: role === 'SUPER_ADMIN' || role === 'CONSULTANT' ? null : companyId,
        phone,
      });
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      alert('Usuario creado exitosamente');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear usuario');
    }
  };

  const roleBadges: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-rose-100 text-rose-800 border-rose-200',
    CONSULTANT: 'bg-purple-100 text-purple-800 border-purple-200',
    OPERATOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CLIENT: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          <span>Gestión de Usuarios y Roles (RBAC)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Administración de Super Administradores, Consultores (Mateo), Operarios y Clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleCreateUser} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Registrar Nuevo Usuario</span>
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mateo González"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo Electrónico *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contraseña *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rol en el Sistema *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="OPERATOR">Operario / Empleado (Móvil en campo)</option>
              <option value="CONSULTANT">Consultor (Mateo - Aprobador)</option>
              <option value="CLIENT">Cliente / Empresa Contratante</option>
              <option value="SUPER_ADMIN">Super Admin (Control Total)</option>
            </select>
          </div>

          {(role === 'CLIENT' || role === 'OPERATOR') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Empresa Asignada</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 310 000 0000"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
          >
            Crear Usuario
          </button>
        </form>

        {/* User Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Empresa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadges[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.company_name || 'Global'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
