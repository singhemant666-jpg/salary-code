import React from 'react';
import { Skeleton, SkeletonHeader, SkeletonStats } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonHeader actionCount={2} />

      {/* Stats Cards Skeleton */}
      <SkeletonStats count={4} />

      {/* Middle Grid Skeleton */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <div className="glass-card-static" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <Skeleton width="180px" height="20px" />
            <Skeleton width="80px" height="14px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Skeleton width="100%" height="48px" borderRadius="8px" />
            <Skeleton width="100%" height="48px" borderRadius="8px" />
            <Skeleton width="100%" height="48px" borderRadius="8px" />
          </div>
        </div>

        <div className="glass-card-static" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <Skeleton width="160px" height="20px" />
            <Skeleton width="70px" height="14px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="45%" height="16px" />
              <Skeleton width="30%" height="16px" />
            </div>
            <Skeleton width="100%" height="8px" borderRadius="999px" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Skeleton width="100%" height="60px" borderRadius="8px" />
              <Skeleton width="100%" height="60px" borderRadius="8px" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table Skeleton */}
      <div className="glass-card-static" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <Skeleton width="190px" height="20px" />
          <Skeleton width="100px" height="32px" borderRadius="6px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '35%' }}>
                <Skeleton width="36px" height="36px" borderRadius="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="80%" height="14px" style={{ marginBottom: '0.25rem' }} />
                  <Skeleton width="50%" height="11px" />
                </div>
              </div>
              <Skeleton width="20%" height="14px" />
              <Skeleton width="15%" height="22px" borderRadius="999px" />
              <Skeleton width="12%" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
