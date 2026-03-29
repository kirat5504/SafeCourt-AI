import { StatusIndicator } from './StatusIndicator';

interface ProcessingIndicatorProps {
  active: boolean;
  complete?: boolean;
  error?: boolean;
}

export function ProcessingIndicator({ active, complete = false, error = false }: ProcessingIndicatorProps) {
  const state = error ? 'error' : complete ? 'complete' : active ? 'loading' : 'idle';
  return <StatusIndicator state={state} />;
}
