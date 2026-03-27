import { useState, useEffect, useCallback } from 'react';
import { getVault, vaultEvents } from '../utils/Vault';
import type { VaultStats } from '../utils/types';

export function useVault() {
  const vault = getVault();
  const [ready, setReady] = useState(vault.isReady());

  useEffect(() => {
    const handleReady = () => setReady(true);
    const handleWiped = () => setReady(false);

    vaultEvents.addEventListener('ready', handleReady);
    vaultEvents.addEventListener('wiped', handleWiped);

    setReady(vault.isReady());

    return () => {
      vaultEvents.removeEventListener('ready', handleReady);
      vaultEvents.removeEventListener('wiped', handleWiped);
    };
  }, []);

  const initialize = useCallback(async (sessionId: string, challenge: string) => {
    await vault.initialize(sessionId, challenge);
  }, [vault]);

  const wipe = useCallback(async () => {
    await vault.wipe();
  }, [vault]);

  const storeFromTokenMap = useCallback(async (tokenMap: Record<string, string>) => {
    await vault.storeFromTokenMap(tokenMap);
  }, [vault]);

  const getStats = useCallback(async (): Promise<VaultStats> => {
    return vault.getStats();
  }, [vault]);

  return {
    vault: ready ? vault : null,
    ready,
    initialize,
    wipe,
    storeFromTokenMap,
    getStats,
  };
}
