import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/ui/Skeleton';

export default function SalarySlipsLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={2} />

      {/* Filter Options Skeleton */}
      <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width="130px" height="38px" borderRadius="8px" />
          <Skeleton width="90px" height="38px" borderRadius="8px" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Skeleton width="100px" height="38px" borderRadius="8px" />
          <Skeleton width="120px" height="38px" borderRadius="8px" />
        </div>
      </div>

      <SkeletonTable columns={6} rows={8} />
    </div>
  );
}
