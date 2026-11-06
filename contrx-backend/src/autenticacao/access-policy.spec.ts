import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { assertAccess, validateActionPermissions } from './access-policy';
import { ToolPermissionGuard } from './guards/tool-permission.guard';
import { VendasController } from '../vendas/vendas.controller';
import {
  TOOL_ACTION_KEY,
  TOOL_PERMISSION_KEY,
} from './decorators/tool-permission.decorator';

describe('Access policy', () => {
  it('preserves legacy module access and administrative roles', () => {
    expect(() =>
      assertAccess({ role: 'USER', permissions: ['sales'] }, 'sales', 'delete'),
    ).not.toThrow();
    for (const role of ['OWNER', 'ADMIN', 'SYSTEM_OWNER'])
      expect(() => assertAccess({ role }, 'sales', 'delete')).not.toThrow();
  });
  it('denies missing modules even if an action is present', () => {
    expect(() =>
      assertAccess(
        { role: 'USER', permissions: [], actionPermissions: ['sales:delete'] },
        'sales',
        'delete',
      ),
    ).toThrow(ForbiddenException);
  });
  it('distinguishes legacy null from explicit no actions', () => {
    expect(() =>
      assertAccess(
        { role: 'USER', permissions: ['sales'], actionPermissions: [] },
        'sales',
        'view',
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertAccess(
        { role: 'USER', permissions: ['sales'], actionPermissions: null },
        'sales',
        'view',
      ),
    ).not.toThrow();
  });
  it('validates permission keys and rejects fabricated operations', () => {
    expect(() => validateActionPermissions(['sales:admin'])).toThrow();
    expect(() => validateActionPermissions(['unknown:view'])).toThrow();
    expect(validateActionPermissions(['sales:view', 'sales:view'])).toEqual([
      'sales:view',
    ]);
  });
  it('protects cancellation POST routes as delete, not create', () => {
    for (const method of ['cancelOrder', 'discardOrder', 'reverseOrder'])
      expect(
        Reflect.getMetadata(
          TOOL_ACTION_KEY,
          VendasController.prototype[method],
        ),
      ).toBe('delete');
    expect(Reflect.getMetadata(TOOL_PERMISSION_KEY, VendasController)).toBe(
      'sales',
    );
  });
  it('applies handler action metadata in the real tool guard', () => {
    const guard = new ToolPermissionGuard(new Reflector());
    const context = {
      getHandler: () => VendasController.prototype.cancelOrder,
      getClass: () => VendasController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            role: 'USER',
            permissions: ['sales'],
            actionPermissions: ['sales:create', 'sales:view'],
          },
        }),
      }),
    };
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
  });
});
