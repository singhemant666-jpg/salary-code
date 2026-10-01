import React from 'react';

export default function RootLoading() {
  return (
    <div className="loading-screen-container">
      <div className="loading-pulse-ring" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
          MPCG PAYROLL
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          Loading application...
        </span>
      </div>
    </div>
  );
}
