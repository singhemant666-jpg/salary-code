import React from 'react';
import { Skeleton, SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';

export default function EmployeeDetailLoading() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Skeleton width="40px" height="40px" borderRadius="8px" />
          <div>
            <Skeleton width="220px" height="28px" style={{ marginBottom: '0.4rem' }} />
            <Skeleton width="320px" height="14px" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width="110px" height="36px" borderRadius="8px" />
          <Skeleton width="110px" height="36px" borderRadius="8px" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <SkeletonStats count={4} />

      {/* Joining Salary Hold banner skeleton */}
      <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton width="40px" height="40px" borderRadius="10px" />
          <div>
            <Skeleton width="180px" height="18px" style={{ marginBottom: '0.3rem' }} />
            <Skeleton width="300px" height="12px" />
          </div>
        </div>
        <Skeleton width="140px" height="34px" borderRadius="6px" />
      </div>

      {/* 2x2 Info Grid */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <SkeletonCard lines={6} />
        <SkeletonCard lines={8} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </div>

      {/* Salary History Table Skeleton */}
      <div className="glass-card-static" style={{ padding: '1.25rem' }}>
        <Skeleton width="160px" height="20px" style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-primary)' }}>
              <Skeleton width="15%" height="14px" />
              <Skeleton width="10%" height="14px" />
              <Skeleton width="10%" height="14px" />
              <Skeleton width="15%" height="14px" />
              <Skeleton width="15%" height="14px" />
              <Skeleton width="12%" height="22px" borderRadius="999px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
