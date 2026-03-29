export function AgentPage() {
  const agents = [
    {
      name: 'DEFENSE COUNSEL',
      icon: '🛡',
      color: '#166534',
      bg: '#f0fdf4',
      border: '#86efac',
      desc: 'Argues in favour of the defendant, citing case document evidence to build a defense narrative.',
    },
    {
      name: 'PROSECUTION',
      icon: '⚔',
      color: '#991b1b',
      bg: '#fef2f2',
      border: '#fca5a5',
      desc: 'Challenges the defendant\'s position and highlights contradictions or liabilities in the document.',
    },
    {
      name: 'JUDGE',
      icon: '⚖',
      color: '#92400e',
      bg: '#fffbeb',
      border: '#fcd34d',
      desc: 'Reviews both arguments and issues a final verdict based solely on the sanitised document content.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1
          className="font-black uppercase leading-none mb-2"
          style={{ fontSize: '2.8rem', color: '#2a2520', letterSpacing: '-0.01em' }}
        >
          AGENTS
        </h1>
        <p className="text-sm" style={{ color: '#888888' }}>
          Three autonomous AI agents powered by Claude, each with a distinct legal role.
        </p>
      </div>

      <div className="space-y-4">
        {agents.map(a => (
          <div
            key={a.name}
            className="rounded-2xl p-6"
            style={{ background: a.bg, border: `1px solid ${a.border}` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span style={{ fontSize: '22px' }}>{a.icon}</span>
              <span
                className="text-xs font-black tracking-widest"
                style={{ color: a.color, letterSpacing: '0.2em' }}
              >
                {a.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#444444' }}>
              {a.desc}
            </p>
          </div>
        ))}

        <div
          className="rounded-2xl p-5 text-xs"
          style={{ background: '#f8f6f2', border: '1px solid rgba(0,0,0,0.07)', color: '#888888' }}
        >
          <p className="font-bold mb-1" style={{ color: '#555555', letterSpacing: '0.1em' }}>MODEL</p>
          <p>All agents use <code className="font-mono">claude-haiku-4-5</code> via the Replit AI Integration proxy.
          Each call includes the full sanitised case document and the prior debate history for continuity.</p>
        </div>
      </div>
    </div>
  );
}
