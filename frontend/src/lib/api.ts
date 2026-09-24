const BASE = "/api";
// The hosted site reaches the backend through ngrok's free tier, which answers
// browser requests with an HTML warning page unless this header is present.
// Harmless locally, where the Vite proxy ignores it.
const HEADERS = { "ngrok-skip-browser-warning": "1" };

// A ceiling so a hung backend can't leave the UI waiting forever. Free-tier
// models behind OmniRoute routinely take 15-25s per answer (and 60s is the
// backend's own openai_timeout_s), so 25s cut off answers already on the way.
const DEFAULT_TIMEOUT_MS = 60_000;

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function handle<T>(path: string, res: Response): Promise<T> {
  if (!res.ok) {
    // Surface FastAPI's own `detail` (e.g. why an upload was rejected) instead
    // of a bare status code the caller can only guess about.
    const detail = await res.json().then((b) => b?.detail, () => undefined);
    throw new Error(typeof detail === "string" ? detail : `${path} -> ${res.status}`);
  }
  return res.json();
}

function timeoutError(path: string): Error {
  return new Error(`${path} -> timed out`);
}

export async function apiGet<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { headers: HEADERS, signal });
    return await handle<T>(path, res);
  } catch (e) {
    throw e instanceof DOMException && e.name === "AbortError" ? timeoutError(path) : e;
  } finally {
    cancel();
  }
}

export async function apiPost<T>(path: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    return await handle<T>(path, res);
  } catch (e) {
    throw e instanceof DOMException && e.name === "AbortError" ? timeoutError(path) : e;
  } finally {
    cancel();
  }
}

export async function apiUpload<T>(path: string, files: FileList, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: HEADERS, body: form, signal });
    return await handle<T>(path, res);
  } catch (e) {
    throw e instanceof DOMException && e.name === "AbortError" ? timeoutError(path) : e;
  } finally {
    cancel();
  }
}
