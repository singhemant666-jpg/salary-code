import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonCard } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={1} />

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}
