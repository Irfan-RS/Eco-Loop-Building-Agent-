import React from 'react';

/**
 * Honeywell Technologies Official Logo SVG Component
 * Renders the iconic Honeywell red 'H' symbol and brand logotype.
 */
export default function HoneywellLogo({ height = 36, showText = true, textColor = '#EE3124' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', userSelect: 'none' }}>
      {/* Honeywell Red 'H' Symbol */}
      <svg
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(238, 49, 36, 0.25))' }}
      >
        <rect width="100" height="100" rx="4" fill="#EE3124" />
        {/* Left vertical cutout gap */}
        <rect x="36" y="16" width="28" height="26" fill="#070B14" />
        {/* Right vertical cutout gap */}
        <rect x="36" y="58" width="28" height="26" fill="#070B14" />
      </svg>

      {/* Honeywell Brand Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 0.95 }}>
          <span
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 900,
              fontSize: `${height * 0.58}px`,
              color: textColor,
              letterSpacing: '-0.5px',
            }}
          >
            Honeywell
          </span>
          <span
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: `${height * 0.32}px`,
              color: textColor,
              letterSpacing: '0.2px',
              marginTop: '2px',
            }}
          >
            Technologies
          </span>
        </div>
      )}
    </div>
  );
}
