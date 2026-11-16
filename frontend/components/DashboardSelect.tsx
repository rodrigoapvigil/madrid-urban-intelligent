'use client';

import React, { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type DashboardSelectProps = {
  value: ReactNode;
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
  ariaHaspopup?: 'listbox' | 'dialog';
  ariaControls?: string;
  ariaLabel?: string;
};

/** Shared trigger and shell for dashboard selectors across all market profiles. */
export default function DashboardSelect({
  value,
  expanded,
  disabled = false,
  onToggle,
  className = '',
  ariaHaspopup = 'listbox',
  ariaControls,
  ariaLabel,
}: DashboardSelectProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`v2-custom-select ${expanded ? 'open' : ''} ${className}`.trim()}
      aria-haspopup={ariaHaspopup}
      aria-controls={ariaControls}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      onClick={onToggle}
    >
      <span>{value}</span>
      <ChevronDown size={14} className="v2-select-chevron" />
    </button>
  );
}
