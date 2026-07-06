export type AppRouteScope = "public" | "auth" | "internal";

export type AppToolRoute = {
  href: string;
  label: string;
  icon: string;
  permissionKey: string;
  scope: AppRouteScope;
};

export const publicRoutes = ["/"] as const;
export const authRoutes = ["/login"] as const;
export const internalUtilityRoutes = [
  "/configuracoes",
  "/financeiro/relatorios",
] as const;

export const internalToolRoutes: AppToolRoute[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "🏠",
    permissionKey: "dashboard",
    scope: "internal",
  },
  {
    label: "Bens/Ativos",
    href: "/imoveis",
    icon: "🏢",
    permissionKey: "properties",
    scope: "internal",
  },
  {
    label: "Pessoas",
    href: "/pessoas",
    icon: "👥",
    permissionKey: "people",
    scope: "internal",
  },
  {
    label: "Contratos",
    href: "/contratos",
    icon: "📄",
    permissionKey: "contracts",
    scope: "internal",
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: "💰",
    permissionKey: "financial",
    scope: "internal",
  },
  {
    label: "Contas a Receber",
    href: "/contas-receber",
    icon: "📥",
    permissionKey: "accountsReceivable",
    scope: "internal",
  },
  {
    label: "Contas a Pagar",
    href: "/contas-pagar",
    icon: "📤",
    permissionKey: "accountsPayable",
    scope: "internal",
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: "📅",
    permissionKey: "schedule",
    scope: "internal",
  },
  {
    label: "Banco",
    href: "/bancos",
    icon: "🏦",
    permissionKey: "bank",
    scope: "internal",
  },
];

export const systemOwnerToolRoutes: AppToolRoute[] = [
  {
    label: "Admin",
    href: "/admin",
    icon: "SYS",
    permissionKey: "admin",
    scope: "internal",
  },
];

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
