// Thin wrapper over fetch for the Express API (proxied at /api by Vite in dev).
const TOKEN_KEY = "zts.token";

export const token = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage blocked (private mode etc.): the session just won't survive a reload.
    }
  },
};

// Thrown for any failed request. `field` names the form input the message belongs to.
export class ApiError extends Error {
  constructor(message, { status, field } = {}) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export async function api(path, { method = "GET", json, form, headers: extraHeaders } = {}) {
  const headers = { ...extraHeaders };
  const auth = token.get();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (json) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: json ? JSON.stringify(json) : form });
  } catch {
    throw new ApiError("We can't reach the server. Check your connection and try again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || "Something went wrong on our side. Try again in a minute.", {
      status: res.status,
      field: data.field,
    });
  }
  return data;
}

// Job searches. Anonymous users prove a run is theirs with the token it came with.
const runHeaders = (runToken) => (runToken ? { "X-Run-Token": runToken } : undefined);

export const startJobRun = ({ analysisId, location, remoteOnly }, runToken) =>
  api("/job-runs", { method: "POST", json: { analysisId, location, remoteOnly }, headers: runHeaders(runToken) });

// `since` is the cursor from the previous call: only newer matches come back.
export const getJobRun = (id, { since, runToken } = {}) =>
  api(`/job-runs/${encodeURIComponent(id)}${since ? `?since=${encodeURIComponent(since)}` : ""}`, { headers: runHeaders(runToken) });

export const cancelJobRun = (id, runToken) =>
  api(`/job-runs/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: runHeaders(runToken) });

export const getLatestJobRun = () => api("/job-runs/latest");
