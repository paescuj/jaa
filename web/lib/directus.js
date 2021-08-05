import { Auth, AxiosTransport, Directus, MemoryStorage } from '@directus/sdk';

export const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8055';
// A bit safer to store JWT in memory as opposed to local storage.
const storage = new MemoryStorage();
const transport = new AxiosTransport(url, storage, async () => {
  // Don't display refresh errors
  try {
    await auth.refresh();
  } catch {
    // Ignore error
  }
});
const auth = new Auth(transport, storage, { refresh: { auto: true } });
export const directus = new Directus(url, {
  auth,
  storage,
  transport,
});

// Returns user object if session is valid, otherwise false
export async function checkSession() {
  // Check if auth token is present
  if (directus.auth.token) {
    try {
      // Fetch user (also to check if session is indeed valid)
      const user = await directus.users.me.read();
      // Return user object
      return user;
    } catch {
      // Something is wrong: Remove expired / faulty token
      storage.delete('auth_token');
      storage.delete('auth_expires');
      return false;
    }
  } else {
    // Try to get new auth token with refresh token
    try {
      // Force request new auth token
      await directus.auth.refresh(true);
      // Fetch user
      const user = await directus.users.me.read();
      // Return user object
      return user;
    } catch {
      return false;
    }
  }
}

// Get current auth token
export const getBearer = async () => {
  // Refresh token if required
  try {
    await directus.auth.refresh();
  } catch {
    // Ignore error
  }
  return `Bearer ${directus.auth.token}`;
};
