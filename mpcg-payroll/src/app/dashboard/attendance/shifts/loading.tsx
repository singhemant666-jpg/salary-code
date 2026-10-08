import React from 'react';
import { SkeletonHeader, SkeletonTable } from '@/components/ui/Skeleton';

export default function ShiftsLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={1} />
      <SkeletonTable columns={6} rows={7} />
    </div>
  );
}
