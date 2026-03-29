import { useSession } from '../contexts/SessionContext';
import { useVault } from '../hooks/useVault';

export function VaultPage() {
  const { session, isSessionValid } = useSession();
  const { vault, ready: vaultReady } = useVault();
  const hasSession = session.isActive && isSessionValid();

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1
          className="font-black uppercase leading-none mb-2"
          style={{ fontSize: '2.8rem', color: '#2a2520', letterSpacing: '-0.01em' }}
        >
          VAULT
        </h1>
        <p className="text-sm" style={{ color: '#888888' }}>
          Encrypted token store — all PII is held client-side using AES-256-GCM.
        </p>
      </div>

      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <p className="text-5xl mb-4">🔐</p>
        <p className="font-bold text-sm mb-1" style={{ color: '#333333' }}>
          {vaultReady && hasSession ? 'Vault Active' : 'Vault Locked'}
        </p>
        <p className="text-xs" style={{ color: '#888888' }}>
          {hasSession
            ? 'Your tokens are encrypted in-browser using Web Crypto API. They never leave your device unencrypted.'
            : 'Create a session to initialise the vault.'}
        </p>

        {hasSession && (
          <div
            className="mt-6 rounded-xl p-4 text-xs font-mono text-left"
            style={{ background: '#f8f6f2', border: '1px solid rgba(0,0,0,0.07)', color: '#666666' }}
          >
            <p>Session ID: {session.id?.substring(0, 24)}...</p>
            <p>Algorithm: AES-256-GCM</p>
            <p>Storage: Client-side only</p>
            <p>Status: {vaultReady ? '✅ Ready' : '⏳ Initialising'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
