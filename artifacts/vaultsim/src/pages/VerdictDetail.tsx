import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiClient, VerdictItem } from '../utils/api';
import { formatRelativeTime, formatFullDate } from '../utils/formatTime';

export function VerdictDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apiClient = getApiClient();
  const [verdict, setVerdict] = useState<VerdictItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.getVerdictById(id).then(v => {
      setVerdict(v);
    }).catch(() => {
      setError('Verdict not found or could not be loaded.');
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 0 40px' }}>
      <button
        onClick={() => navigate('/history')}
        className="flex items-center gap-1.5 text-xs mb-8 transition-colors"
        style={{ color: '#aaaaaa', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#666666')}
        onMouseLeave={e => (e.currentTarget.style.color = '#aaaaaa')}
      >
        ← BACK TO HISTORY
      </button>

      {loading && (
        <div className="flex items-center gap-2 py-8" style={{ color: '#aaaaaa' }}>
          <span className="text-sm">Loading verdict</span>
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

      {!loading && verdict && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(200,146,58,0.12)', border: '1px solid rgba(200,146,58,0.3)', fontSize: 14 }}
            >
              ⚖
            </div>
            <div>
              <p
                className="font-black tracking-widest"
                style={{ fontSize: 13, color: '#1a1a1a', letterSpacing: '0.18em' }}
              >
                FINAL VERDICT
              </p>
              <p style={{ color: '#aaaaaa', fontSize: 11 }}>
                {formatRelativeTime(verdict.created_at)} · {formatFullDate(verdict.created_at)}
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-7"
            style={{
              background: '#111111',
              border: '1px solid #2a2a2a',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(200,146,58,0.08)',
            }}
          >
            <p
              className="leading-relaxed"
              style={{ color: '#e8e3d8', fontSize: 14, lineHeight: '1.8', fontFamily: 'serif' }}
            >
              {verdict.summary}
            </p>
          </div>

          <div
            className="rounded-xl mt-4 px-5 py-4 flex items-center gap-6"
            style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)' }}
          >
            <div>
              <p style={{ color: '#aaaaaa', fontSize: '10px', letterSpacing: '0.1em', marginBottom: 2 }}>RECORDED</p>
              <p style={{ color: '#333333', fontSize: '12px' }}>{formatFullDate(verdict.created_at)}</p>
            </div>
            {verdict.session_id_hash && (
              <div>
                <p style={{ color: '#aaaaaa', fontSize: '10px', letterSpacing: '0.1em', marginBottom: 2 }}>SESSION (HASHED)</p>
                <p style={{ color: '#333333', fontSize: '12px', fontFamily: 'monospace' }}>{verdict.session_id_hash}</p>
              </div>
            )}
            <div className="ml-auto">
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(200,146,58,0.1)', color: '#c8923a', fontSize: '10px', letterSpacing: '0.08em' }}
              >
                PRIVACY-SAFE
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/trial')}
              className="flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition-colors"
              style={{ background: '#111111', color: 'white', letterSpacing: '0.12em' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
              onMouseLeave={e => (e.currentTarget.style.background = '#111111')}
            >
              NEW TRIAL
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition-colors"
              style={{ background: 'rgba(0,0,0,0.06)', color: '#333333', letterSpacing: '0.12em' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
            >
              ALL VERDICTS
            </button>
          </div>
        </>
      )}
    </div>
  );
}
