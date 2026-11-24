export const CONFECTIONS_HOME = "/confeccoes";

export function isBusinessRouteAllowed(pathname: string, mode: string) {
  if (mode === "CONFECCOES") {
    return ["/inicio", "/confeccoes", "/vendas", "/estoque", "/configuracoes", "/suporte"].includes(
      pathname,
    );
  }
  return pathname !== "/confeccoes" && pathname !== "/vendas";
}
