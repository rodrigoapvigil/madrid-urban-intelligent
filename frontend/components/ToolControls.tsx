import React, { ReactNode } from 'react';
import './ToolControls.css';

type ToolControlsProps = {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  subscriptions?: { period?: 'product' | 'section' | 'independent'; zone?: 'product' | 'section' | 'independent' };
};

export default function ToolControls({ children, trailing, className = '', subscriptions = {} }: ToolControlsProps) {
  return <div className={`tool-controls ${className}`} data-period-source={subscriptions.period || 'independent'} data-zone-source={subscriptions.zone || 'independent'}>
    <div className="tool-controls-main">{children}</div>
    {trailing && <div className="tool-controls-trailing">{trailing}</div>}
  </div>;
}
