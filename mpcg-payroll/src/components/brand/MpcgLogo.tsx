'use client';

import React from 'react';

interface MpcgLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  subtext?: string;
  variant?: 'full' | 'mark';
}

/**
 * Official Brand Mark for MPCG (My Pain Clinic Global)
 * Uses the authentic official MPC brand asset (src/app/icon.png)
 * presented in a premium sapphire glassmorphic squircle badge.
 */
export function MpcgBrandMark({ size = 40 }: { size?: number }) {
  const radius = Math.max(8, Math.round(size * 0.24));

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a192f',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.5)',
        flexShrink: 0,
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
    >
      <img
        src="/icon.png"
        alt="My Pain Clinic Global"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}

/**
 * Full Brand Logo Header Component
 */
export default function MpcgLogo({
  size = 40,
  showText = true,
  subtext = 'My Pain Clinic Global',
  variant = 'full',
}: MpcgLogoProps) {
  if (variant === 'mark' || !showText) {
    return <MpcgBrandMark size={size} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <MpcgBrandMark size={size} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
        {/* Main Brand Title + Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            style={{
              fontSize: '0.975rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#ffffff',
              lineHeight: 1.2,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            MPCG
          </span>
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '4px',
              padding: '1.5px 5.5px',
              lineHeight: 1.15,
            }}
          >
            PAYROLL
          </span>
        </div>

        {/* Brand Subtitle */}
        <div
          style={{
            fontSize: '0.675rem',
            color: '#7e93ab',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {subtext}
        </div>
      </div>
    </div>
  );
}
