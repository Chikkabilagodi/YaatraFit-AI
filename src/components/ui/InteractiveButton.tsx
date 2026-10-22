import React from 'react';

interface InteractiveButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-sm hover:shadow-amber-500/20 active:bg-amber-600',
    secondary:
      'bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 border border-white/[0.08] active:bg-slate-800',
    ghost:
      'bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white active:bg-white/[0.1]',
    outline:
      'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 active:bg-amber-500/30',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
