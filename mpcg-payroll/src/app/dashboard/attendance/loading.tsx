import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonStats, SkeletonTable } from '@/components/ui/Skeleton';

export default function AttendanceLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={3} />

      {/* Summary Cards */}
      <SkeletonStats count={4} />

      {/* Filters bar */}
      <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width="130px" height="38px" borderRadius="8px" />
          <Skeleton width="90px" height="38px" borderRadius="8px" />
          <Skeleton width="180px" height="38px" borderRadius="8px" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Skeleton width="80px" height="38px" borderRadius="8px" />
          <Skeleton width="110px" height="38px" borderRadius="8px" />
        </div>
      </div>

      {/* Attendance Daily Table */}
      <SkeletonTable columns={8} rows={10} />
    </div>
  );
}
