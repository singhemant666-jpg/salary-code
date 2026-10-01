import React from 'react';
import { SkeletonHeader, SkeletonStats, SkeletonTable } from '@/components/ui/Skeleton';

export default function LeavesLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <SkeletonHeader actionCount={1} />
      <SkeletonStats count={4} />
      <SkeletonTable columns={7} rows={7} />
    </div>
  );
}
