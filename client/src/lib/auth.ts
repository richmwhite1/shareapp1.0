export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('token');
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
}

export async function apiRequestWithAuth(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  if (data && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: 'include',
  });

  if (response.status === 401 || response.status === 403) {
    removeAuthToken();
    // Optionally redirect to auth page
    window.location.href = '/auth';
  }

  return response;
}
