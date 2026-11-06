import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

describe('Cadastro de vendedores PF/PJ', () => {
  function fixture() {
    const db = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      salesSeller: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ id: 'seller', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return { db, service: new VendasService(db as unknown as PrismaService) };
  }
  it.each(['529.982.247-25', '55.942.978/0001-64'])(
    'normaliza e verifica CPF/CNPJ: %s',
    async (document) => {
      const { db, service } = fixture();
      await expect(
        service.checkSellerDocument('A', document, 'editado'),
      ).resolves.toEqual({ exists: false });
      expect(db.salesSeller.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'A',
          document: document.replace(/\D/g, ''),
          id: { not: 'editado' },
        },
        select: { id: true },
      });
    },
  );
  it.each(['00000000000', '11111111111111', '55942978000165', '52998224724'])(
    'bloqueia documento invalido: %s',
    async (document) => {
      const { db, service } = fixture();
      await expect(
        service.createSeller('A', { name: 'VENDEDOR', document }),
      ).rejects.toThrow('válido');
      expect(db.salesSeller.create).not.toHaveBeenCalled();
    },
  );
  it('grava pessoa juridica, contatos e endereco mantendo comissao', async () => {
    const { db, service } = fixture();
    await service.createSeller('A', {
      personType: 'COMPANY',
      name: 'Empresa',
      document: '55.942.978/0001-64',
      alias: 'Loja',
      phone2: '9233334444',
      address: 'Rua exemplo',
      city: 'Manaus',
      state: 'am',
      commission: 5,
    });
    expect(db.salesSeller.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'A',
        personType: 'COMPANY',
        document: '55942978000164',
        alias: 'LOJA',
        address: 'RUA EXEMPLO',
        city: 'MANAUS',
        state: 'AM',
        commission: 5,
      }),
    });
  });
  it('bloqueia duplicidade inclusive vendedor inativo da mesma empresa', async () => {
    const { db, service } = fixture();
    db.salesSeller.findFirst.mockResolvedValue({ id: 'inativo' });
    await expect(
      service.createSeller('A', { name: 'NOVO', document: '52998224725' }),
    ).rejects.toThrow('CPF/CNPJ');
    expect(db.salesSeller.create).not.toHaveBeenCalled();
  });
  it('trata concorrencia rejeitada pelo indice unico do banco', async () => {
    const { db, service } = fixture();
    db.salesSeller.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicado', {
        code: 'P2002',
        clientVersion: '7',
      }),
    );
    await expect(
      service.createSeller('A', { name: 'NOVO', document: '55942978000164' }),
    ).rejects.toThrow('CPF/CNPJ');
  });
  it('nao aceita CNPJ no tipo pessoa fisica', async () => {
    const { service } = fixture();
    await expect(
      service.createSeller('A', {
        personType: 'INDIVIDUAL',
        name: 'NOVO',
        document: '55942978000164',
      }),
    ).rejects.toThrow('tipo de pessoa');
  });
  it('permite editar o proprio documento e limpar contatos opcionais', async () => {
    const { db, service } = fixture();
    db.salesSeller.findFirst
      .mockResolvedValueOnce({
        id: 'seller',
        document: '52998224725',
        personType: 'INDIVIDUAL',
      })
      .mockResolvedValueOnce(null);
    await service.updateSeller('A', 'seller', {
      document: '52998224725',
      phone: null,
      email: null,
    } as never);
    expect(db.salesSeller.updateMany).toHaveBeenCalledWith({
      where: { id: 'seller', companyId: 'A', active: true },
      data: expect.objectContaining({
        document: '52998224725',
        phone: null,
        email: null,
      }),
    });
  });
});
