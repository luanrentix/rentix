import 'reflect-metadata';
import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

describe('Consulta pública de CNPJ em Vendas', () => {
  const cnpj = '55942978000164';
  const registration = {
    cnpj,
    razao_social: 'EMPRESA DE TESTE',
    nome_fantasia: 'FANTASIA',
    cep: '69000000',
    descricao_tipo_de_logradouro: 'RUA',
    logradouro: 'EXEMPLO',
    numero: '10',
    complemento: 'SALA 2',
    bairro: 'CENTRO',
    municipio: 'MANAUS',
    uf: 'AM',
    ddd_telefone_1: '9233334444',
    email: 'teste@example.com',
  };
  let service: VendasService;
  let request: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new VendasService({
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
    } as unknown as PrismaService);
    request = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());

  it('preenche os campos com os dados válidos do primeiro provedor', async () => {
    request.mockResolvedValueOnce(Response.json(registration));
    await expect(service.lookupCompanyByCnpj('company', cnpj)).resolves.toEqual(
      {
        name: registration.razao_social,
        alias: registration.nome_fantasia,
        document: cnpj,
        zipCode: registration.cep,
        address: 'RUA EXEMPLO',
        number: '10',
        complement: 'SALA 2',
        neighborhood: 'CENTRO',
        city: 'MANAUS',
        state: 'AM',
        phone: '9233334444',
        email: registration.email,
      },
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([403, 429, 500, 503, 404])(
    'tenta a alternativa quando o primeiro provedor responde HTTP %s',
    async (status) => {
      request
        .mockResolvedValueOnce(Response.json({}, { status }))
        .mockResolvedValueOnce(Response.json(registration));
      const result = await service.lookupCompanyByCnpj('company', cnpj);
      expect(result.name).toBe(registration.razao_social);
      expect(request.mock.calls[1][0]).toBe(`https://minhareceita.org/${cnpj}`);
    },
  );

  it('tenta a alternativa após timeout ou falha de conexão', async () => {
    request
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(Response.json(registration));
    await expect(
      service.lookupCompanyByCnpj('company', cnpj),
    ).resolves.toHaveProperty('name', registration.razao_social);
  });

  it.each([
    {},
    [],
    null,
    { ...registration, razao_social: '' },
    { ...registration, cnpj: '00000000000000' },
  ])(
    'não aceita resposta incompleta ou de outro documento: %j',
    async (data) => {
      request
        .mockResolvedValueOnce(Response.json(data))
        .mockResolvedValueOnce(Response.json(registration));
      await expect(
        service.lookupCompanyByCnpj('company', cnpj),
      ).resolves.toHaveProperty('name', registration.razao_social);
      expect(request).toHaveBeenCalledTimes(2);
    },
  );

  it('diferencia CNPJ não encontrado de indisponibilidade', async () => {
    request.mockResolvedValue(Response.json({}, { status: 404 }));
    await expect(service.lookupCompanyByCnpj('company', cnpj)).rejects.toThrow(
      'CNPJ não encontrado',
    );
  });

  it('usa a ReceitaWS quando os provedores anteriores nao respondem com cadastro valido', async () => {
    request
      .mockResolvedValueOnce(Response.json({}, { status: 403 }))
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({
          cnpj,
          nome: registration.razao_social,
          fantasia: 'FANTASIA',
          telefone: '9233334444',
          logradouro: 'RUA EXEMPLO',
          numero: '10',
        }),
      );
    await expect(
      service.lookupCompanyByCnpj('company', cnpj),
    ).resolves.toMatchObject({
      document: cnpj,
      name: registration.razao_social,
      phone: '9233334444',
      address: 'RUA EXEMPLO',
    });
    expect(request.mock.calls[2][0]).toBe(
      `https://receitaws.com.br/v1/cnpj/${cnpj}`,
    );
  });

  it('distingue indisponibilidade de cadastro nao localizado no caso do print', async () => {
    request
      .mockResolvedValueOnce(Response.json({}, { status: 403 }))
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json(
          { status: 'ERROR', message: 'not in cache' },
          { status: 404 },
        ),
      );
    await expect(
      service.lookupCompanyByCnpj('company', '77779710000196'),
    ).rejects.toThrow('CNPJ não encontrado nas bases consultadas');
  });

  it('nao aceita cadastro de outro CNPJ na fonte alternativa', async () => {
    request
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ cnpj: '00000000000000', nome: 'OUTRA EMPRESA' }),
      );
    await expect(service.lookupCompanyByCnpj('company', cnpj)).rejects.toThrow(
      'Não foi possível consultar',
    );
  });

  it('permite preenchimento manual quando os dois serviços falham e mantém a acentuação correta', async () => {
    request.mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(service.lookupCompanyByCnpj('company', cnpj)).rejects.toThrow(
      'Não foi possível consultar o CNPJ agora. Tente novamente ou preencha os dados manualmente.',
    );
  });

  it('não chama provedores para CNPJ inválido', async () => {
    await expect(
      service.lookupCompanyByCnpj('company', '00000000000000'),
    ).rejects.toThrow('CNPJ válido');
    expect(request).not.toHaveBeenCalled();
  });
});
