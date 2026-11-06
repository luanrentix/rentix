export const toolPermissionOptions = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { key: 'properties', label: 'Bens/Ativos', href: '/imoveis', icon: '🏢' },
  { key: 'people', label: 'Pessoas', href: '/pessoas', icon: '👥' },
  { key: 'contracts', label: 'Contratos', href: '/contratos', icon: '📄' },
  { key: 'financial', label: 'Financeiro', href: '/financeiro', icon: '💰' },
  { key: 'accountsReceivable', label: 'Contas a Receber', href: '/contas-receber', icon: '📥' },
  { key: 'accountsPayable', label: 'Contas a Pagar', href: '/contas-pagar', icon: '📤' },
  { key: 'schedule', label: 'Agenda', href: '/agenda', icon: '📅' },
  { key: 'settings', label: 'Configurações', href: '/configuracoes', icon: '⚙️' },
  { key: 'bank', label: 'Banco', href: '/bancos', icon: '🏦' },
  { key: 'sales', label: 'Vendas', href: '/vendas', icon: '🛍️' },
] as const;

export type ToolPermission = (typeof toolPermissionOptions)[number]['key'];

export function isPrivilegedRole(role?: string | null) {
  return role === 'SYSTEM_OWNER' || role === 'DONO_SISTEMA' || role === 'ADMIN' || role === 'OWNER';
}

export function canAccessTool(
  role: string | undefined | null,
  permissions: string[] | null | undefined,
  toolKey: string,
) {
  if (isPrivilegedRole(role)) return true;
  if (!permissions) return false;
  return permissions.includes(toolKey);
}

export function canPerformAction(user: { role?: string; permissions?: string[] | null; actionPermissions?: string[] | null } | null, module: string, action: string) {
  if (isPrivilegedRole(user?.role)) return true;
  return !!user && canAccessTool(user.role, user.permissions, module) && (user.actionPermissions == null || user.actionPermissions.includes(module + ':' + action));
}
