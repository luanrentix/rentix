export type AppRouteScope = "public" | "auth" | "internal";

export type AppToolRoute = {
  href: string;
  label: string;
  icon: string;
  permissionKey: string;
  scope: AppRouteScope;
  category?: "PRINCIPAL" | "OPERACIONAL" | "FINANCEIRO";
};

export const publicRoutes = ["/"] as const;
export const authRoutes = ["/login"] as const;
export const internalUtilityRoutes = [
  "/configuracoes",
  "/financeiro/relatorios",
  "/suporte",
] as const;

export const internalToolRoutes: AppToolRoute[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "🏠",
    permissionKey: "dashboard",
    scope: "internal",
    category: "PRINCIPAL",
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: "📅",
    permissionKey: "schedule",
    scope: "internal",
    category: "PRINCIPAL",
  },
  {
    label: "Bens/Ativos",
    href: "/imoveis",
    icon: "🏢",
    permissionKey: "properties",
    scope: "internal",
    category: "OPERACIONAL",
  },
  {
    label: "Pessoas",
    href: "/pessoas",
    icon: "👥",
    permissionKey: "people",
    scope: "internal",
    category: "OPERACIONAL",
  },
  {
    label: "Contratos",
    href: "/contratos",
    icon: "📄",
    permissionKey: "contracts",
    scope: "internal",
    category: "OPERACIONAL",
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: "💰",
    permissionKey: "financial",
    scope: "internal",
    category: "FINANCEIRO",
  },
  {
    label: "Contas a Receber",
    href: "/contas-receber",
    icon: "📥",
    permissionKey: "accountsReceivable",
    scope: "internal",
    category: "FINANCEIRO",
  },
  {
    label: "Contas a Pagar",
    href: "/contas-pagar",
    icon: "📤",
    permissionKey: "accountsPayable",
    scope: "internal",
    category: "FINANCEIRO",
  },
  {
    label: "Banco",
    href: "/bancos",
    icon: "🏦",
    permissionKey: "bank",
    scope: "internal",
    category: "FINANCEIRO",
  },
];

export const systemOwnerToolRoutes: AppToolRoute[] = [];

export const toolKeyByHref = Object.fromEntries(
  [...internalToolRoutes, ...systemOwnerToolRoutes].map((route) => [
    route.href,
    route.permissionKey,
  ]),
) as Record<string, string>;

function isExactRoute(pathname: string, routes: readonly string[]) {
  return routes.some((route) => pathname === route);
}

export function isPublicRoute(pathname: string) {
  return isExactRoute(pathname, publicRoutes);
}

export function isAuthRoute(pathname: string) {
  return isExactRoute(pathname, authRoutes);
}

export function isInternalRoute(pathname: string) {
  return isExactRoute(pathname, [
    ...internalToolRoutes.map((route) => route.href),
    ...systemOwnerToolRoutes.map((route) => route.href),
    ...internalUtilityRoutes,
  ]);
}
