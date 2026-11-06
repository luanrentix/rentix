import { canPerformAction } from "./tool-permissions";
import { apiFetch } from "./api";
// UI printing cannot prevent a user copying data already delivered to their browser.
// The server independently enforces the action on protected application operations.
export async function authorizeAction(module: string, action: string) {
  return apiFetch<{ allowed: boolean }>(
    `/autenticacao/acesso/${encodeURIComponent(module)}/${encodeURIComponent(action)}`,
    { skipCache: true },
  );
}

export function canPrintLocally(
  module: string,
  onError: (message: string) => void,
): boolean {
  try {
    const raw = localStorage.getItem("contrx_user");
    const user = raw ? JSON.parse(raw) : null;
    if (canPerformAction(user, module, "print")) return true;
  } catch {
    /* No authenticated user. */
  }
  onError("Usuário sem permissão para imprimir.");
  return false;
}
