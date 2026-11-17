'use client';

import React from 'react';
import './DashboardHelpButton.css';

type DashboardHelpButtonProps = {
  label: string;
  onClick: () => void;
  title?: string;
  className?: string;
};

export default function DashboardHelpButton({ label, onClick, title, className = '' }: DashboardHelpButtonProps) {
  return (
    <button type="button" className={`dashboard-help-button ${className}`.trim()} onClick={onClick} title={title}>
      <span className="dashboard-help-button__icon" aria-hidden="true">i</span>
      <span>{label}</span>
    </button>
  );
}
