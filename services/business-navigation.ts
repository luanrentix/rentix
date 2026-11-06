export const CONFECTIONS_HOME = "/confeccoes";

export function isBusinessRouteAllowed(pathname: string, mode: string) {
  if (mode === "CONFECCOES") {
    return ["/confeccoes", "/vendas", "/configuracoes", "/suporte"].includes(
      pathname,
    );
  }
  return pathname !== "/confeccoes" && pathname !== "/vendas";
}
