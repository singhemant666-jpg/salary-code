import React from 'react';
import { Skeleton, SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';

export default function PayrollDetailLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Skeleton width="40px" height="40px" borderRadius="8px" />
          <div>
            <Skeleton width="220px" height="28px" style={{ marginBottom: '0.4rem' }} />
            <Skeleton width="180px" height="14px" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width="110px" height="38px" borderRadius="8px" />
          <Skeleton width="130px" height="38px" borderRadius="8px" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <SkeletonStats count={4} />

      {/* 2x2 Calculation Grid */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={7} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}
