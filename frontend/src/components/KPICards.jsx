import React from 'react';
import { Zap, TrendingDown, Leaf, Smile, Activity } from 'lucide-react';

export default function KPICards({ summary }) {
  if (!summary) return null;

  const cards = [
    {
      label: 'Energy Savings',
      value: `${summary.energy_savings_pct || 0}%`,
      sub: `${summary.kwh_saved?.toLocaleString() || 0} kWh saved vs baseline`,
      icon: Zap,
      color: '#10B981',
      ringColor: '#10B981',
      bgCore: 'rgba(16, 185, 129, 0.15)',
      tooltip: 'Energy Savings — total kWh cut by AI vs unoptimized baseline',
    },
    {
      label: 'Peak Power Cut',
      value: `${summary.peak_pct_cut || 0}%`,
      sub: `${summary.peak_kw_reduction || 0} kW peak demand reduction`,
      icon: TrendingDown,
      color: '#06B6D4',
      ringColor: '#06B6D4',
      bgCore: 'rgba(6, 182, 212, 0.15)',
      tooltip: 'Peak Power Cut — max electric demand reduction during peak tariff hours',
    },
    {
      label: 'CO₂ Avoided',
      value: `${summary.co2_saved_kg?.toLocaleString() || 0}`,
      sub: 'kg CO₂e greenhouse emissions prevented',
      icon: Leaf,
      color: '#34D399',
      ringColor: '#34D399',
      bgCore: 'rgba(52, 211, 153, 0.15)',
      tooltip: 'CO₂ Avoided — greenhouse gas emissions prevented from grid electricity saved',
    },
    {
      label: 'Comfort Rate',
      value: `${summary.comfort_compliance_pct || 100}%`,
      sub: 'timesteps within ASHRAE 55 PMV ±0.5',
      icon: Smile,
      color: '#8B5CF6',
      ringColor: '#8B5CF6',
      bgCore: 'rgba(139, 92, 246, 0.15)',
      tooltip: 'Comfort Rate — % of time PMV stayed in -0.5 to +0.5 occupant comfort range',
    },
    {
      label: 'Control Steps',
      value: summary.total_timesteps?.toLocaleString() || 0,
      sub: '15-min closed-loop agent cycles',
      icon: Activity,
      color: '#F59E0B',
      ringColor: '#F59E0B',
      bgCore: 'rgba(245, 158, 11, 0.15)',
      tooltip: 'Control Steps — number of 15-minute physics timesteps the AI agent evaluated',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '28px' }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-card"
            title={card.tooltip}
            style={{
              padding: '22px 20px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'help',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Header row: label + spinning ring icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                {card.label}
              </span>

              {/* Dual counter-rotating rings */}
              <div
                className="kpi-icon-ring"
                style={{ '--ring-color': card.ringColor }}
              >
                <div className="ring-outer" />
                <div className="ring-inner" />
                <div
                  className="ring-core"
                  style={{ background: card.bgCore }}
                >
                  <Icon size={14} color={card.color} />
                </div>
              </div>
            </div>

            {/* Big value */}
            <div style={{ fontSize: '2.15rem', fontWeight: 900, color: card.color, lineHeight: 1, letterSpacing: '-0.5px' }}>
              {card.value}
            </div>

            {/* Sub label */}
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500, lineHeight: 1.4 }}>
              {card.sub}
            </div>

            {/* Subtle corner glow */}
            <div style={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: card.bgCore,
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }} />
          </div>
        );
      })}
    </div>
  );
}
