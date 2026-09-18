import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Company } from '../types';
import { Building2, Plus, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';

export const CompaniesAdminPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ companies: Company[] }>('/companies');
      setCompanies(res.companies || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post('/companies', {
        name,
        tax_id: taxId,
        address,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
      setName('');
      setTaxId('');
      setAddress('');
      setContactEmail('');
      setContactPhone('');
      loadCompanies();
    } catch (err: any) {
      alert(err.message || 'Error al registrar empresa');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <span>Gestión de Empresas & Clientes</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Empresas contratantes con aislamiento de datos RBAC por tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Registrar Empresa Contratante</span>
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre Comercial *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: TransLogix Logistics Corp"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Identificación Tributaria (NIT / Tax ID)</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Ej: NIT 901.849.201-4"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo de Contacto</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="operaciones@empresa.com"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+57 (1) 745-9000"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dirección / Puerto</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Zona Franca, Parque Industrial"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
          >
            Crear Empresa
          </button>
        </form>

        {/* List of Companies */}
        <div className="lg:col-span-2 space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Activa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                {c.tax_id && <div>NIT: <strong className="text-slate-800">{c.tax_id}</strong></div>}
                {c.contact_email && <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" />{c.contact_email}</div>}
                {c.contact_phone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{c.contact_phone}</div>}
                {c.address && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{c.address}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
