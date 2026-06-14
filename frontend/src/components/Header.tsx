import React from 'react';
import { Calendar } from 'lucide-react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 border-b border-brand-border bg-white px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-brand-text font-poppins">{title}</h2>
      </div>

      {/* Actions and Status */}
      <div className="flex items-center gap-6">
        {/* Date Display */}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-brand-bg px-3 py-1.5 rounded-lg border border-brand-border/60">
          <Calendar className="w-4 h-4 text-brand" />
          <span>{currentDate}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
