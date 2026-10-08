'use client';

import React from 'react';
import Link from 'next/link';

export type ButtonVariant = 'gradient' | 'orange' | 'purple' | 'dark' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shimmer?: boolean;
  glow?: boolean;
  pulse?: boolean;
  lift?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  href?: string;
  target?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function AnimatedButton({
  variant = 'gradient',
  size = 'md',
  shimmer = true,
  glow = true,
  pulse = false,
  lift = true,
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  href,
  target,
  fullWidth = false,
  className = '',
  disabled,
  children,
  onClick,
  type = 'button',
  ...rest
}: AnimatedButtonProps) {
  // Tamanhos
  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5',
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-2',
    md: 'px-5 py-2.5 text-xs sm:text-sm rounded-xl gap-2.5',
    lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl gap-3 font-extrabold',
    xl: 'px-8 py-4 text-base sm:text-lg rounded-2xl gap-3.5 font-black',
  };

  // Variantes Visuais
  const variantClasses: Record<ButtonVariant, string> = {
    gradient:
      'bg-gradient-to-r from-tke-purple via-tke-magenta to-tke-orange text-white font-bold border border-white/20 shadow-md shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40',
    orange:
      'bg-gradient-to-r from-tke-orange to-tke-orange-light text-white font-bold border border-orange-400/30 shadow-md shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/50',
    purple:
      'bg-gradient-to-r from-tke-purple-dark to-tke-purple text-white font-bold border border-purple-400/30 shadow-md shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/50',
    dark:
      'bg-slate-900 hover:bg-slate-800 text-slate-100 font-semibold border border-slate-700/80 hover:border-orange-500/50 hover:text-white shadow-md hover:shadow-orange-500/10',
    outline:
      'bg-orange-500/5 hover:bg-orange-500/15 text-orange-400 hover:text-orange-300 font-bold border-2 border-orange-500/50 hover:border-orange-500 shadow-xs hover:shadow-orange-500/20',
    ghost:
      'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white font-medium border border-transparent hover:border-slate-700',
    danger:
      'bg-gradient-to-r from-rose-700 to-red-600 text-white font-bold border border-red-500/30 shadow-md shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/50',
  };

  // Efeitos
  const liftClass = lift && !disabled && !loading ? 'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]' : '';
  const pulseClass = pulse && !disabled ? 'animate-pulse-glow' : '';
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

  const baseClasses = `
    group relative inline-flex items-center justify-center overflow-hidden
    transition-all duration-300 ease-out select-none
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${liftClass}
    ${pulseClass}
    ${widthClass}
    ${disabledClass}
    ${className}
  `.trim();

  // Feixe de luz reflexivo (Shimmer Sweep)
  const shimmerEffect = shimmer && !disabled && !loading && (
    <span
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <span className="absolute top-0 -left-full w-3/5 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] group-hover:left-[220%] transition-all duration-1000 ease-in-out" />
    </span>
  );

  // Efeito de brilho de fundo (Halo/Glow)
  const glowEffect = glow && (variant === 'gradient' || variant === 'orange') && !disabled && (
    <span
      className="absolute -inset-0.5 -z-10 rounded-xl bg-gradient-to-r from-tke-purple to-tke-orange opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-75"
      aria-hidden="true"
    />
  );

  // Conteúdo com ícone
  const content = (
    <>
      {glowEffect}
      {shimmerEffect}

      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText || children}</span>
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5 shrink-0">
              {icon}
            </span>
          )}

          <span className="relative z-10 transition-colors tracking-tight">
            {children}
          </span>

          {icon && iconPosition === 'right' && (
            <span className="transition-transform duration-200 group-hover:translate-x-1 shrink-0">
              {icon}
            </span>
          )}
        </>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} target={target} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={baseClasses}
      {...rest}
    >
      {content}
    </button>
  );
}
