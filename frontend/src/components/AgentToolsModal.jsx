import React from 'react';
import { X, Terminal, Cpu, ShieldCheck } from 'lucide-react';

export default function AgentToolsModal({ toolsInfo, onClose }) {
  if (!toolsInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="glass-card" style={{
        maxWidth: '750px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '30px',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        position: 'relative',
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Terminal size={24} color="#00E5FF" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F1F5F9' }}>
              Model Context Protocol (MCP) Tools Registry
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F1F5F9',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '24px' }}>
          Standardized tool definitions exposed by the PyEnergyPlus MCP Server for LLM & Cognitive Agent closed-loop setpoint overrides.
        </p>

        {/* Tools List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {toolsInfo.tools?.map((tool, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00E676', fontSize: '1rem' }}>
                  ⚙️ {tool.name}
                </span>
                <span className="badge badge-info">MCP Tool</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginBottom: '12px' }}>
                {tool.description}
              </p>
              
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                Parameters: {JSON.stringify(tool.parameters?.properties || {}, null, 2)}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
