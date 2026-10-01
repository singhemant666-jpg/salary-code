import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonStats, SkeletonTable } from '@/components/ui/Skeleton';

export default function PayrollLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <SkeletonHeader actionCount={3} />

      {/* Summary Stat Cards */}
      <SkeletonStats count={4} />

      {/* Month Selector & Filter Pills */}
      <div className="glass-card-static" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Skeleton width="130px" height="38px" borderRadius="8px" />
          <Skeleton width="90px" height="38px" borderRadius="8px" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Skeleton width="70px" height="32px" borderRadius="999px" />
          <Skeleton width="80px" height="32px" borderRadius="999px" />
          <Skeleton width="80px" height="32px" borderRadius="999px" />
          <Skeleton width="80px" height="32px" borderRadius="999px" />
        </div>
      </div>

      {/* Payroll Table */}
      <SkeletonTable columns={8} rows={9} />
    </div>
  );
}
