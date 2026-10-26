// The session itself is an httpOnly cookie the page cannot read. This flag only says that a
// session probably exists, so signed-out visitors do not make a pointless /auth/me call.
const HINT_KEY = 'mb-signed-in';

export const sessionHint = {
  get() {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  },
  set(on) {
    try {
      if (on) localStorage.setItem(HINT_KEY, '1');
      else localStorage.removeItem(HINT_KEY);
      localStorage.removeItem('mb-token'); // older versions kept the token here
    } catch {
      /* storage unavailable: the cookie still works for this tab */
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
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body) });
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
  logout: () => request('POST', '/auth/logout'),
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
