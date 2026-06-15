import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import DepartmentDetails from './pages/DepartmentDetails';
import { ToastProvider } from './components/ui/Toast';
import { DEPARTMENTS } from './config/departments';

const AppLayout: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return '';
    if (pathname.startsWith('/candidates')) return 'Candidate Management';
    if (pathname.startsWith('/departments/')) {
      const deptId = pathname.split('/')[2];
      const dept = DEPARTMENTS.find(d => d.id === deptId);
      return dept ? `${dept.name} Department` : 'Department Details';
    }
    return 'Deepwoods Automation Portal';
  };

  return (
    <div className="flex min-h-screen bg-brand-bg/10">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar Header */}
        <Header title={getPageTitle(location.pathname)} />

        {/* Dynamic Route Content */}
        <main className="p-8 flex-1 bg-brand-bg/30">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/departments/:id" element={<DepartmentDetails />} />
            {/* Catch-all redirect to Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
