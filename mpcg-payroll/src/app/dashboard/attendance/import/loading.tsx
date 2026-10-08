import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonCard } from '@/components/ui/Skeleton';

export default function AttendanceImportLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <SkeletonHeader actionCount={1} />
      <div className="glass-card-static" style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', border: '2px dashed var(--border-secondary)' }}>
        <Skeleton width="56px" height="56px" borderRadius="50%" />
        <Skeleton width="240px" height="20px" />
        <Skeleton width="180px" height="14px" />
      </div>
      <SkeletonCard lines={4} />
    </div>
  );
}
