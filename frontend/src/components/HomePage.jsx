import React, { useState, useEffect } from 'react';
import { Cpu, Play, ShieldCheck, Zap, Thermometer, Layers, Building2, CloudSun, Timer, ArrowRight, Sparkles, SlidersHorizontal, BrainCircuit, Activity } from 'lucide-react';

export default function HomePage({ onCalculate, isSimulating, availableModels = [], availableWeather = [] }) {
  const modelsList = availableModels.length > 0 ? availableModels : ['5ZoneAirCooled.idf', 'ASHRAE901_OfficeMedium_STD2019_Denver.idf', 'Supermarket_Detailed.idf'];
  const weatherList = availableWeather.length > 0 ? availableWeather : ['USA_IL_Chicago-OHare.Intl.AP.725300_TMY3.epw', 'USA_CA_San.Francisco.Intl.AP.724940_TMY3.epw', 'USA_VA_Sterling-Washington.Dulles.Intl.AP.724030_TMY3.epw'];

  const [selectedModel, setSelectedModel] = useState(modelsList[0]);
  const [selectedWeather, setSelectedWeather] = useState(weatherList[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('5days');

  useEffect(() => {
    if (modelsList.length > 0 && !modelsList.includes(selectedModel)) {
      setSelectedModel(modelsList[0]);
    }
    if (weatherList.length > 0 && !weatherList.includes(selectedWeather)) {
      setSelectedWeather(weatherList[0]);
    }
  }, [availableModels, availableWeather]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 0 60px 0' }}>
      
      {/* Hero Banner */}
      <div className="glass-card" style={{ padding: '40px 36px', marginBottom: '32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px' }}>
          <Building2 size={16} color="#10B981" /> Honeywell Technologies Enterprise Building Control
        </div>

        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: '14px' }}>
          Honeywell Forge <span style={{ color: '#10B981' }}>EcoLoop AI</span>
        </h1>

        <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '740px', margin: '0 auto 28px auto', lineHeight: 1.55 }}>
          Integrates <strong>EnergyPlus</strong> building physics simulation with an autonomous control agent to optimize thermal comfort and lower commercial HVAC energy consumption.
        </p>

        {/* 3-Step "How It Works" Pipeline Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '22px', marginTop: '36px', textAlign: 'left' }}>
          
          {/* Step 1 */}
          <div className="glass-card" style={{ padding: '28px 24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={22} />
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.76rem', fontWeight: 800, padding: '4px 12px', background: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                STEP 01
              </span>
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '10px', letterSpacing: '-0.2px' }}>
              Stream Physics Telemetry
            </h4>

            <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: 1.65 }}>
              EnergyPlus C API streams zone temperatures, PMV comfort scores, occupancy, weather, and electric power demand (kW) every 15 minutes.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-card" style={{ padding: '28px 24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#C4B5FD', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={22} />
              </div>
              <span className="badge" style={{ fontSize: '0.76rem', fontWeight: 800, padding: '4px 12px', background: 'rgba(139, 92, 246, 0.15)', color: '#C4B5FD', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                STEP 02
              </span>
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '10px', letterSpacing: '-0.2px' }}>
              MCP LLM Tool Reasoning
            </h4>

            <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: 1.65 }}>
              The local Open-Source LLM evaluates telemetry against ASHRAE 55 comfort bounds (&plusmn;0.5 PMV) and grid carbon signals to pick optimal ECMs.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-card" style={{ padding: '28px 24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(16, 185, 129, 0.3)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} />
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.76rem', fontWeight: 800, padding: '4px 12px' }}>
                STEP 03
              </span>
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '10px', letterSpacing: '-0.2px' }}>
              Dynamic Forward Injection
            </h4>

            <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: 1.65 }}>
              Setpoints are injected directly into EnergyPlus thermostat actuators with zero human code modification, saving up to 22.7% energy.
            </p>
          </div>

        </div>

      </div>

      {/* Configuration Options Card with Dropdown Down Bar Selections */}
      <div className="glass-card" style={{ padding: '36px', marginBottom: '32px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SlidersHorizontal color="#10B981" size={24} /> Configure Simulation Experiment
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#94A3B8' }}>
            Select building model, weather location, and run period duration from the down bar selection menus to launch the comparison engine.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '36px' }}>
          
          {/* Dropdown 1: Building Model */}
          <div>
            <label style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', display: 'flex', alignItems: 'center' }}>
                <Building2 size={16} />
              </div>
              Building Model (IDF)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 48px 16px 18px',
                borderRadius: '14px',
                background: `#1E293B url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2334D399' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 16px center`,
                backgroundSize: '18px',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                color: '#F8FAFC',
                border: '1.5px solid rgba(16, 185, 129, 0.5)',
                fontSize: '0.98rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {modelsList.map(m => (
                <option key={m} value={m} style={{ background: '#0F172A', color: '#F8FAFC', padding: '12px' }}>
                  🏢 {m}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '10px', lineHeight: 1.4, fontWeight: 500 }}>
              Building Model File: <strong style={{ color: '#34D399' }}>{selectedModel}</strong>
            </p>
          </div>

          {/* Dropdown 2: Weather Location */}
          <div>
            <label style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', display: 'flex', alignItems: 'center' }}>
                <CloudSun size={16} />
              </div>
              Weather & Location (EPW)
            </label>
            <select
              value={selectedWeather}
              onChange={(e) => setSelectedWeather(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 48px 16px 18px',
                borderRadius: '14px',
                background: `#1E293B url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2322D3EE' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 16px center`,
                backgroundSize: '18px',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                color: '#F8FAFC',
                border: '1.5px solid rgba(6, 182, 212, 0.5)',
                fontSize: '0.98rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {weatherList.map(w => (
                <option key={w} value={w} style={{ background: '#0F172A', color: '#F8FAFC', padding: '12px' }}>
                  📍 {w}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '10px', lineHeight: 1.4, fontWeight: 500 }}>
              Weather EPW Profile: <strong style={{ color: '#22D3EE' }}>{selectedWeather}</strong>
            </p>
          </div>


          {/* Dropdown 3: Run Period */}
          <div>
            <label style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#C4B5FD', display: 'flex', alignItems: 'center' }}>
                <Timer size={16} />
              </div>
              Simulation Run Duration
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 48px 16px 18px',
                borderRadius: '14px',
                background: `#1E293B url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23C4B5FD' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 16px center`,
                backgroundSize: '18px',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                color: '#F8FAFC',
                border: '1.5px solid rgba(139, 92, 246, 0.5)',
                fontSize: '0.98rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <option value="5days" style={{ background: '#0F172A', color: '#F8FAFC', padding: '12px' }}>⚡ 5 Simulated Days (480 Steps - Fastest ~10s)</option>
              <option value="7days" style={{ background: '#0F172A', color: '#F8FAFC', padding: '12px' }}>📅 7 Simulated Days (672 Steps - Extended Week)</option>
            </select>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '10px', lineHeight: 1.4, fontWeight: 500 }}>
              {selectedPeriod === '5days'
                ? 'July 7–12 · 15-Minute Control Timesteps · Ideal for 3-Min Live Video Demo'
                : 'July 7–14 · Full Week Cycle Evaluation'}
            </p>
          </div>

        </div>

        {/* Big Calculate & Redirect Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => onCalculate({ model: selectedModel, weather: selectedWeather, period: selectedPeriod })}
            disabled={isSimulating}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.05rem',
              padding: '16px 40px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {isSimulating ? (
              <>
                <div className="kpi-icon-ring" style={{ '--ring-color': '#fff', width: 22, height: 22, flexShrink: 0 }}>
                  <div className="ring-outer" style={{ borderWidth: 2 }} />
                  <div className="ring-inner" style={{ inset: 4, borderWidth: 1.5, opacity: 0.5 }} />
                </div>
                <span>Running EnergyPlus Simulation...</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>Calculate Energy Savings & View Analytics</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
