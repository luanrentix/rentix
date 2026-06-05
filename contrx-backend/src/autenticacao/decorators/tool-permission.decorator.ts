import { SetMetadata } from '@nestjs/common';
import type { UserToolPermission } from '../dto/criar-usuario-empresa.dto';

export const TOOL_PERMISSION_KEY = 'toolPermission';

export function RequireToolPermission(permission: UserToolPermission) {
  return SetMetadata(TOOL_PERMISSION_KEY, permission);
}
