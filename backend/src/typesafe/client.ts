import { TypeSafeClient } from '@typesafe-ai/sdk';

let _client: TypeSafeClient | null = null;

/**
 * Returns a singleton TypeSafeClient.
 * Throws if TYPESAFE_API_KEY is not set.
 */
export function getTypeSafeClient(): TypeSafeClient {
  if (!_client) {
    if (!process.env.TYPESAFE_API_KEY) {
      throw new Error('TYPESAFE_API_KEY environment variable is not set.');
    }
    _client = new TypeSafeClient();
  }
  return _client;
}

/**
 * Returns true if the TypeSafe comparator is available (API key present).
 */
export function isTypeSafeAvailable(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}
