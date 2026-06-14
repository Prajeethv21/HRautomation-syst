import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Candidates', path: '/candidates', icon: Users },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 76 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="bg-white border-r border-brand-border flex flex-col h-screen sticky top-0 z-20 select-none overflow-hidden"
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center border-b border-brand-border bg-white animate-fade-in relative justify-center">
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
                src="/Deepwoodsgreen.jpeg" 
                alt="Deepwoods Green Logo" 
                className="h-12 w-auto object-contain transition-all duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none rounded-lg" />
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
                src="/favicon.jpeg" 
                alt="Leaf Logo" 
                className="w-10 h-10 object-contain rounded-xl border border-brand-border bg-white shadow-sm hover:shadow transition-all duration-200"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-[#EDF9E8] text-[#1B4332] shadow-[0_2px_12px_rgba(168,214,114,0.15)]'
                    : 'text-gray-600 hover:bg-[#EDF9E8]/40 hover:text-brand-text'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
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
      </nav>

      {/* Collapse Toggle Button */}
      <div className="p-4 border-t border-brand-border bg-brand-bg/10 flex items-center justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl border border-brand-border bg-white text-gray-500 hover:bg-brand-light hover:text-brand-primary transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center justify-center"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
