const TOKEN_KEY = 'mb-token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable: the session lasts for this tab only */
    }
  },
};

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields ?? {};
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Could not reach MealBridge. Check your connection and try again.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.fields);
  return data;
}

const qs = (params = {}) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const api = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  me: () => request('GET', '/auth/me'),

  listings: (params) => request('GET', `/listings${qs(params)}`),
  cities: () => request('GET', '/listings/cities'),
  myListings: () => request('GET', '/listings/mine'),
  listing: (id) => request('GET', `/listings/${id}`),
  createListing: (body) => request('POST', '/listings', body),
  updateListing: (id, body) => request('PATCH', `/listings/${id}`, body),
  deleteListing: (id) => request('DELETE', `/listings/${id}`),
  claim: (id) => request('POST', `/listings/${id}/claim`),
  unclaim: (id) => request('POST', `/listings/${id}/unclaim`),
  complete: (id) => request('POST', `/listings/${id}/complete`),
  cancel: (id) => request('POST', `/listings/${id}/cancel`),

  stats: () => request('GET', '/stats'),
  myStats: () => request('GET', '/stats/me'),
};
