'use client';

import React from 'react';
import './DashboardHelpButton.css';

type DashboardHelpButtonProps = {
  label: string;
  onClick: () => void;
  title?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function DashboardHelpButton({ label, onClick, title, className = '', iconOnly = false }: DashboardHelpButtonProps) {
  return (
    <button type="button" className={`dashboard-help-button${iconOnly ? ' dashboard-help-button--icon-only' : ''} ${className}`.trim()} onClick={onClick} title={title} aria-label={label}>
      <span className="dashboard-help-button__icon" aria-hidden="true">{iconOnly ? '?' : 'i'}</span>
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}
