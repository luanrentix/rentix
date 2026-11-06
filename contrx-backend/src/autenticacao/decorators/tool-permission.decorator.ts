import { SetMetadata } from '@nestjs/common';
import type { UserToolPermission } from '../dto/criar-usuario-empresa.dto';

export const TOOL_PERMISSION_KEY = 'toolPermission';
export const TOOL_ACTION_KEY = 'toolAction';
export function RequireToolAction(
  action:
    'view' | 'create' | 'edit' | 'delete' | 'print' | 'export' | 'special',
) {
  return SetMetadata(TOOL_ACTION_KEY, action);
}

export function RequireToolPermission(permission: UserToolPermission) {
  return SetMetadata(TOOL_PERMISSION_KEY, permission);
}
