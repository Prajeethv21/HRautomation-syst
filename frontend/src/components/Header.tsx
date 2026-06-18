import React, { useState, useEffect } from 'react';
import { Calendar, Search, ArrowRight, Menu } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { DEPARTMENTS } from '../config/departments';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  const [searchVal, setSearchVal] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Handle keyboard shortcut for search (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('quick-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchVal.trim().toLowerCase();
    if (!query) return;

    // 1. Check for Admin Panel
    if (query === 'admin' || query === 'admin panel' || query.includes('admin')) {
      navigate('/admin');
      setSearchVal('');
      setShowMobileSearch(false);
      return;
    }

    // 2. Check for Departments (exact or partial matches)
    const matchedDept = DEPARTMENTS.find(
      (dept) =>
        dept.name.toLowerCase() === query ||
        dept.id.toLowerCase() === query ||
        dept.name.toLowerCase().includes(query) ||
        query.includes(dept.name.toLowerCase())
    );

    if (matchedDept) {
      navigate(`/departments/${matchedDept.id}`);
      setSearchVal('');
      setShowMobileSearch(false);
      return;
    }

    // 3. Default: search in candidate directory
    navigate(`/candidates?search=${encodeURIComponent(searchVal.trim())}`);
    setShowMobileSearch(false);
  };

  if (isDashboard) {
    return (
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
        <div className="h-16 md:h-20 px-4 md:px-8 flex items-center gap-3">
          {/* Hamburger (mobile only) */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Left Side: Title & Subtitle */}
          <div className="space-y-0 select-none min-w-0">
            <h1 className="text-base md:text-xl font-bold font-jakarta text-[#111111] tracking-tight leading-tight truncate">
              HR Automation Portal
            </h1>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium hidden sm:block">
              Management Console · Centralized hiring workflow
            </p>
          </div>

          {/* Center: Search Bar (hidden on small, visible md+) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4 md:mx-8 relative">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="quick-search-input"
                type="text"
                placeholder="Quick search..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-10 pr-12 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white border border-[#E5E7EB] px-1.5 py-0.5 rounded-md text-[9px] font-bold text-gray-400 select-none pointer-events-none">
                <span className="text-[10px]">⌘</span>K
              </div>
            </div>
          </form>

          {/* Right Side: Date + Manage Directory */}
          <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
            {/* Search icon (mobile only) */}
            <button
              onClick={() => setShowMobileSearch(v => !v)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Date Display */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-800 bg-white px-3 md:px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
              <Calendar className="w-4 h-4 text-brand" />
              <span className="hidden md:inline">{currentDate}</span>
            </div>

            {/* Manage Directory Button */}
            <Link
              to="/candidates"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-primary hover:bg-brand-secondary text-white px-3 md:px-5 py-2 md:py-2.5 rounded-2xl transition-all duration-150 active:scale-95 group font-jakarta whitespace-nowrap"
            >
              <span className="hidden sm:inline">Manage Directory</span>
              <span className="sm:hidden">Directory</span>
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Mobile search bar dropdown */}
        {showMobileSearch && (
          <div className="md:hidden px-4 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Search candidates, departments..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-200"
              />
            </form>
          </div>
        )}
      </header>
    );
  }

  // Standard header for other pages
  return (
    <header className="h-14 md:h-20 border-b border-brand-border bg-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 gap-3">
      {/* Hamburger (mobile only) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {title.includes('Sustainability') && (
          <img src="/favicon.png" alt="Leaf Logo" className="w-5 h-5 object-contain shrink-0" />
        )}
        <h2 className="text-base md:text-xl font-semibold text-brand-text font-jakarta truncate">{title}</h2>
      </div>

      {/* Actions and Status */}
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        {/* Date Display */}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-brand-bg px-2 md:px-3 py-1.5 rounded-lg border border-brand-border/60">
          <Calendar className="w-4 h-4 text-brand shrink-0" />
          <span className="hidden sm:inline">{currentDate}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
