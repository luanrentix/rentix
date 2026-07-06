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
] as const;

export type ToolPermission = (typeof toolPermissionOptions)[number]['key'];

export function isPrivilegedRole(role?: string | null) {
  return role === 'SYSTEM_OWNER' || role === 'DONO_SISTEMA' || role === 'ADMIN';
}

export function canAccessTool(
  role: string | undefined | null,
  permissions: string[] | null | undefined,
  toolKey: string,
) {
  if (isPrivilegedRole(role)) return true;
  if (!permissions) return true;
  return permissions.includes(toolKey);
}
