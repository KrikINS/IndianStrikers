const BASE_URL = import.meta.env.VITE_API_URL as string;

export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(init?.headers);
  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
