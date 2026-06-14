import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-brand-border p-6 shadow-sm transition-all duration-300 transform-gpu ${
        hoverable 
          ? 'hover:shadow-[0_12px_32px_rgba(168,214,114,0.15)] hover:border-brand-border hover:translate-y-[-3px] hover:scale-[1.01] cursor-pointer' 
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  hoverable?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-brand/10 text-brand',
  trend,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <Card hoverable={hoverable} className={`relative overflow-hidden ${className}`} {...props}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-poppins">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-brand-text mt-2 font-poppins">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1 font-medium">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {trend.value}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">vs last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgColor}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
