let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  authTokenGetter = getter;
}

export async function getAuthToken() {
  if (!authTokenGetter) {
    return null;
  }

  return authTokenGetter();
}
