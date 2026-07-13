type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

// Pembungkus tipis fetch: cookie sesi otomatis ikut (same-origin), dan kalau
// server balas 401 (sesi habis/tidak valid), pengguna otomatis dikembalikan
// ke halaman login lewat handler yang didaftarkan AuthContext.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: "same-origin" });
  if (res.status === 401 && unauthorizedHandler) {
    unauthorizedHandler();
  }
  return res;
}
