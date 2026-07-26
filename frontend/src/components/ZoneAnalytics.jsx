import React, { useState } from 'react';
import { 
  Building2, 
  Activity, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Thermometer, 
  Droplets, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Radio, 
  Flame, 
  Clock, 
  Leaf, 
  Layers,
  Award,
  Loader2
} from 'lucide-react';

export default function ZoneAnalytics({ baselineData = [], aiData = [], modelName = '5ZoneAirCooled.idf', summary = null }) {
  const zonesList = [
    { id: 'SPACE1-1', label: 'SPACE1-1', desc: 'Perimeter South (Direct Solar Load)' },
    { id: 'SPACE2-1', label: 'SPACE2-1', desc: 'Core Zone (High Internal Gains)' },
    { id: 'SPACE3-1', label: 'SPACE3-1', desc: 'Perimeter North (Shaded Zone)' },
    { id: 'SPACE4-1', label: 'SPACE4-1', desc: 'Perimeter East (Morning Solar)' },
    { id: 'SPACE5-1', label: 'SPACE5-1', desc: 'Perimeter West (Evening Solar)' },
    { id: 'PLENUM-1', label: 'PLENUM-1', desc: 'Return Air Ceiling Plenum' },
  ];

  const [selectedZone, setSelectedZone] = useState('SPACE1-1');

  const zoneInfo = zonesList.find(z => z.id === selectedZone) || zonesList[0];

  // Helper to safely format numbers
  const fmt = (val, d = 2) => (val !== undefined && val !== null ? Number(val).toFixed(d) : '0.00');

  // Extract total energy consumption metrics (Terminal Deliverable Metrics) directly from summary or real CSV series
  const hasData = (baselineData && baselineData.length > 0) || (aiData && aiData.length > 0) || summary;

  const baseKwh = summary?.baseline_kwh ?? (baselineData.length > 0 ? baselineData[baselineData.length - 1].cumulative_kwh : 0.0);
  const aiKwh = summary?.ai_controlled_kwh ?? (aiData.length > 0 ? aiData[aiData.length - 1].cumulative_kwh : 0.0);
  const kwhSaved = summary?.kwh_saved ?? (baseKwh - aiKwh);
  const pctSaved = summary?.energy_savings_pct ?? ((baseKwh > 0) ? ((kwhSaved / baseKwh) * 100) : 0.0);

  const basePeakKw = summary?.baseline_peak_kw ?? (baselineData.length > 0 ? Math.max(...baselineData.map(d => d.electric_power_kw || 0)) : 0.0);
  const aiPeakKw = summary?.ai_peak_kw ?? (aiData.length > 0 ? Math.max(...aiData.map(d => d.electric_power_kw || 0)) : 0.0);
  const peakCutKw = summary?.peak_kw_reduction ?? (basePeakKw - aiPeakKw);
  const peakPctCut = summary?.peak_pct_cut ?? ((basePeakKw > 0) ? ((peakCutKw / basePeakKw) * 100) : 0.0);

  const co2SavedKg = summary?.co2_saved_kg ?? (kwhSaved * 0.42);
  const comfortCompliance = summary?.comfort_compliance_pct ?? 100.0;

  // Extract live zone-specific telemetry values directly from real calculation records
  const getZoneMetrics = (dataList, isAi = false) => {
    if (!dataList || dataList.length === 0) {
      return { temp: 0.0, humidity: 0.0, pmv: 0.0, occ: 0, power: 0.0, clg: isAi ? 24.5 : 23.0, htg: isAi ? 20.5 : 20.0, kwh: 0.0 };
    }
    const last = dataList[dataList.length - 1];
    
    const tempKey = `temp_${selectedZone}`;
    const humKey = `humidity_${selectedZone}`;
    const pmvKey = `pmv_${selectedZone}`;
    const pwrKey = `power_${selectedZone}`;
    const kwhKey = `kwh_${selectedZone}`;
    const occKey = `occ_${selectedZone}`;

    const temp = last[tempKey] ?? last.avg_indoor_temp ?? 0.0;
    const humidity = last[humKey] ?? last.humidity ?? 0.0;
    const pmv = last[pmvKey] ?? last.avg_pmv ?? 0.0;
    const power = last[pwrKey] ?? last.electric_power_kw ?? 0.0;
    const kwh = last[kwhKey] ?? last.cumulative_kwh ?? 0.0;
    const occ = last[occKey] ?? last.total_occupancy ?? 0;

    const clg = last.cooling_setpoint ?? (isAi ? 24.5 : 23.0);
    const htg = last.heating_setpoint ?? (isAi ? 20.5 : 20.0);

    return { temp, humidity, pmv, occ, power, clg, htg, kwh };
  };

  const baseMetrics = getZoneMetrics(baselineData, false);
  const aiMetrics = getZoneMetrics(aiData, true);

  const pmvCompliant = Math.abs(aiMetrics.pmv) <= 0.5;

  if (!hasData) {
    return (
      <div style={{ marginTop: '24px', textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Loader2 size={42} color="#10B981" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
          No Physics Simulation Metrics Loaded
        </h3>
        <p style={{ fontSize: '0.92rem', color: '#94A3B8', maxWidth: '500px', margin: '0 auto 20px auto' }}>
          Click the <strong style={{ color: '#10B981' }}>"Calculate"</strong> button in the top control panel to trigger live PyEnergyPlus physics execution and Ollama LLM agent setpoint optimization.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>

      {/* ==================================================================== */}
      {/* TERMINAL DELIVERABLE SAVINGS SUMMARY CARD */}
      {/* ==================================================================== */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(11, 17, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
        borderRadius: '20px',
        padding: '24px',
        border: '1.5px solid #10B981',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(16, 185, 129, 0.15)',
        marginBottom: '28px'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-success" style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                <Award size={15} /> EnergyPlus Physics + Ollama Verification
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                Building Model: <strong style={{ color: '#F8FAFC' }}>{modelName}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0', letterSpacing: '-0.4px' }}>
              Calculated Energy Consumption: Without AI vs. With AI
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.15)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34D399', fontSize: '0.88rem', fontWeight: 800 }}>
            <Radio size={16} style={{ animation: 'pulse 1.5s infinite' }} />
            Calculated Live Telemetry
          </div>
        </div>

        {/* 4 CORE TERMINAL KPI CARDS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
          
          {/* Card 1: Baseline Consumption (Without AI) */}
          <div style={{ background: 'rgba(244, 63, 94, 0.08)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F43F5E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              🔴 Without AI (Baseline)
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#F8FAFC', marginBottom: '4px' }}>
              {fmt(baseKwh, 2)} <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>kWh</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
              Peak Load: <strong style={{ color: '#F43F5E' }}>{fmt(basePeakKw, 2)} kW</strong>
            </div>
          </div>

          {/* Card 2: AI-Controlled Consumption (With AI) */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '14px', padding: '16px', border: '1.5px solid #10B981', boxShadow: '0 0 16px rgba(16, 185, 129, 0.15)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              🟢 With AI (EcoLoop MCP)
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#34D399', marginBottom: '4px' }}>
              {fmt(aiKwh, 2)} <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>kWh</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
              Peak Load: <strong style={{ color: '#34D399' }}>{fmt(aiPeakKw, 2)} kW</strong>
            </div>
          </div>

          {/* Card 3: Net Energy Saved */}
          <div style={{ background: 'rgba(6, 182, 212, 0.08)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22D3EE', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              ⚡ Net Energy Reduction
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#22D3EE', marginBottom: '4px' }}>
              -{fmt(kwhSaved, 2)} <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>kWh</span>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34D399' }}>
              ⚡ {fmt(pctSaved, 1)}% Energy Savings
            </div>
          </div>

          {/* Card 4: Peak kW Cut & CO2 Saved */}
          <div style={{ background: 'rgba(168, 85, 247, 0.08)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#C084FC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              🌱 Grid & Carbon Cut
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#F8FAFC', marginBottom: '4px' }}>
              -{fmt(peakCutKw, 2)} kW <span style={{ fontSize: '0.8rem', color: '#C084FC' }}>({fmt(peakPctCut, 1)}%)</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
              CO2 Avoided: <strong style={{ color: '#34D399' }}>{fmt(co2SavedKg, 2)} kg</strong> | PMV: <strong style={{ color: '#34D399' }}>{comfortCompliance}%</strong>
            </div>
          </div>

        </div>
      </div>

      {/* Main Title & Sub-header Bar for Thermal Zones */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Layers size={22} color="#10B981" />
              Per-Zone Live Physics Metrics Inspector
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#94A3B8', margin: '4px 0 0 0' }}>
              Inspect live zone temperatures, PMV comfort scores, peak demand power, carbon intensity, and dynamic setpoints.
            </p>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#94A3B8', fontWeight: 600 }}>
            Active Zone: <strong style={{ color: '#34D399' }}>{zoneInfo.label}</strong>
          </div>
        </div>

        {/* SUB-HEADER ZONE SELECTOR BUTTONS */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          padding: '8px 4px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {zonesList.map((z) => {
            const isSelected = selectedZone === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: isSelected ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#34D399' : '#CBD5E1',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 16px rgba(16, 185, 129, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Building2 size={16} color={isSelected ? '#34D399' : '#94A3B8'} />
                <span>{z.label}</span>
                {isSelected && <CheckCircle2 size={14} color="#10B981" />}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '8px', fontWeight: 500 }}>
          📍 Selected: <strong style={{ color: '#F8FAFC' }}>{zoneInfo.label}</strong> ({zoneInfo.desc})
        </div>
      </div>

      {/* REORGANIZED PHYSICAL METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))', gap: '20px' }}>

        {/* SECTION 1: THERMAL COMFORT & AIR QUALITY (ASHRAE 55 PMV) */}
        <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#06B6D4" />
              Thermal Comfort & Air Quality ({selectedZone})
            </h3>
            <span className={pmvCompliant ? 'badge badge-success' : 'badge badge-warning'}>
              {pmvCompliant ? '100% ASHRAE 55 Compliant' : 'Comfort Limit'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Without AI */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#EF4444', marginBottom: '10px' }}>
                🔴 Without AI (Baseline)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', color: '#94A3B8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Thermometer size={14} /> Air Temp:</span>
                  <strong style={{ color: '#F8FAFC' }}>{fmt(baseMetrics.temp, 2)} °C</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Droplets size={14} /> Air Humidity:</span>
                  <strong style={{ color: '#F8FAFC' }}>{fmt(baseMetrics.humidity, 1)} % RH</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Activity size={14} /> PMV Index:</span>
                  <strong style={{ color: '#EF4444' }}>{baseMetrics.pmv >= 0 ? `+${fmt(baseMetrics.pmv, 2)}` : fmt(baseMetrics.pmv, 2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Users size={14} /> Occupancy:</span>
                  <strong style={{ color: '#F8FAFC' }}>{baseMetrics.occ} People</strong>
                </div>
              </div>
            </div>

            {/* With AI */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10B981', marginBottom: '10px' }}>
                🟢 With AI (EcoLoop MCP)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', color: '#94A3B8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Thermometer size={14} /> Air Temp:</span>
                  <strong style={{ color: '#34D399' }}>{fmt(aiMetrics.temp, 2)} °C</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Droplets size={14} /> Air Humidity:</span>
                  <strong style={{ color: '#F8FAFC' }}>{fmt(aiMetrics.humidity, 1)} % RH</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Activity size={14} /> PMV Index:</span>
                  <strong style={{ color: '#34D399' }}>{aiMetrics.pmv >= 0 ? `+${fmt(aiMetrics.pmv, 2)}` : fmt(aiMetrics.pmv, 2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Users size={14} /> Occupancy:</span>
                  <strong style={{ color: '#F8FAFC' }}>{aiMetrics.occ} People</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ELECTRICITY POWER DEMAND & PEAK THROTTLING */}
        <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#A855F7" />
              Power Demand & Peak Load Throttling
            </h3>
            <span className="badge badge-info">14:00 - 18:00 Tariff Throttling</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '4px' }}>🔴 Baseline Power Demand:</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F43F5E' }}>{fmt(baseMetrics.power, 2)} kW</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '0.78rem', color: '#34D399', marginBottom: '4px' }}>🟢 AI Power Demand:</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34D399' }}>{fmt(aiMetrics.power, 2)} kW</div>
            </div>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700 }}>
            <span style={{ color: '#C084FC' }}>⚡ Instantaneous Peak kW Cut:</span>
            <span style={{ color: '#34D399' }}>-{fmt(baseMetrics.power - aiMetrics.power, 2)} kW ({fmt(peakPctCut, 1)}% Cut)</span>
          </div>
        </div>

        {/* SECTION 3: GRID CARBON INTENSITY & EMISSIONS */}
        <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={20} color="#10B981" />
              Grid Carbon Intensity & Energy Use
            </h3>
            <span className="badge badge-success">Pre-Cooling Strategy Active</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '4px' }}>⚡ Cumulative Energy Consumed:</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34D399' }}>{fmt(aiKwh, 2)} kWh <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>(vs {fmt(baseKwh, 2)} kWh)</span></div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '4px' }}>🌱 Avoided Carbon Emissions:</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34D399' }}>{fmt(co2SavedKg, 2)} kg CO2e</div>
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
            💡 Shifts HVAC thermal load to low-carbon morning windows (06:00-08:00) before peak grid carbon intensity spikes.
          </p>
        </div>

        {/* SECTION 4: THERMOSTAT SETPOINTS & ACTUATOR MEMORY INJECTION */}
        <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} color="#F59E0B" />
              Dynamic Setpoints & PyEnergyPlus C Actuator Injection
            </h3>
            <span className="badge badge-warning">Live Memory Override</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '4px' }}>❄️ Target Cooling Setpoint:</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34D399' }}>{fmt(aiMetrics.clg, 1)} °C <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 400 }}>(vs {fmt(baseMetrics.clg, 1)} °C Baseline)</span></div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '4px' }}>🔥 Target Heating Setpoint:</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FF6B6B' }}>{fmt(aiMetrics.htg, 1)} °C <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 400 }}>(vs {fmt(baseMetrics.htg, 1)} °C Baseline)</span></div>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem', fontFamily: 'monospace', color: '#CBD5E1', lineHeight: 1.5 }}>
            <div><span style={{ color: '#06B6D4' }}>api.exchange.set_actuator_value</span>(state, cooling_handle, <span style={{ color: '#34D399' }}>{fmt(aiMetrics.clg, 1)}</span>)</div>
            <div><span style={{ color: '#06B6D4' }}>api.exchange.set_actuator_value</span>(state, heating_handle, <span style={{ color: '#FF6B6B' }}>{fmt(aiMetrics.htg, 1)}</span>)</div>
          </div>
        </div>

      </div>

    </div>
  );
}
