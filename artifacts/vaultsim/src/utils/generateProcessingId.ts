export function createProcessingId(): string {
  return crypto.randomUUID();
}

export function isValidProcessingId(processingId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(processingId);
}

export function createValidProcessingId(): string {
  const processingId = createProcessingId();
  if (!isValidProcessingId(processingId)) {
    throw new Error('Generated processing ID failed validation');
  }
  return processingId;
}
