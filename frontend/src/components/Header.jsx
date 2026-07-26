import React from 'react';
import HoneywellLogo from './HoneywellLogo';

export default function Header({ setCurrentPage }) {
  return (
    <header style={{ 
      position: 'sticky', 
      top: '12px', 
      zIndex: 1000, 
      marginBottom: '20px', 
      width: '100%',
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '10px 24px',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 24px rgba(16, 185, 129, 0.12)'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr auto 1fr', 
        alignItems: 'center', 
        width: '100%'
      }}>
        
        {/* Box 1 (Far Left): Honeywell Logo Badge with Neat Rounded Corners */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div 
            onClick={() => setCurrentPage && setCurrentPage('home')}
            style={{ 
              height: '46px',
              padding: '0 16px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #EE3124',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <HoneywellLogo height={22} showText={true} />
          </div>
        </div>

        {/* Box 2 (Center): Prominent EcoLoop Title Pill */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div 
            style={{ 
              height: '52px',
              padding: '0 32px', 
              borderRadius: '14px', 
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)'
            }}
          >
            <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.6px', margin: 0, lineHeight: 1 }}>
              Eco<span style={{ color: '#10B981', fontWeight: 900 }}>Loop</span>
            </h1>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              letterSpacing: '0.3px'
            }}>
              Building Agent
            </span>
          </div>
        </div>

        {/* Box 3 (Far Right): Active Physical AI Badge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            height: '46px',
            padding: '0 16px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#CBD5E1'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            Physical AI Active
          </div>
        </div>

      </div>
    </header>
  );
}
