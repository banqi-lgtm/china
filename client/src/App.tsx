import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InspectionsListPage } from './pages/InspectionsListPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { InspectionWizard } from './components/wizard/InspectionWizard';
import { ReportsCenterPage } from './pages/ReportsCenterPage';
import { ChecklistsAdminPage } from './pages/ChecklistsAdminPage';
import { CompaniesAdminPage } from './pages/CompaniesAdminPage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { api } from './api/client';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-white">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Iniciando InspectionPro...
        </span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Handle creating a new inspection
  const handleCreateNewInspection = async () => {
    try {
      const res = await api.post('/inspections', {
        notes: 'Nueva inspección iniciada desde plataforma web/móvil.',
      });
      setSelectedInspectionId(res.id);
      setCurrentTab('inspection-wizard');
    } catch (err: any) {
      alert(err.message || 'Error al crear inspección');
    }
  };

  const handleSelectInspection = (id: string) => {
    setSelectedInspectionId(id);
    setCurrentTab('inspection-detail');
  };

  const handleOpenWizard = (id: string) => {
    setSelectedInspectionId(id);
    setCurrentTab('inspection-wizard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'inspection-detail' && tab !== 'inspection-wizard') {
              setSelectedInspectionId(null);
            }
          }}
          onNewInspection={handleCreateNewInspection}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectInspection={handleSelectInspection}
              onNewInspection={handleCreateNewInspection}
            />
          )}

          {currentTab === 'inspections' && (
            <InspectionsListPage
              onSelectInspection={handleSelectInspection}
              onOpenWizard={handleOpenWizard}
              onNewInspection={handleCreateNewInspection}
            />
          )}

          {currentTab === 'inspection-detail' && selectedInspectionId && (
            <InspectionDetailPage
              inspectionId={selectedInspectionId}
              onBack={() => setCurrentTab('inspections')}
              onEditWizard={() => setCurrentTab('inspection-wizard')}
            />
          )}

          {currentTab === 'inspection-wizard' && selectedInspectionId && (
            <InspectionWizard
              inspectionId={selectedInspectionId}
              onFinish={() => {
                setCurrentTab('inspections');
                setSelectedInspectionId(null);
              }}
              onCancel={() => {
                setCurrentTab('inspections');
                setSelectedInspectionId(null);
              }}
            />
          )}

          {currentTab === 'reports' && <ReportsCenterPage />}

          {currentTab === 'checklists' && <ChecklistsAdminPage />}

          {currentTab === 'companies' && <CompaniesAdminPage />}

          {currentTab === 'users' && <UsersAdminPage />}

          {currentTab === 'audit' && <AuditLogsPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
