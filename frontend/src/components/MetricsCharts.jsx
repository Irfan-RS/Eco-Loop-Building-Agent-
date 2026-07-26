import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Zap, Thermometer, Eye, Sparkles, CheckCircle2, Sliders, Calendar } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function MetricsCharts({ baselineData, aiData }) {
  const [showAI, setShowAI] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState('all'); // 'all' or day number

  if (!baselineData || !aiData || baselineData.length === 0) return null;

  // Match timeline length exactly
  const minLength = Math.min(baselineData.length, aiData.length);
  const rawBaseline = baselineData.slice(0, minLength);
  const rawAI = aiData.slice(0, minLength);

  // Extract unique days dynamically
  const uniqueDays = useMemo(() => {
    const set = new Set();
    rawAI.forEach(d => {
      if (d.day !== undefined && d.day !== null) set.add(d.day);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rawAI]);

  // Filter datasets based on selectedDayFilter
  const matchedBaseline = useMemo(() => {
    if (selectedDayFilter === 'all') return rawBaseline;
    return rawBaseline.filter(d => d.day === selectedDayFilter);
  }, [rawBaseline, selectedDayFilter]);

  const matchedAI = useMemo(() => {
    if (selectedDayFilter === 'all') return rawAI;
    return rawAI.filter(d => d.day === selectedDayFilter);
  }, [rawAI, selectedDayFilter]);

  // Generate neat, uncluttered X-axis labels
  const labels = useMemo(() => {
    return matchedAI.map((d, i) => {
      if (selectedDayFilter !== 'all') {
        // Hourly / 15-min label for single day view
        const h = d.hour !== undefined ? String(d.hour).padStart(2, '0') : '00';
        const m = d.minute !== undefined ? String(d.minute).padStart(2, '0') : '00';
        return `${h}:${m}`;
      }
      // Neat Day label for multi-day view
      if (d.time_str && !d.time_str.includes('Day')) return d.time_str;
      return d.day ? `Day ${d.day}` : `Step ${i + 1}`;
    });
  }, [matchedAI, selectedDayFilter]);

  // Calculate comparative impact numbers
  const baseKwh = matchedBaseline[matchedBaseline.length - 1]?.cumulative_kwh || 0;
  const aiKwh = matchedAI[matchedAI.length - 1]?.cumulative_kwh || 0;
  const kwhSaved = Math.max(0, baseKwh - aiKwh);
  const pctSaved = baseKwh > 0 ? ((kwhSaved / baseKwh) * 100).toFixed(1) : '0';

  const violatedCount = matchedAI.filter(d => d.comfort_violated || Math.abs(d.avg_pmv || 0) > 0.5).length;
  const comfortCompliancePct = matchedAI.length > 0 ? (((matchedAI.length - violatedCount) / matchedAI.length) * 100).toFixed(1) : '100.0';

  // Chart 1: Electric Power Demand (kW)
  const powerDatasets = [
    {
      label: 'Baseline Electric Power (Without AI)',
      data: matchedBaseline.map(d => d.electric_power_kw),
      borderColor: '#FF5252',
      borderDash: [4, 4],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.35,
    },
  ];

  if (showAI) {
    powerDatasets.push({
      label: 'AI Closed-Loop Electric Power (With AI Agent)',
      data: matchedAI.map(d => d.electric_power_kw),
      borderColor: '#00E676',
      backgroundColor: 'rgba(0, 230, 118, 0.14)',
      fill: true,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.35,
    });
  }

  const powerChartData = { labels, datasets: powerDatasets };

  // Chart 2: Cumulative Energy (kWh)
  const energyDatasets = [
    {
      label: 'Baseline Total Energy (Without AI)',
      data: matchedBaseline.map(d => d.cumulative_kwh),
      borderColor: '#FF7043',
      borderDash: [4, 4],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2,
    },
  ];

  if (showAI) {
    energyDatasets.push({
      label: 'AI Total Energy (With AI Agent)',
      data: matchedAI.map(d => d.cumulative_kwh),
      borderColor: '#00E5FF',
      backgroundColor: 'rgba(0, 229, 255, 0.14)',
      fill: true,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.2,
    });
  }

  const energyChartData = { labels, datasets: energyDatasets };

  // Chart 3: Temperature vs Setpoints
  const tempDatasets = [
    {
      label: 'Indoor Zone Temp (°C)',
      data: (showAI ? matchedAI : matchedBaseline).map(d => d.avg_indoor_temp),
      borderColor: '#FFEB3B',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.35,
    },
    {
      label: 'Outdoor Weather Temp (°C)',
      data: (showAI ? matchedAI : matchedBaseline).map(d => d.outdoor_temp),
      borderColor: 'rgba(255, 255, 255, 0.35)',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.35,
    },
  ];

  if (showAI) {
    tempDatasets.push(
      {
        label: 'AI Cooling Setpoint (°C)',
        data: matchedAI.map(d => d.cooling_setpoint),
        borderColor: '#00E5FF',
        borderDash: [3, 3],
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        label: 'AI Heating Setpoint (°C)',
        data: matchedAI.map(d => d.heating_setpoint),
        borderColor: '#FF9100',
        borderDash: [3, 3],
        borderWidth: 2,
        pointRadius: 0,
      }
    );
  }

  const tempChartData = { labels, datasets: tempDatasets };

  // Chart 4: PMV Comfort Index
  const pmvChartData = {
    labels,
    datasets: [
      {
        label: showAI ? 'AI PMV Comfort Index (With AI)' : 'Baseline PMV Index (Without AI)',
        data: (showAI ? matchedAI : matchedBaseline).map(d => d.avg_pmv),
        borderColor: showAI ? '#E040FB' : '#FF5252',
        backgroundColor: showAI ? 'rgba(224, 64, 251, 0.12)' : 'rgba(255, 82, 82, 0.08)',
        fill: true,
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.35,
      },
      {
        label: 'PMV Upper Limit (+0.5)',
        data: matchedAI.map(() => 0.5),
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: 'PMV Lower Limit (-0.5)',
        data: matchedAI.map(() => -0.5),
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#F1F5F9',
          font: { family: 'Outfit', size: 12, weight: '600' },
          usePointStyle: true,
          padding: 14,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#0F172A',
        titleColor: '#00E676',
        bodyColor: '#F8FAFC',
        borderColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#94A3B8',
          font: { family: 'Outfit', size: 11, weight: '600' },
          maxTicksLimit: selectedDayFilter === 'all' ? (uniqueDays.length || 7) * 2 : 12,
          maxRotation: 0,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#CBD5E1', font: { family: 'Outfit', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      
      {/* Top Interactive Toggle Banner */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '20px', border: showAI ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid rgba(255, 82, 82, 0.3)', background: showAI ? 'rgba(0, 230, 118, 0.04)' : 'rgba(255, 82, 82, 0.04)', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: showAI ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)' }}>
              <Sliders size={24} color={showAI ? '#00E676' : '#FF5252'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F1F5F9' }}>
                  Interactive AI Layer Overlay Toggle
                </h3>
                <span className={showAI ? 'badge badge-success' : 'badge'} style={!showAI ? { background: 'rgba(255,82,82,0.15)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.3)' } : {}}>
                  {showAI ? 'AI Layer ON' : 'Default View (Without AI)'}
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#94A3B8', marginTop: '2px' }}>
                {showAI 
                  ? `Showing comparison overlay across ${uniqueDays.length || 5} simulation days.`
                  : 'Currently showing Standard Unoptimized Baseline schedule (Without AI).'}
              </p>
            </div>
          </div>

          {/* Big Toggle Switch Button */}
          <button
            onClick={() => setShowAI(!showAI)}
            style={{
              background: showAI ? 'linear-gradient(135deg, #00C853 0%, #00E676 100%)' : 'linear-gradient(135deg, #FF5252 0%, #FF7043 100%)',
              color: showAI ? '#050B14' : '#FFFFFF',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: showAI ? '0 4px 20px rgba(0, 230, 118, 0.4)' : '0 4px 20px rgba(255, 82, 82, 0.3)',
              transition: 'all 0.3s ease',
            }}
          >
            <Sparkles size={20} />
            <span>{showAI ? 'Disable AI Overlay' : '✨ Enable AI Comparison Overlay'}</span>
          </button>

        </div>

        {/* Dynamic Interactive Callout Box when user clicks Enable AI */}
        {showAI && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            animation: 'fadeIn 0.4s ease-in-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} color="#00E676" />
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#F1F5F9' }}>
                🎉 AI Optimization Savings Impact Breakdown:
              </span>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.9rem', fontWeight: 600 }}>
              <span style={{ color: '#00E676' }}>⚡ Energy Saved: <strong>{kwhSaved.toLocaleString()} kWh ({pctSaved}% Savings)</strong></span>
              <span style={{ color: '#00E5FF' }}>🌱 CO2 Avoided: <strong>{(kwhSaved * 0.42).toFixed(1)} kg CO2e</strong></span>
              <span style={{ color: '#E040FB' }}>🛋️ Comfort Compliance: <strong>{comfortCompliancePct}% ASHRAE 55</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* NEAT DAY SELECTOR TABS BAR (All Days / Day 1 / Day 2 / Day 3 / Day 4 / Day 5 / Day 6 / Day 7) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: '14px',
        padding: '12px 18px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, color: '#F8FAFC' }}>
          <Calendar size={18} color="#10B981" />
          <span>Timeline Day Filter:</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedDayFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: selectedDayFilter === 'all' ? '#10B981' : 'rgba(255, 255, 255, 0.06)',
              color: selectedDayFilter === 'all' ? '#0F172A' : '#CBD5E1',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📅 All {uniqueDays.length || 5} Days ({matchedAI.length} Steps)
          </button>

          {uniqueDays.map(dNum => (
            <button
              key={dNum}
              onClick={() => setSelectedDayFilter(dNum)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: selectedDayFilter === dNum ? '#06B6D4' : 'rgba(255, 255, 255, 0.06)',
                color: selectedDayFilter === dNum ? '#0F172A' : '#CBD5E1',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Day {dNum}
            </button>
          ))}
        </div>
      </div>

      {/* View Switcher Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={20} color="#00E676" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F1F5F9' }}>
            Chart Analytics ({selectedDayFilter === 'all' ? `All ${uniqueDays.length || 5} Days` : `Day ${selectedDayFilter} View`} — {matchedBaseline.length} Control Timesteps)
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button 
            className={activeTab === 'all' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setActiveTab('all')}
            style={{ padding: '6px 14px', fontSize: '0.84rem' }}
          >
            All 4 Charts
          </button>
          <button 
            className={activeTab === 'energy' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setActiveTab('energy')}
            style={{ padding: '6px 14px', fontSize: '0.84rem' }}
          >
            <Zap size={14} /> Energy & Power
          </button>
          <button 
            className={activeTab === 'comfort' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setActiveTab('comfort')}
            style={{ padding: '6px 14px', fontSize: '0.84rem' }}
          >
            <Thermometer size={14} /> Comfort & Setpoints
          </button>
        </div>
      </div>

      {/* Grid or Tab View */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: (activeTab === 'all') ? 'repeat(auto-fit, minmax(540px, 1fr))' : '1fr',
        gap: '22px'
      }}>
        
        {/* Chart 1: Power Demand (kW) */}
        {(activeTab === 'all' || activeTab === 'energy') && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: showAI ? '#00E676' : '#FF5252' }}>
                  ⚡ Building Electric Demand Power (kW)
                </h4>
                <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '2px' }}>
                  {showAI ? 'Red dashed = Without AI Baseline | Green area = With AI Agent' : 'Showing Standard Baseline Electric Demand Power (Without AI)'}
                </p>
              </div>
              {showAI && <span className="badge badge-success">{pctSaved}% Energy Cut</span>}
            </div>
            <div style={{ height: activeTab === 'energy' ? '380px' : '280px' }}>
              <Line data={powerChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Chart 2: Cumulative Energy (kWh) */}
        {(activeTab === 'all' || activeTab === 'energy') && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: showAI ? '#00E5FF' : '#FF7043' }}>
                  📈 Cumulative Energy Consumption (kWh)
                </h4>
                <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '2px' }}>
                  {showAI ? `Compares Baseline (${baseKwh.toLocaleString()} kWh) vs AI Agent (${aiKwh.toLocaleString()} kWh)` : `Showing Baseline Total Energy Accumulation (${baseKwh.toLocaleString()} kWh)`}
                </p>
              </div>
              {showAI && <span className="badge badge-info">{kwhSaved.toLocaleString()} kWh Saved</span>}
            </div>
            <div style={{ height: activeTab === 'energy' ? '380px' : '280px' }}>
              <Line data={energyChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Chart 3: Temperature vs Setpoints */}
        {(activeTab === 'all' || activeTab === 'comfort') && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFEB3B' }}>
                  🌡️ Indoor Zone Temperature vs {showAI ? 'AI Dynamic Setpoint Corridor' : 'Baseline Schedule'}
                </h4>
                <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '2px' }}>
                  {showAI ? 'Yellow = Zone temp | Cyan/Orange dotted = AI dynamic setpoint corridor' : 'Yellow = Indoor zone temp | White = Outdoor weather temp'}
                </p>
              </div>
              {showAI && <span className="badge badge-info">Dynamic Corridor</span>}
            </div>
            <div style={{ height: activeTab === 'comfort' ? '380px' : '280px' }}>
              <Line data={tempChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Chart 4: PMV Comfort Score */}
        {(activeTab === 'all' || activeTab === 'comfort') && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: showAI ? '#E040FB' : '#FF5252' }}>
                  🛋️ ASHRAE 55 PMV Thermal Comfort Compliance ({showAI ? 'With AI' : 'Without AI'})
                </h4>
                <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '2px' }}>
                  {showAI ? 'Magenta curve = AI PMV comfort index | Dotted lines = ASHRAE 55 ±0.5 boundary' : 'Red curve = Baseline PMV index | Dotted lines = ASHRAE 55 ±0.5 boundary'}
                </p>
              </div>
              <span className={Number(comfortCompliancePct) >= 95 ? 'badge badge-success' : 'badge'}>{comfortCompliancePct}% Compliant</span>
            </div>
            <div style={{ height: activeTab === 'comfort' ? '380px' : '280px' }}>
              <Line data={pmvChartData} options={chartOptions} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
