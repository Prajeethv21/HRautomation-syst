import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import DepartmentDetails from './pages/DepartmentDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { DEPARTMENTS } from './config/departments';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return '';
    if (pathname.startsWith('/candidates')) return 'Candidate Management';
    if (pathname.startsWith('/departments/')) {
      const deptId = pathname.split('/')[2];
      const dept = DEPARTMENTS.find(d => d.id === deptId);
      return dept ? `${dept.name} Department` : 'Department Details';
    }
    if (pathname.startsWith('/admin')) return 'Admin Control Center';
    return 'Deepwoods Automation Portal';
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Header */}
        <Header
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Dynamic Route Content */}
        <main className="p-4 md:p-8 flex-1 bg-[#F9FAFB]">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
            <Route path="/departments/:id" element={<ProtectedRoute><DepartmentDetails /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPanel /></ProtectedRoute>} />
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
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Private layout wrapper */}
            <Route path="*" element={<AppLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
