import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';
import { VendasController } from './vendas.controller';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

describe('Cadastro de fornecedores', () => {
  function fixture() {
    const prisma = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      salesSupplier: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => data),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return {
      prisma,
      service: new VendasService(prisma as unknown as PrismaService),
    };
  }

  it('grava consulta com CNPJ alfanumérico preservando letras e permite campos opcionais vazios', async () => {
    const { service } = fixture();
    const result = await service.createSupplier('empresa', {
      name: ' fornecedor ',
      document: 'AB.123.456/0001-00',
      phone: null,
      email: null,
      address: null,
    } as never);
    expect(result).toMatchObject({
      companyId: 'empresa',
      name: 'FORNECEDOR',
      document: 'AB123456000100',
      phone: null,
      email: null,
    });
  });

  it('permite limpar documento, telefone e e-mail na edição e mantém escopo da empresa', async () => {
    const { service, prisma } = fixture();
    prisma.salesSupplier.findFirst.mockResolvedValueOnce({
      id: 'fornecedor',
      document: '12345678901',
    });
    await service.updateSupplier('empresa', 'fornecedor', {
      document: null,
      phone: null,
      email: null,
    } as never);
    expect(prisma.salesSupplier.updateMany).toHaveBeenCalledWith({
      where: { id: 'fornecedor', companyId: 'empresa', active: true },
      data: { document: null, phone: null, email: null },
    });
  });

  it('rejeita nome em branco', async () => {
    const { service, prisma } = fixture();
    await expect(
      service.createSupplier('empresa', { name: ' ' }),
    ).rejects.toThrow('nome');
    prisma.salesSupplier.findFirst.mockResolvedValueOnce({
      id: 'fornecedor',
    });
    await expect(
      service.updateSupplier('empresa', 'fornecedor', { name: ' ' }),
    ).rejects.toThrow('nome');
    expect(prisma.salesSupplier.create).not.toHaveBeenCalled();
    expect(prisma.salesSupplier.updateMany).not.toHaveBeenCalled();
  });

  it('encaminha a consulta de fornecedor ao mesmo serviço de CNPJ usando a empresa autenticada', async () => {
    const { service } = fixture();
    const lookup = jest
      .spyOn(service, 'lookupCompanyByCnpj')
      .mockResolvedValue({ name: 'FORNECEDOR' } as never);
    await new VendasController(service).lookupSupplierCompany(
      '55684468000134',
      { companyId: 'empresa' } as UsuarioAutenticado,
    );
    expect(lookup).toHaveBeenCalledWith('empresa', '55684468000134');
  });
});
