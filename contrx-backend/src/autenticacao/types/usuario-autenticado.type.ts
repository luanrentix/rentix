export type UsuarioAutenticado = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  permissions?: unknown;
  actionPermissions?: unknown;
  sessionId?: string;
};
