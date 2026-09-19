import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="StreamCopilot Logo"
    >
      {/* Precision geometric stream chevrons: prompt (>) + streaming delta (>) */}
      <path
        d="M6 5.5L12.5 12L6 18.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5.5L18.5 12L12 18.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-zinc-500 dark:text-zinc-500"
      />
    </svg>
  );
};
