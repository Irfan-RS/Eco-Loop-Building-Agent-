import React, { useState } from 'react';
import { Search, Activity, CheckCircle2, XCircle, Filter } from 'lucide-react';

export default function TelemetryTable({ telemetryLogs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'good' | 'bad'

  if (!telemetryLogs || telemetryLogs.length === 0) return null;

  const filteredLogs = telemetryLogs.filter(log => {
    const isGood = Math.abs(log.avg_pmv || 0) <= 0.5;
    if (statusFilter === 'good' && !isGood) return false;
    if (statusFilter === 'bad' && isGood) return false;
    
    const timeMatch = (log.time_str || `Day ${log.day} ${log.hour}:00`).toLowerCase().includes(searchTerm.toLowerCase());
    return timeMatch;
  });

  const goodCount = telemetryLogs.filter(log => Math.abs(log.avg_pmv || 0) <= 0.5).length;
  const badCount = telemetryLogs.length - goodCount;

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
      
      {/* Table Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="#10B981" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
            Live Telemetry Logs
          </h3>
          <span className="badge badge-info">{telemetryLogs.length} Timesteps</span>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Good / Bad Selection Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color="#94A3B8" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 30px 8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: `#1E293B url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23CBD5E1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 10px center`,
                backgroundSize: '14px',
                WebkitAppearance: 'none',
                appearance: 'none',
                color: '#F8FAFC',
                fontSize: '0.86rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#0F172A', color: '#F8FAFC' }}>📊 All Telemetry ({telemetryLogs.length})</option>
              <option value="good" style={{ background: '#0F172A', color: '#34D399' }}>🟢 Good Compliant Only ({goodCount})</option>
              <option value="bad" style={{ background: '#0F172A', color: '#F43F5E' }}>🔴 Bad Violated Only ({badCount})</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search timestamp..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#F8FAFC',
                fontSize: '0.88rem',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto', maxHeight: '420px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Timestamp</th>
              <th style={{ padding: '12px 16px' }}>Zone Temp (°C)</th>
              <th style={{ padding: '12px 16px' }}>PMV Index</th>
              <th style={{ padding: '12px 16px' }}>Power (kW)</th>
              <th style={{ padding: '12px 16px' }}>Cooling / Heating Setpoints</th>
              <th style={{ padding: '12px 16px' }}>Comfort Performance Rating</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.slice(0, 150).map((log, idx) => {
              const isEven = idx % 2 === 0;
              const isGood = Math.abs(log.avg_pmv || 0) <= 0.5;

              return (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.04)', 
                    background: isEven ? 'transparent' : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: 500 }}>
                    {log.time_str || `Day ${log.day} ${log.hour}:00`}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#F1F5F9' }}>
                    {log.avg_indoor_temp?.toFixed(2)} °C
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={isGood ? 'badge badge-success' : 'badge'} style={!isGood ? { background: 'rgba(244,63,94,0.15)', color: '#F43F5E' } : {}}>
                      {log.avg_pmv?.toFixed(2)} PMV
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#06B6D4', fontWeight: 700 }}>
                    {log.electric_power_kw?.toFixed(1)} kW
                  </td>
                  <td style={{ padding: '12px 16px', color: '#F8FAFC' }}>
                    <span style={{ color: '#06B6D4', fontWeight: 700 }}>{log.cooling_setpoint}°C</span> / <span style={{ color: '#F59E0B', fontWeight: 700 }}>{log.heating_setpoint}°C</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isGood ? (
                      <span 
                        className="badge badge-success" 
                        style={{ 
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#34D399', 
                          border: '1px solid rgba(16, 185, 129, 0.35)', 
                          padding: '6px 14px', 
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} color="#34D399" /> Good (Optimal Comfort)
                      </span>
                    ) : (
                      <span 
                        className="badge" 
                        style={{ 
                          background: 'rgba(244, 63, 94, 0.15)', 
                          color: '#F43F5E', 
                          border: '1px solid rgba(244, 63, 94, 0.35)', 
                          padding: '6px 14px', 
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <XCircle size={14} color="#F43F5E" /> Bad (Bound Exceeded)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
