import { useEffect, useState } from "react";
import { apiGet } from "./api";

// One /health request per page load, shared by every caller. A failed check
// isn't cached, so the next mount asks again.
let pending: Promise<boolean> | null = null;

function fetchReadOnly(): Promise<boolean> {
  pending ??= apiGet<{ read_only?: boolean }>("/health").then(
    (h) => h.read_only === true,
    (err) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/** Whether the backend is a read-only deployment (the public demo): true or
 *  false once known, null while loading or if the backend can't be reached.
 *  Callers treat null like true, so the Build pages never flash on the live
 *  site before the answer arrives. */
export function useReadOnly(): boolean | null {
  const [readOnly, setReadOnly] = useState<boolean | null>(null);
  useEffect(() => {
    fetchReadOnly().then(setReadOnly, () => {});
  }, []);
  return readOnly;
}
