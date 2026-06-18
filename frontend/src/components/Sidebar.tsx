import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ChevronLeft, ChevronRight, Building2, ChevronDown, Shield, LogOut, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPARTMENTS } from '../config/departments';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeptsOpen, setIsDeptsOpen] = useState(true);
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Candidates', path: '/candidates', icon: Users },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: Shield });
  }

  const handleNavClick = () => {
    // Close mobile drawer on navigation
    onClose();
  };

  return (
    <>
      {/* ── Desktop sidebar (lg+): sticky collapsible rail ── */}
      <motion.aside
        animate={{ width: isCollapsed ? 76 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex bg-white border-r border-gray-200 flex-col h-screen sticky top-0 z-20 select-none overflow-hidden shrink-0"
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center border-b border-gray-200 bg-white animate-fade-in relative justify-center">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded-logo"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="relative group flex items-center justify-center w-full h-full py-2 px-6"
              >
                <img
                  src="/DeepwoodsR.png"
                  alt="Deepwoods Green Logo"
                  className="h-12 w-auto object-contain transition-all duration-300 group-hover:scale-[1.02]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="w-10 h-10 flex items-center justify-center"
              >
                <img
                  src="/favicon.png"
                  alt="Leaf Logo"
                  className="w-10 h-10 object-contain transition-all duration-200"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <NavContent
          navItems={navItems}
          isCollapsed={isCollapsed}
          isDeptsOpen={isDeptsOpen}
          setIsDeptsOpen={setIsDeptsOpen}
          user={user}
          logout={logout}
          onNavClick={handleNavClick}
          isMobile={false}
        />

        {/* Collapse Toggle Button */}
        <div className="p-4 border-t border-gray-200 bg-transparent flex items-center justify-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center justify-center"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile sidebar (< lg): fixed drawer ── */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex flex-col h-screen select-none overflow-hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Brand Header */}
        <div className="h-16 flex items-center justify-between border-b border-gray-200 px-4">
          <img
            src="/DeepwoodsR.png"
            alt="Deepwoods Green Logo"
            className="h-9 w-auto object-contain"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <NavContent
          navItems={navItems}
          isCollapsed={false}
          isDeptsOpen={isDeptsOpen}
          setIsDeptsOpen={setIsDeptsOpen}
          user={user}
          logout={logout}
          onNavClick={handleNavClick}
          isMobile={true}
        />
      </div>
    </>
  );
};

// ── Shared nav content for both desktop and mobile ──
interface NavContentProps {
  navItems: { name: string; path: string; icon: React.ComponentType<any> }[];
  isCollapsed: boolean;
  isDeptsOpen: boolean;
  setIsDeptsOpen: (v: boolean) => void;
  user: any;
  logout: () => void;
  onNavClick: () => void;
  isMobile: boolean;
}

const NavContent: React.FC<NavContentProps> = ({
  navItems, isCollapsed, isDeptsOpen, setIsDeptsOpen, user, logout, onNavClick, isMobile,
}) => (
  <>
    {/* Navigation Links */}
    <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 select-none ${isActive
                ? 'bg-[#91ba30]/10 text-[#5a8a10] border-l-4 border-[#91ba30] pl-2.5'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              } ${isCollapsed && !isMobile ? 'justify-center' : ''}`
            }
            title={isCollapsed && !isMobile ? item.name : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <AnimatePresence>
              {(!isCollapsed || isMobile) && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="truncate font-jakarta"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        );
      })}

      {/* Collapsible Departments Menu */}
      <div className="space-y-1 pt-2 border-t border-gray-200">
        <button
          onClick={() => {
            setIsDeptsOpen(!isDeptsOpen);
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800 select-none ${
            isCollapsed && !isMobile ? 'justify-center' : ''
          }`}
          title={isCollapsed && !isMobile ? 'Departments' : undefined}
        >
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 shrink-0 text-gray-500" />
            {(!isCollapsed || isMobile) && <span className="font-jakarta">Departments</span>}
          </div>
          {(!isCollapsed || isMobile) && (
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDeptsOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        <AnimatePresence initial={false}>
          {isDeptsOpen && (!isCollapsed || isMobile) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pl-5 space-y-1 overflow-hidden"
            >
              {DEPARTMENTS.map((dept) => (
                <NavLink
                  key={dept.id}
                  to={`/departments/${dept.id}`}
                  onClick={onNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${isActive
                      ? 'bg-[#91ba30]/10 text-[#5a8a10] font-bold border-l-2 border-[#91ba30] pl-2.5'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`
                  }
                >
                  <span className="truncate">{dept.name}</span>
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>

    {/* User & Logout Section */}
    {user && (
      <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2 select-none">
        {(!isCollapsed || isMobile) && (
          <div className="px-2 py-1">
            <p className="text-xs font-bold text-gray-800 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 ${
            isCollapsed && !isMobile ? 'justify-center' : ''
          }`}
          title={isCollapsed && !isMobile ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="font-jakarta">Sign Out</span>}
        </button>
      </div>
    )}
  </>
);

export default Sidebar;
