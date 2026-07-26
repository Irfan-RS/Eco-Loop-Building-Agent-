import React from 'react';
import HoneywellLogo from './HoneywellLogo';

export default function Footer({ onNavigate }) {
  return (
    <footer style={{ marginTop: '48px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '28px', paddingBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Left: Honeywell Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HoneywellLogo height={30} showText={true} />
          <span style={{ height: '20px', width: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
          <span style={{ fontSize: '0.84rem', color: '#94A3B8' }}>
            Honeywell Forge EcoLoop AI · Enterprise Building Management
          </span>
        </div>

        {/* Right: Copyright & Legal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '0.82rem', color: '#64748B' }}>
          <span>© 2026 Honeywell International Inc.</span>
          <span style={{ cursor: 'pointer', color: '#94A3B8', textDecoration: 'none' }}>Privacy Statement</span>
          <span style={{ cursor: 'pointer', color: '#94A3B8', textDecoration: 'none' }}>Terms of Use</span>
        </div>

      </div>
    </footer>
  );
}
