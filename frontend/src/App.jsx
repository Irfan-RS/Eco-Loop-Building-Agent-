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
import { ArrowLeft, RefreshCw, Cpu, Activity, Zap, Timer, Building2, CloudSun, Layers, Sliders, Play, CheckCircle2 } from 'lucide-react';


export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return sessionStorage.getItem('ecoloop_current_page') || 'home';
  });

  const [analyticsTab, setAnalyticsTab] = useState('zone-analytics'); // 'zone-analytics' | 'overview' | 'charts' | 'zones' | 'logs' | 'inspector' | 'all'
  const [metrics, setMetrics] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

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

  const API_BASE = 'http://localhost:8000';

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const cacheBuster = Date.now();
      const [resMetrics, resModel] = await Promise.all([
        fetch(`${API_BASE}/api/metrics?t=${cacheBuster}`).then(r => r.json()),
        fetch(`${API_BASE}/api/building-model?t=${cacheBuster}`).then(r => r.json()),
      ]);

      if (resMetrics.status === 'success') {
        setMetrics(resMetrics);
        if (resMetrics.active_config) {
          setActiveConfig(resMetrics.active_config);
        }
      }
      if (resModel.status === 'success') setModelInfo(resModel);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunSimulation = async (config = {}) => {
    try {
      setIsSimulating(true);
      setLoading(true);
      setMetrics(null);
      if (config.model || config.weather) {
        setActiveConfig(prev => ({ ...prev, ...config }));
      }
      setCurrentPage('analytics'); // Direct user to analytics page
      const res = await fetch(`${API_BASE}/api/run-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (data.active_config) {
          setActiveConfig(data.active_config);
        }
      }
    } catch (err) {
      console.error('Simulation trigger error:', err);
    } finally {
      setIsSimulating(false);
      await fetchData();
    }
  };

  const navigateToHome = () => {
    setIsSimulating(false);
    setCurrentPage('home');
    setActiveConfig({
      model: '5ZoneAirCooled.idf',
      weather: 'Chicago_OHare_TMY3.epw',
      period: '5days'
    });
    setMetrics(null);
    sessionStorage.setItem('ecoloop_current_page', 'home');
  };

  const formatWeatherName = (w) => {
    if (!w) return 'Chicago TMY3 Weather';
    if (w.includes('San_Francisco') || w.includes('San Francisco')) return 'San Francisco TMY3 Weather';
    return 'Chicago O\'Hare TMY3 Weather';
  };

  const targetDuration = (activeConfig?.model?.includes('OfficeMedium') || activeConfig?.model?.includes('ASHRAE')) ? 15 : 10;
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
                    onChange={(e) => handleRunSimulation({ ...activeConfig, model: e.target.value })}
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
                    <option value="5ZoneAirCooled.idf" style={{ background: '#0F172A', color: '#F8FAFC' }}>🏢 5ZoneAirCooled.idf</option>
                    <option value="ASHRAE901_OfficeMedium.idf" style={{ background: '#0F172A', color: '#F8FAFC' }}>🏬 ASHRAE901_OfficeMedium.idf</option>
                  </select>
                </div>

                {/* Weather EPW Selector */}
                <div>
                  <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CloudSun size={13} color="#22D3EE" /> Weather File (.epw)
                  </div>
                  <select
                    value={activeConfig.weather}
                    onChange={(e) => handleRunSimulation({ ...activeConfig, weather: e.target.value })}
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
                    <option value="Chicago_OHare_TMY3.epw" style={{ background: '#0F172A', color: '#F8FAFC' }}>📍 Chicago O'Hare (Cold/Hot)</option>
                    <option value="San_Francisco_TMY3.epw" style={{ background: '#0F172A', color: '#F8FAFC' }}>📍 San Francisco (Coastal)</option>
                  </select>
                </div>

                {/* Trigger Run Button */}
                <button
                  onClick={() => handleRunSimulation(activeConfig)}
                  disabled={loading || isSimulating}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Play size={14} fill="#FFF" /> Re-Run Closed-Loop Agent
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
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        color: isActive ? item.color : '#64748B',
                        fontWeight: 600
                      }}>
                        {item.badge}
                      </span>
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
                <div className="glass-card" style={{ textAlign: 'center', padding: '52px 36px', margin: '20px auto', maxWidth: '720px', border: '1.5px solid rgba(16, 185, 129, 0.4)', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                  
                  {/* Glowing Pulsing Orbital Icon */}
                  <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '24px' }}>
                    <div style={{
                      position: 'absolute',
                      inset: '-12px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1.5px solid rgba(16, 185, 129, 0.5)',
                      animation: 'pulse-ring 2s infinite'
                    }} />
                    <div style={{ padding: '18px', borderRadius: '50%', background: '#0F172A', border: '1.5px solid #10B981', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw size={42} style={{ animation: 'spin 1.2s linear infinite' }} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                    EnergyPlus Physics Simulation Engine Active
                  </h3>

                  <p style={{ fontSize: '0.94rem', color: '#CBD5E1', maxWidth: '540px', margin: '0 auto 20px auto', lineHeight: 1.55 }}>
                    Building Model: <strong style={{ color: '#FF6B6B' }}>{activeConfig.model}</strong> | Weather Profile: <strong style={{ color: '#22D3EE' }}>{formatWeatherName(activeConfig.weather)}</strong>
                  </p>

                  {/* DYNAMIC LIVE BACKEND ACTION MESSAGE BOX */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34D399' }}>
                      {backendSteps[activeStepIndex]}
                    </span>
                  </div>

                  {/* LIVE ANIMATED INDETERMINATE SHIMMER TRACK (NO %) */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', padding: '18px 24px', marginBottom: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.88rem', fontWeight: 700 }}>
                      <span style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Timer size={16} /> Elapsed Time: {elapsedSeconds}s
                      </span>
                      <span style={{ color: '#10B981', fontSize: '0.82rem', fontWeight: 600 }}>
                        🟢 Executing Physics Timesteps...
                      </span>
                    </div>

                    {/* Infinite Shimmer Track (No arbitrary % text) */}
                    <div style={{ width: '100%', height: '10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                      <div className="indeterminate-progress" style={{ width: '100%', height: '100%', borderRadius: '6px' }} />
                    </div>
                  </div>

                  {/* Execution Badges */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.84rem', color: '#CBD5E1' }}>
                    <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Cpu size={14} /> PyEnergyPlus C API
                    </span>
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} /> ASHRAE 55 PMV Check
                    </span>
                    <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} /> MCP Dynamic Setpoints
                    </span>
                  </div>
                </div>
              ) : (

                <>
                  {/* Tab 0 / All: Per-Zone Closed-Loop Analytics Inspector */}
                  {(analyticsTab === 'zone-analytics' || analyticsTab === 'all') && (
                    <ZoneAnalytics 
                      baselineData={metrics?.baseline_series} 
                      aiData={metrics?.ai_series} 
                      modelName={activeConfig.model} 
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
                      telemetryData={metrics?.ai_series} 
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
