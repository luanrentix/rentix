import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CriarClienteVendaDto } from './dto/criar-cliente-venda.dto';
import { VendasService } from './vendas.service';

describe('Cliente apenas referência', () => {
  function fixture() {
    const prisma = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      salesCustomer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'customer', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'customer', referenceOnly: false }),
      },
    };
    return {
      prisma,
      service: new VendasService(prisma as unknown as PrismaService),
    };
  }
  const minimal = {
    personType: 'INDIVIDUAL',
    name: 'CLIENTE',
    referenceOnly: true,
  };

  it('aceita somente nome no cadastro de referência, sem CPF ou endereço', async () => {
    const dto = plainToInstance(CriarClienteVendaDto, minimal);
    expect(await validate(dto)).toEqual([]);
    const { service, prisma } = fixture();
    const customer = await service.createCustomer('company', dto);
    expect(customer.referenceOnly).toBe(true);
    expect(customer.document).toBeNull();
    expect(customer.address).toBeNull();
    expect(prisma.salesCustomer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company',
          name: 'CLIENTE',
          referenceOnly: true,
        }),
      }),
    );
  });

  it('mantém documento e endereço obrigatórios no cadastro completo', async () => {
    const errors = await validate(
      plainToInstance(CriarClienteVendaDto, {
        ...minimal,
        referenceOnly: false,
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['document', 'address']),
    );
  });

  it('rejeita nome em branco mesmo quando é referência', async () => {
    const { service } = fixture();
    await expect(
      service.createCustomer('company', { ...minimal, name: '   ' }),
    ).rejects.toThrow('nome');
  });

  it('não permite desmarcar referência mantendo o cadastro incompleto', async () => {
    const { service, prisma } = fixture();
    prisma.salesCustomer.findFirst.mockResolvedValueOnce({
      id: 'customer',
      isSystem: false,
      referenceOnly: true,
      document: null,
      address: null,
      personType: 'INDIVIDUAL',
    });
    await expect(
      service.updateCustomer('company', 'customer', { referenceOnly: false }),
    ).rejects.toThrow('endereço');
    expect(prisma.salesCustomer.updateMany).not.toHaveBeenCalled();
  });

  it('permite concluir o cadastro com CPF e endereço válidos', async () => {
    const { service, prisma } = fixture();
    prisma.salesCustomer.findFirst.mockResolvedValueOnce({
      id: 'customer',
      isSystem: false,
      referenceOnly: true,
      document: null,
      address: null,
      personType: 'INDIVIDUAL',
    });
    await service.updateCustomer('company', 'customer', {
      referenceOnly: false,
      document: '52998224725',
      address: 'RUA TESTE',
    });
    expect(prisma.salesCustomer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer', companyId: 'company', active: true },
        data: expect.objectContaining({
          referenceOnly: false,
          document: '52998224725',
          address: 'RUA TESTE',
        }),
      }),
    );
  });

  it('permite atualizar referência sem transformar campos vazios em erro', async () => {
    const { service, prisma } = fixture();
    prisma.salesCustomer.findFirst.mockResolvedValueOnce({
      id: 'customer',
      isSystem: false,
      referenceOnly: true,
      document: null,
      address: null,
      personType: 'INDIVIDUAL',
    });
    await service.updateCustomer('company', 'customer', {
      referenceOnly: true,
      name: 'NOVO NOME',
      document: '',
      address: '',
      alias: '',
      phone: '',
    });
    expect(prisma.salesCustomer.updateMany).toHaveBeenCalled();
  });
});
