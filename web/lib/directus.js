import env from '@beam-australia/react-env';
import { Directus } from '@directus/sdk';

export const url = env('API_URL') || 'http://localhost:8055';
export const directus = new Directus(url);

// Returns user object if session is valid, otherwise false
export async function checkSession() {
  try {
    // Force request new auth token
    await directus.auth.refresh();

    // Fetch and return user (also to check if session is indeed valid)
    const user = await directus.users.me.read();
    return user;
  } catch {
    // Something is wrong
    return false;
  }
}

// Get current auth token
export const getBearer = async () => {
  // Refresh token if required
  if (!directus.auth.token) {
    try {
      await directus.auth.refresh();
    } catch {
      // Ignore error
    }
  }
  return `Bearer ${directus.auth.token}`;
};
