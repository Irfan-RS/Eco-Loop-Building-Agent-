import React from 'react';
import { Home, Flame, Users, Calendar, MapPin } from 'lucide-react';

export default function ModelInspector({ modelInfo, locationInfo }) {
  if (!modelInfo) return null;

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: '#F1F5F9' }}>
        🏗️ EnergyPlus IDF Building Model & Geographic Location Inspector
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        
        {/* Location & Place Metadata Card */}
        {locationInfo && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <MapPin size={20} color="#22D3EE" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#22D3EE' }}>
                Geographic Location & Climate
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', color: '#F8FAFC', fontWeight: 700 }}>
                📍 {locationInfo.city}, {locationInfo.state}, {locationInfo.country}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', color: '#94A3B8' }}>
                🌐 Coordinates: <strong style={{ color: '#F1F5F9' }}>{locationInfo.latitude}° N, {locationInfo.longitude}° W</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', color: '#94A3B8' }}>
                🏔️ Elevation: <strong style={{ color: '#F1F5F9' }}>{locationInfo.elevation_m} meters</strong>
              </div>
              <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '8px 12px', borderRadius: '8px', color: '#22D3EE', fontWeight: 600 }}>
                🌤️ {locationInfo.climate_zone}
              </div>
            </div>
          </div>
        )}

        {/* Thermal Zones Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Home size={20} color="#00E676" />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#00E676' }}>
              Thermal Zones ({modelInfo.zones_count || 0})
            </h4>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {modelInfo.zones?.map((z, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.86rem', color: '#E2E8F0' }}>
                🏢 {z}
              </div>
            ))}
          </div>
        </div>

        {/* HVAC Equipment Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Flame size={20} color="#00E5FF" />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#00E5FF' }}>
              HVAC Equipment Loops
            </h4>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {modelInfo.hvac && Object.entries(modelInfo.hvac).map(([key, items], idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 600, color: '#00E5FF' }}>{key}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '2px' }}>
                  {items.length > 0 ? items.join(', ') : 'None'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedules Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Calendar size={20} color="#E040FB" />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#E040FB' }}>
              Thermostat Schedules ({modelInfo.schedules_count || 0})
            </h4>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {modelInfo.schedules?.slice(0, 10).map((sch, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.84rem', color: '#E040FB', fontFamily: 'var(--font-mono)' }}>
                📅 {sch}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
