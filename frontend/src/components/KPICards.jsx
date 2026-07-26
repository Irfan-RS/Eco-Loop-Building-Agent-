import React from 'react';
import { Zap, TrendingDown, Leaf, Smile, Activity } from 'lucide-react';

export default function KPICards({ summary }) {
  if (!summary) return null;

  const cards = [
    {
      label: 'Energy Savings',
      value: `${summary.energy_savings_pct || 0}%`,
      sub: `⚡ ${summary.kwh_saved?.toLocaleString() || 0} kWh Saved`,
      icon: Zap,
      color: '#10B981',
      bgGlow: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Peak Power Cut',
      value: `${summary.peak_pct_cut || 0}%`,
      sub: `📉 ${summary.peak_kw_reduction || 0} kW Peak Cut`,
      icon: TrendingDown,
      color: '#06B6D4',
      bgGlow: 'rgba(6, 182, 212, 0.12)',
    },
    {
      label: 'CO2 Carbon Avoided',
      value: `${summary.co2_saved_kg?.toLocaleString() || 0}`,
      sub: '🌱 kg CO2e Avoided',
      icon: Leaf,
      color: '#34D399',
      bgGlow: 'rgba(52, 211, 153, 0.12)',
    },
    {
      label: 'Thermal Comfort Rate',
      value: `${summary.comfort_compliance_pct || 100}%`,
      sub: '🛋️ ASHRAE 55 Compliant',
      icon: Smile,
      color: '#8B5CF6',
      bgGlow: 'rgba(139, 92, 246, 0.12)',
    },
    {
      label: 'Control Iterations',
      value: summary.total_timesteps?.toLocaleString() || 0,
      sub: '🔄 15-Min Control Timesteps',
      icon: Activity,
      color: '#F59E0B',
      bgGlow: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', marginBottom: '28px' }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div 
            key={idx} 
            className="glass-card" 
            style={{ 
              padding: '20px 22px', 
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {card.label}
              </span>
              <div style={{
                padding: '8px',
                borderRadius: '10px',
                background: card.bgGlow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={18} color={card.color} />
              </div>
            </div>

            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: card.color, lineHeight: 1, letterSpacing: '-0.5px' }}>
              {card.value}
            </div>

            <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '10px', fontWeight: 500 }}>
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
