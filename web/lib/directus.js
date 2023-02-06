import env from '@beam-australia/react-env';
import { Directus } from '@directus/sdk';

export const url = env('API_URL') || 'http://localhost:8055';
export const directus = new Directus(url, { storage: { prefix: 'jaa_' } });

/**
 * Get current user from API.
 * @returns User object if session is valid, otherwise 'false'.
 */
export async function getUser() {
  try {
    // Fetch and return user (also to check if session is valid)
    return await directus.users.me.read();
  } catch {
    // Something is wrong
    return false;
  }
}

/** Get current auth token. */
export const getBearer = async () => {
  try {
    await directus.auth.refreshIfExpired();
  } catch {
    // Ignore error
  }
  return `Bearer ${await directus.auth.token}`;
};
