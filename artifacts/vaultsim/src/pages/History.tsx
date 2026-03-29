import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiClient, VerdictItem } from '../utils/api';
import { formatRelativeTime, formatFullDate } from '../utils/formatTime';

export function History() {
  const navigate = useNavigate();
  const apiClient = getApiClient();
  const [verdicts, setVerdicts] = useState<VerdictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getVerdicts(100).then(res => {
      setVerdicts(res.verdicts);
    }).catch(() => {
      setError('Failed to load verdict history.');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '12px 0 40px' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="font-black tracking-widest"
            style={{ fontSize: 22, color: '#1a1a1a', letterSpacing: '0.18em' }}
          >
            VERDICT HISTORY
          </h1>
          <p className="text-sm mt-1" style={{ color: '#999999' }}>
            All saved case outcomes — privacy-safe summaries only
          </p>
        </div>
        <button
          onClick={() => navigate('/trial')}
          className="text-xs font-bold tracking-widest px-4 py-2 rounded-full transition-colors"
          style={{ background: '#111111', color: 'white', letterSpacing: '0.1em' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
          onMouseLeave={e => (e.currentTarget.style.background = '#111111')}
        >
          + NEW TRIAL
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8" style={{ color: '#aaaaaa' }}>
          <span className="text-sm">Loading verdicts</span>
          <span style={{ letterSpacing: 2 }}>···</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ background: '#fff4f4', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      {!loading && !error && verdicts.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p style={{ fontSize: 32, marginBottom: 12 }}>⚖️</p>
          <p className="font-semibold text-sm mb-1" style={{ color: '#333333' }}>
            No verdicts recorded yet
          </p>
          <p className="text-sm" style={{ color: '#aaaaaa' }}>
            Run a trial and enable "Save Verdicts" in the sidebar to see history here.
          </p>
        </div>
      )}

      {!loading && verdicts.length > 0 && (
        <div className="space-y-3">
          {verdicts.map((v, i) => (
            <div
              key={v.id}
              onClick={() => navigate(`/history/${v.id}`)}
              className="rounded-2xl p-5 transition-all"
              style={{
                background: 'white',
                border: '1px solid rgba(0,0,0,0.07)',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(200,146,58,0.3)';
                el.style.boxShadow = '0 4px 16px rgba(200,146,58,0.08)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(0,0,0,0.07)';
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-bold tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(200,146,58,0.1)', color: '#c8923a', fontSize: '9px', letterSpacing: '0.1em' }}
                    >
                      VERDICT #{verdicts.length - i}
                    </span>
                    {v.session_id_hash && (
                      <span style={{ color: '#cccccc', fontSize: '9px', fontFamily: 'monospace' }}>
                        {v.session_id_hash}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: '#333333',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.6',
                    }}
                  >
                    {v.summary}
                  </p>
                </div>
                <span
                  className="text-xs shrink-0"
                  style={{ color: '#cccccc', fontSize: '11px', paddingTop: 2 }}
                >
                  →
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ color: '#aaaaaa', fontSize: '11px' }}>
                  {formatRelativeTime(v.created_at)}
                </span>
                <span style={{ color: '#cccccc', fontSize: '10px' }}>
                  {formatFullDate(v.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
