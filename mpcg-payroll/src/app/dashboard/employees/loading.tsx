import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonTable } from '@/components/ui/Skeleton';

export default function EmployeesLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={2} />

      {/* Table Skeleton */}
      <SkeletonTable columns={7} rows={8} />
    </div>
  );
}
