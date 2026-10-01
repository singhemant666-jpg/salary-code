import React from 'react';
import { SkeletonHeader, SkeletonTable } from '@/components/ui/Skeleton';

export default function AuditLogLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={1} />
      <SkeletonTable columns={7} rows={9} />
    </div>
  );
}
