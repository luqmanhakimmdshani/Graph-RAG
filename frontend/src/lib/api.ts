const BASE = "/api";

// Backend query endpoints now enforce a ~20s Gemini timeout (see
// gemini_timeout_ms), but before this the frontend had no ceiling of its
// own - a slow/hung backend just left the UI waiting forever with no way
// out but a manual reload. 25s gives the backend's own timeout room to fire
// and surface as a normal error response first.
const DEFAULT_TIMEOUT_MS = 25_000;

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function handle<T>(path: string, res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function timeoutError(path: string): Error {
  return new Error(`${path} -> timed out`);
}

export async function apiGet<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal });
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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${BASE}${path}`, { method: "POST", body: form, signal });
    return await handle<T>(path, res);
  } catch (e) {
    throw e instanceof DOMException && e.name === "AbortError" ? timeoutError(path) : e;
  } finally {
    cancel();
  }
}
