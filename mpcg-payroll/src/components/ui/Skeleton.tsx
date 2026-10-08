import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width !== undefined ? width : '100%',
        height: height !== undefined ? height : '1rem',
        borderRadius: borderRadius !== undefined ? borderRadius : undefined,
        ...style,
      }}
    />
  );
}

export function SkeletonHeader({ actionCount = 1 }: { actionCount?: number }) {
  return (
    <div
      className="page-header animate-fade-in"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
    >
      <div>
        <Skeleton width="180px" height="28px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="280px" height="14px" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {Array.from({ length: actionCount }).map((_, i) => (
          <Skeleton key={i} width="110px" height="38px" borderRadius="8px" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div
      className={`grid-${count}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Skeleton width="60%" height="14px" />
            <Skeleton width="32px" height="32px" borderRadius="8px" />
          </div>
          <Skeleton width="75%" height="28px" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width="40%" height="12px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  columns = 6,
  rows = 7,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="glass-card-static" style={{ overflow: 'hidden' }}>
      {/* Table search / filter bar skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', padding: '0.5rem' }}>
        <Skeleton width="260px" height="38px" borderRadius="8px" />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width="120px" height="38px" borderRadius="8px" />
          <Skeleton width="100px" height="38px" borderRadius="8px" />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i}>
                  <Skeleton width={`${50 + (i % 3) * 20}%`} height="14px" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx}>
                {Array.from({ length: columns }).map((_, cIdx) => (
                  <td key={cIdx}>
                    {cIdx === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Skeleton width="32px" height="32px" borderRadius="50%" />
                        <div style={{ flex: 1 }}>
                          <Skeleton width="130px" height="14px" style={{ marginBottom: '0.25rem' }} />
                          <Skeleton width="80px" height="11px" />
                        </div>
                      </div>
                    ) : cIdx === columns - 1 ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Skeleton width="60px" height="28px" borderRadius="6px" />
                      </div>
                    ) : (
                      <Skeleton width={`${45 + ((rIdx + cIdx) % 4) * 15}%`} height="14px" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonCard({
  lines = 4,
  height,
}: {
  lines?: number;
  height?: string | number;
}) {
  return (
    <div className="glass-card-static" style={{ height: height || 'auto', padding: '1.25rem' }}>
      <Skeleton width="45%" height="20px" style={{ marginBottom: '1.25rem' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <Skeleton width="35%" height="14px" />
          <Skeleton width="45%" height="14px" />
        </div>
      ))}
    </div>
  );
}
