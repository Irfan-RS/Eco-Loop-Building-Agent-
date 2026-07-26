import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './components/HomePage';
import KPICards from './components/KPICards';
import MetricsCharts from './components/MetricsCharts';
import TelemetryTable from './components/TelemetryTable';
import ModelInspector from './components/ModelInspector';
import ZoneAnalytics from './components/ZoneAnalytics';
import ZoneMap from './components/ZoneMap';
import { ArrowLeft, Cpu, Activity, Zap, Timer, Building2, CloudSun, Layers, Sliders, Play, CheckCircle2 } from 'lucide-react';


export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return sessionStorage.getItem('ecoloop_current_page') || 'home';
  });

  const [analyticsTab, setAnalyticsTab] = useState('zone-analytics');
  const [metrics, setMetrics] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [availableModels, setAvailableModels] = useState(['5ZoneAirCooled.idf', 'ASHRAE901_OfficeMedium.idf']);
  const [availableWeather, setAvailableWeather] = useState(['Chicago_OHare_TMY3.epw', 'San_Francisco_TMY3.epw']);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [liveLogs, setLiveLogs] = useState([]);       // Real EnergyPlus stdout lines
  const [simResults, setSimResults] = useState(null); // Final savings summary from simulation



  const backendSteps = [
    "🚀 Initializing PyEnergyPlus C API & State Manager...",
    "🏢 Parsing Building IDF Model & Registering Thermostat Actuators...",
    "📍 Streaming EPW Weather Profile & Solar Radiation Data...",
    "⚡ Executing 480 Sub-Hourly Physics Timesteps (Baseline vs. AI)...",
    "🧘 Evaluating ASHRAE 55 PMV Thermal Comfort & Peak Tariff ECMs...",
    "💾 Writing Setpoint Audit Logs & Exporting Modified IDF Artifact..."
  ];

  useEffect(() => {
    let stepInterval;
    if (loading) {
      setActiveStepIndex(0);
      stepInterval = setInterval(() => {
        setActiveStepIndex(prev => (prev + 1) % backendSteps.length);
      }, 2200);
    }
    return () => clearInterval(stepInterval);
  }, [loading]);

  const [activeConfig, setActiveConfig] = useState(() => {
    const saved = sessionStorage.getItem('ecoloop_active_config');
    return saved ? JSON.parse(saved) : {
      model: '5ZoneAirCooled.idf',
      weather: 'Chicago_OHare_TMY3.epw',
      period: '5days'
    };
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && (window.location.origin.includes(':5173') || window.location.origin.includes(':4173') || window.location.origin.includes('localhost'))
      ? 'http://localhost:8000'
      : 'https://ecoloop-building-agent.onrender.com');



  useEffect(() => {
    let timer;
    if (loading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [loading]);


  useEffect(() => {
    sessionStorage.setItem('ecoloop_current_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    sessionStorage.setItem('ecoloop_active_config', JSON.stringify(activeConfig));
  }, [activeConfig]);

  const fetchData = async (showSpinner = false, configOverride = null) => {
    try {
      if (showSpinner) setLoading(true);
      const cfg = configOverride || activeConfig;
      const cacheBuster = Date.now();
      const modelParam = encodeURIComponent(cfg.model);
      const weatherParam = encodeURIComponent(cfg.weather);
      const [resMetrics, resModel] = await Promise.all([
        fetch(`${API_BASE}/api/metrics?model=${modelParam}&weather=${weatherParam}&t=${cacheBuster}`).then(r => r.json()),
        fetch(`${API_BASE}/api/building-model?model=${modelParam}&t=${cacheBuster}`).then(r => r.json()),
      ]);

      if (resMetrics.status === 'success') {
        // Guard: only show data that belongs to the currently selected model+weather
        if (resMetrics.data_model === cfg.model && resMetrics.data_weather === cfg.weather) {
          setMetrics(resMetrics);
        } else {
          // Data is for a different config — clear to avoid stale display
          setMetrics(null);
        }
      } else {
        // no_data or running — keep metrics null so "Click Calculate" state shows
        setMetrics(null);
      }
      if (resModel.status === 'success') setModelInfo(resModel);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };


  useEffect(() => {
    // On initial load: fetch silently (no spinner), just populate if data exists
    setLoading(false);
    fetchData(false);

    // Fetch all available IDF building models and EPW weather profiles in energyplus/
    fetch(`${API_BASE}/api/available-files?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          if (data.models && data.models.length > 0) setAvailableModels(data.models);
          if (data.weather_files && data.weather_files.length > 0) setAvailableWeather(data.weather_files);
        }
      })
      .catch(() => {});
  }, []);

  // Re-fetch building model info whenever the selected IDF changes
  // (shows correct zones/people counts without running a full simulation)
  useEffect(() => {
    if (!activeConfig.model) return;
    fetch(`${API_BASE}/api/building-model?model=${encodeURIComponent(activeConfig.model)}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setModelInfo(data); })
      .catch(() => {});
  }, [activeConfig.model]);




  const handleRunSimulation = async (config = {}) => {
    const newConfig = { ...activeConfig, ...config };
    setActiveConfig(newConfig);
    setCurrentPage('analytics');
    setIsSimulating(true);
    setLoading(true);
    setMetrics(null);
    setSimResults(null);
    setLiveLogs([]);

    // Fetch building model info for the new model if not already loaded
    fetch(`${API_BASE}/api/building-model?model=${encodeURIComponent(newConfig.model)}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setModelInfo(data); })
      .catch(() => {});


    // 1. Fire POST to kick off background simulation thread (returns instantly)
    try {
      const res = await fetch(`${API_BASE}/api/run-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.active_config) setActiveConfig(data.active_config);
    } catch (err) {
      console.error('Failed to start simulation:', err);
      setIsSimulating(false);
      setLoading(false);
      return;
    }

    // 2. Open SSE connection to stream real EnergyPlus subprocess output
    const sse = new EventSource(`${API_BASE}/api/simulation-logs`);
    sse.onmessage = (event) => {
      const line = event.data;

      // Parse final results JSON broadcast
      if (line.startsWith('[RESULTS] ')) {
        try {
          const results = JSON.parse(line.replace('[RESULTS] ', ''));
          setSimResults(results);
        } catch (_) {}
        return;
      }

      // Stop when done
      if (line === '[DONE]' || line.startsWith('[ERROR]')) {
        sse.close();
        return;
      }

      // Skip internal phase/cmd markers from display
      if (line.startsWith('[PHASE]') || line.startsWith('[CMD]')) return;

      // Append real log line (keep last 120 lines)
      setLiveLogs(prev => {
        const next = [...prev, line];
        return next.length > 120 ? next.slice(next.length - 120) : next;
      });
    };
    sse.onerror = () => { sse.close(); };

    // 3. Poll /api/simulation-status until simulation finishes
    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await fetch(`${API_BASE}/api/simulation-status`);
        const statusData = await statusRes.json();
        if (!statusData.running && statusData.phase !== 'idle') {
          clearInterval(pollInterval);
          sse.close();
          setIsSimulating(false);
          setLoading(false);
          // 4. Fetch the newly written CSV metrics — pass newConfig so we validate against current selection
          await fetchData(false, newConfig);
        }
      } catch (_) {}
    }, 2000);

  };



  const navigateToHome = () => {
    setIsSimulating(false);
    setCurrentPage('home');
    // Do NOT clear metrics or activeConfig — preserve results for when user returns
    sessionStorage.setItem('ecoloop_current_page', 'home');
  };

  const formatWeatherName = (w) => {
    if (!w) return 'Chicago O\'Hare TMY3';
    if (w.includes('San_Francisco') || w.includes('San.Francisco') || w.includes('San Francisco')) return 'San Francisco Intl AP TMY3';
    if (w.includes('Sterling') || w.includes('Dulles') || w.includes('Washington') || w.includes('VA')) return 'Washington Dulles Intl AP TMY3';
    if (w.includes('Chicago') || w.includes('OHare') || w.includes('IL')) return 'Chicago O\'Hare Intl AP TMY3';
    // Generic: strip path separators and extension
    return w.replace(/^.*[\/\\]/, '').replace('.epw', '');
  };


  // Estimate simulation duration by model complexity (zones × timesteps)
  const targetDuration = (activeConfig?.model?.includes('Supermarket')) ? 25
    : (activeConfig?.model?.includes('OfficeMedium') || activeConfig?.model?.includes('ASHRAE')) ? 18
    : 12;

  const progressPct = Math.min(95, Math.round((elapsedSeconds / targetDuration) * 100));

  const navItems = [
    { id: 'zone-analytics', label: 'Per-Zone Analytics', icon: Sliders, badge: '4-Step Closed Loop', color: '#10B981' },
    { id: 'overview', label: 'Executive KPIs', icon: Zap, badge: 'Savings Summary', color: '#38BDF8' },
    { id: 'charts', label: 'Time-Series Charts', icon: Activity, badge: 'Interactive', color: '#A855F7' },
    { id: 'zones', label: 'Building Zone Map', icon: Layers, badge: '3D Floor Levels', color: '#F59E0B' },
    { id: 'logs', label: 'Live Telemetry Logs', icon: Timer, badge: '15-min Records', color: '#6366F1' },
    { id: 'inspector', label: 'IDF Model Inspector', icon: Building2, badge: 'Building Structure', color: '#EC4899' },
    { id: 'all', label: 'All Dashboard Views', icon: CheckCircle2, badge: 'Full Page', color: '#94A3B8' },
  ];

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '16px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {/* Top Header */}
        <Header currentPage={currentPage} setCurrentPage={navigateToHome} />

        {/* Page Switcher */}
        {currentPage === 'home' ? (
          <HomePage 
            onCalculate={handleRunSimulation} 
            isSimulating={isSimulating} 
            availableModels={availableModels}
            availableWeather={availableWeather}
          />
        ) : (
          <div style={{ display: 'flex', gap: '20px', marginTop: '16px', alignItems: 'flex-start' }}>
            
            {/* LEFT SIDEBAR NAVIGATION BAR */}
            <aside style={{
              width: '300px',
              minWidth: '300px',
              background: '#0B1120',
              borderRadius: '16px',
              padding: '20px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              position: 'sticky',
              top: '95px'

            }}>
              {/* Back to Home Button */}
              <button 
                className="btn-secondary" 
                onClick={navigateToHome}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '9px 12px' }}
              >
                <ArrowLeft size={16} /> ← Setup & Home
              </button>

              {/* Sidebar Header & Agent Status */}
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                    <Sliders size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#F8FAFC' }}>EcoLoop Dashboard</div>
                    <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 600 }}>🟢 PyEnergyPlus API Ready</div>
                  </div>
                </div>
              </div>

              {/* Model & Weather Selectors in Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Simulation Controls
                </div>

                {/* Building IDF Selector */}
                <div>
                  <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} color="#FF6B6B" /> Building Model (.idf)
                  </div>
                  <select
                    value={activeConfig.model}
                    onChange={(e) => {
                      setActiveConfig(prev => ({ ...prev, model: e.target.value }));
                      setMetrics(null);     // Clear old CSV data — zones will update from modelInfo
                      setSimResults(null);  // Clear old results banner
                    }}
                    disabled={loading || isSimulating}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: '#1E293B',
                      color: '#FF6B6B',
                      border: '1px solid rgba(238, 49, 36, 0.4)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {availableModels.map(m => (
                      <option key={m} value={m} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                        🏢 {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weather EPW Selector */}
                <div>
                  <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CloudSun size={13} color="#22D3EE" /> Weather File (.epw)
                  </div>
                  <select
                    value={activeConfig.weather}
                    onChange={(e) => {
                      setActiveConfig(prev => ({ ...prev, weather: e.target.value }));
                      setMetrics(null);     // Clear old CSV data — new weather needs new simulation
                      setSimResults(null);  // Clear old results banner
                    }}
                    disabled={loading || isSimulating}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: '#1E293B',
                      color: '#22D3EE',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {availableWeather.map(w => (
                      <option key={w} value={w} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                        📍 {w}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Config-changed warning: metrics cleared → need re-run */}
                {!metrics && !loading && !isSimulating && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    color: '#FCD34D',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'pulse-ring 2s infinite',
                  }}>
                    ⚠ Config changed — click Re-Run to calculate
                  </div>
                )}

                {/* Trigger Run Button */}
                <button
                  onClick={() => handleRunSimulation(activeConfig)}
                  disabled={loading || isSimulating}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: !metrics && !loading && !isSimulating
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'   // amber when stale
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',  // green when fresh
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: loading || isSimulating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '4px',
                    boxShadow: !metrics && !loading && !isSimulating
                      ? '0 4px 16px rgba(245, 158, 11, 0.5)'
                      : '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Play size={14} fill="#FFF" /> {!metrics && !loading && !isSimulating ? '▶ Run Simulation Now' : 'Re-Run Closed-Loop Agent'}
                </button>
              </div>


              {/* VERTICAL NAVIGATION SIDEBAR BUTTONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Analytics Views
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = analyticsTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAnalyticsTab(item.id)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                        border: isActive ? `1.5px solid ${item.color}` : '1px solid transparent',
                        color: isActive ? '#F8FAFC' : '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={16} color={isActive ? item.color : '#64748B'} />
                        <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer info badge in sidebar */}
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4 }}>
                <div>Physical AI Energy Control</div>
                <div style={{ color: '#10B981', fontWeight: 600 }}>ASHRAE 55 PMV Guard On</div>
              </div>
            </aside>

            {/* MAIN WORKSPACE CONTENT AREA (RIGHT SIDE) */}
            <main style={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <div style={{ margin: '20px auto', maxWidth: '860px' }}>

                  {/* ── HEADER CARD ─────────────────────────────────────── */}
                  <div className="glass-card" style={{ padding: '28px 32px', border: '1.5px solid rgba(16, 185, 129, 0.4)', marginBottom: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '18px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {/* Dual counter-rotating ring spinner */}
                        <div className="kpi-icon-ring" style={{ '--ring-color': '#10B981', width: 68, height: 68 }}>
                          <div className="ring-outer" style={{ borderWidth: 3 }} />
                          <div className="ring-inner" style={{ inset: 8, borderWidth: 2, opacity: 0.55 }} />
                          <div className="ring-core" style={{ width: 42, height: 42, background: 'rgba(16, 185, 129, 0.15)', border: '1.5px solid rgba(16, 185, 129, 0.4)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.3px' }}>
                          EnergyPlus Physics Simulation Running
                        </h3>
                        <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: '4px 0 0 0' }}>
                          Model: <strong style={{ color: '#FF6B6B' }}>{activeConfig.model}</strong> &nbsp;|&nbsp; Weather: <strong style={{ color: '#22D3EE' }}>{formatWeatherName(activeConfig.weather)}</strong>
                        </p>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <Timer size={15} /> {elapsedSeconds}s elapsed
                      </div>
                    </div>

                    {/* Phase indicator */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'baseline', label: '① Baseline Run', color: '#F43F5E' },
                        { key: 'ai', label: '② AI-Controlled Run', color: '#10B981' },
                        { key: 'complete', label: '③ KPI Calculation', color: '#A855F7' },
                      ].map(ph => {
                        const phases = ['idle', 'baseline', 'ai', 'complete', 'error'];
                        // derive phase from log presence (best proxy during streaming)
                        const phaseActive = liveLogs.some(l =>
                          ph.key === 'baseline' ? l.includes('Baseline Mode') :
                          ph.key === 'ai' ? l.includes('AI-Controlled Mode') :
                          l.includes('[RESULTS]') || l.includes('QUANTITATIVE')
                        );
                        const phaseCurrent = ph.key === 'baseline'
                          ? liveLogs.length > 0 && !liveLogs.some(l => l.includes('AI-Controlled Mode'))
                          : ph.key === 'ai'
                          ? liveLogs.some(l => l.includes('AI-Controlled Mode')) && !simResults
                          : !!simResults;
                        return (
                          <div key={ph.key} style={{
                            padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                            background: phaseCurrent ? `rgba(${ph.color === '#F43F5E' ? '244,63,94' : ph.color === '#10B981' ? '16,185,129' : '168,85,247'},0.15)` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${phaseCurrent ? ph.color : 'rgba(255,255,255,0.08)'}`,
                            color: phaseCurrent ? ph.color : '#64748B',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                            {phaseCurrent && <span style={{ width: 8, height: 8, borderRadius: '50%', background: ph.color, display: 'inline-block', animation: 'pulse-ring 1.5s infinite' }} />}
                            {ph.label}
                          </div>
                        );
                      })}
                    </div>

                    {/* Indeterminate progress bar */}
                    <div style={{ marginTop: '16px', width: '100%', height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div className="indeterminate-progress" style={{ width: '100%', height: '100%', borderRadius: '4px' }} />
                    </div>
                  </div>

                  {/* ── LIVE LOG TERMINAL ────────────────────────────────── */}
                  <div style={{
                    background: '#030712',
                    borderRadius: '14px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    overflow: 'hidden',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  }}>
                    {/* Terminal titlebar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['#EF4444','#F59E0B','#10B981'].map((c,i) => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace', marginLeft: '6px' }}>
                        EnergyPlus Subprocess Output — Live Stream
                      </span>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981', fontSize: '0.75rem', fontWeight: 700 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse-ring 1.2s infinite' }} />
                        LIVE
                      </div>
                    </div>

                    {/* Log lines */}
                    <div
                      id="live-log-terminal"
                      style={{
                        height: '320px',
                        overflowY: 'auto',
                        padding: '14px 18px',
                        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                        fontSize: '0.76rem',
                        lineHeight: 1.6,
                        color: '#94A3B8',
                      }}
                      ref={el => { if (el) el.scrollTop = el.scrollHeight; }}
                    >
                      {liveLogs.length === 0 ? (
                        <span style={{ color: '#334155' }}>Connecting to EnergyPlus subprocess...</span>
                      ) : liveLogs.map((line, i) => {
                        // Color-code different log line types
                        let color = '#94A3B8';
                        if (line.includes('Completed Successfully') || line.includes('Saved') || line.includes('[+]')) color = '#34D399';
                        else if (line.includes('[*]') || line.includes('Starting') || line.includes('Beginning') || line.includes('===')) color = '#38BDF8';
                        else if (line.includes('Warming up')) color = '#64748B';
                        else if (line.includes('Initializing') || line.includes('Calculating') || line.includes('Performing') || line.includes('Adjusting') || line.includes('Computing')) color = '#CBD5E1';
                        else if (line.includes('[!]') || line.includes('Error') || line.includes('error')) color = '#F87171';
                        else if (line.includes('Sizing Period') || line.includes('for Sizing')) color = '#C084FC';
                        else if (line.includes('kWh') || line.includes('kW') || line.includes('CO2') || line.includes('Compliance')) color = '#FCD34D';
                        return (
                          <div key={i} style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (


                <>
                  {/* ── RESULTS SUMMARY BANNER (shown after simulation completes) ─── */}
                  {simResults && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
                      borderRadius: '20px',
                      padding: '24px 28px',
                      border: '1.5px solid #10B981',
                      boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)',
                      marginBottom: '24px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🏆</div>
                        <div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
                            Simulation Complete — Quantitative Energy Savings Dashboard
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#34D399', fontWeight: 600, marginTop: '2px' }}>
                            EnergyPlus Physics + Ollama MCP Agent · {activeConfig.model} · {formatWeatherName(activeConfig.weather)}
                          </div>
                        </div>
                        <button
                          onClick={() => setSimResults(null)}
                          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}
                          title="Dismiss"
                        >✕</button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        {[
                          { label: 'Baseline Energy', value: `${simResults.baseline_kwh?.toLocaleString()} kWh`, color: '#F43F5E', icon: '🔴' },
                          { label: 'AI-Controlled Energy', value: `${simResults.ai_controlled_kwh?.toLocaleString()} kWh`, color: '#34D399', icon: '🟢' },
                          { label: 'Net Energy Reduction', value: `${simResults.kwh_saved?.toLocaleString()} kWh`, sub: `${simResults.energy_savings_pct}% Savings`, color: '#22D3EE', icon: '⚡' },
                          { label: 'Peak Demand Cut', value: `${simResults.peak_kw_reduction} kW`, sub: `${simResults.peak_pct_cut}% Peak Cut`, color: '#C084FC', icon: '📉' },
                          { label: 'CO₂ Avoided', value: `${simResults.co2_saved_kg?.toLocaleString()} kg CO₂e`, color: '#4ADE80', icon: '🌱' },
                          { label: 'Comfort Compliance', value: `${simResults.ai_comfort_compliance_pct}%`, sub: 'ASHRAE 55 PMV', color: '#FCD34D', icon: '🛋️' },
                        ].map((item, i) => (
                          <div key={i} style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '14px 16px', border: `1px solid rgba(255,255,255,0.08)` }}>
                            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                              {item.icon} {item.label}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: item.color }}>
                              {item.value}
                            </div>
                            {item.sub && <div style={{ fontSize: '0.76rem', color: '#34D399', fontWeight: 700, marginTop: '2px' }}>{item.sub}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 0 / All: Per-Zone Closed-Loop Analytics Inspector */}
                  {(analyticsTab === 'zone-analytics' || analyticsTab === 'all') && (
                    <ZoneAnalytics 
                      baselineData={metrics?.baseline_series} 
                      aiData={metrics?.ai_series} 
                      modelName={activeConfig.model}
                      modelInfo={modelInfo}
                    />
                  )}


                  {/* Tab 1 / All: Summary KPI Cards */}
                  {(analyticsTab === 'overview' || analyticsTab === 'all') && (
                    <KPICards summary={metrics?.summary} />
                  )}

                  {/* Tab 2 / All: Interactive Performance Charts */}
                  {(analyticsTab === 'charts' || analyticsTab === 'all') && (
                    <MetricsCharts 
                      baselineData={metrics?.baseline_series} 
                      aiData={metrics?.ai_series} 
                    />
                  )}

                  {/* Tab 3 / All: Building Zones & Floor Levels Map */}
                  {(analyticsTab === 'zones' || analyticsTab === 'all') && (
                    <ZoneMap 
                      modelName={activeConfig.model} 
                      baselineData={metrics?.baseline_series}
                      aiData={metrics?.ai_series}
                      telemetryData={metrics?.ai_series} 
                      modelInfo={modelInfo}
                    />
                  )}

                  {/* Tab 4 / All: Telemetry Log Table */}
                  {(analyticsTab === 'logs' || analyticsTab === 'all') && (
                    <TelemetryTable telemetryLogs={metrics?.ai_series} />
                  )}

                  {/* Tab 5 / All: IDF Model & Geographic Location Inspector */}
                  {(analyticsTab === 'inspector' || analyticsTab === 'all') && (
                    <ModelInspector modelInfo={modelInfo} locationInfo={metrics?.location} />
                  )}
                </>
              )}
            </main>

          </div>
        )}
      </div>

      {/* Honeywell Enterprise Footer */}
      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}
