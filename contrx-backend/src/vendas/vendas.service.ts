import { scalarText } from '../common/text-normalization';
import { orderListFilters } from './order-list-filter';
import { validateCardPayments } from './card-payment';
import { resolveSalesItemPrice } from './item-pricing';
import { gtinAliases, isValidGtin } from './gtin';
import { customerCreditBalance } from './credit-ledger';
import { orderOrigin } from './order-history';
import {
  formatCatalogProduct,
  productCatalogInclude,
  syncGridProducts,
} from './grid-products';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarProdutoVendaDto } from './dto/atualizar-produto-venda.dto';
import { AtualizarClienteVendaDto } from './dto/atualizar-cliente-venda.dto';
import { CriarClienteVendaDto } from './dto/criar-cliente-venda.dto';
import { CriarProdutoVendaDto } from './dto/criar-produto-venda.dto';
import { CriarVendedorVendaDto } from './dto/criar-vendedor-venda.dto';
import { AtualizarVendedorVendaDto } from './dto/atualizar-vendedor-venda.dto';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { CriarFornecedorVendaDto } from './dto/criar-fornecedor-venda.dto';
import { AtualizarFornecedorVendaDto } from './dto/atualizar-fornecedor-venda.dto';
import { CriarClassificacaoProdutoDto } from './dto/criar-classificacao-produto.dto';
import { CriarGradeProdutoDto } from './dto/criar-grade-produto.dto';
import {
  toSalesPriceCompositionTemplate,
  validateSalesPriceComposition,
} from './price-composition';

const paymentSignature = (details: Record<string, number> | null) =>
  JSON.stringify(
    Object.entries(details ?? {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

function hasValidCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length: number) => {
    const sum = value
      .slice(0, length)
      .split('')
      .reduce(
        (total, char, index) => total + Number(char) * (length + 1 - index),
        0,
      );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}

function hasValidCnpj(value: string) {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^([A-Z0-9])\1{13}$/.test(value))
    return false;
  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base
      .split('')
      .reduce(
        (total, char, index) =>
          total + (char.charCodeAt(0) - 48) * weights[index],
        0,
      );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculateDigit(
    value.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const second = calculateDigit(
    value.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return first === Number(value[12]) && second === Number(value[13]);
}

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  async listReceivingAccounts(companyId: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, companyId);
      const account = await tx.bankAccount.findFirst({
        where: {
          companyId,
          name: 'VENDAS - PADRAO AUTOMATICO',
          type: 'CASH',
          active: true,
          deletedAt: null,
        },
      });
      const standardAccount =
        account ??
        (await tx.bankAccount.create({
          data: {
            companyId,
            name: 'VENDAS - PADRAO AUTOMATICO',
            type: 'CASH',
          },
        }));
      return [
        {
          id: standardAccount.id,
          name: standardAccount.name,
          type: standardAccount.type,
        },
      ];
    });
  }

  async listCustomers(companyId: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.salesCustomer.findMany({
      where: { companyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async initializeModule(companyId: string) {
    await this.ensureConfectionery(companyId);
    for (const [systemKey, name] of [
      ['CONSUMIDOR_FINAL', 'CONSUMIDOR FINAL'],
      ['CLIENTE_CARTAO', 'CLIENTE CARTÃO'],
    ]) {
      await this.prisma.salesCustomer.upsert({
        where: { companyId_systemKey: { companyId, systemKey } },
        create: {
          companyId,
          personType: 'INDIVIDUAL',
          name,
          isSystem: true,
          systemKey,
        },
        update: {},
      });
    }
    return this.prisma.salesCustomer.findMany({
      where: { companyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async checkCustomerDocument(
    companyId: string,
    document: string,
    excludeId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    const normalized = this.normalizeDocument(document);
    if (!normalized || !this.isValidCustomerDocument(normalized))
      throw new BadRequestException('Informe um CPF ou CNPJ válido.');
    const customer = await this.prisma.salesCustomer.findFirst({
      where: {
        companyId,
        document: normalized,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return { exists: Boolean(customer) };
  }

  async lookupCompanyByCnpj(companyId: string, cnpj: string) {
    await this.ensureConfectionery(companyId);
    const normalized = this.normalizeDocument(cnpj);
    if (!normalized || !hasValidCnpj(normalized))
      throw new BadRequestException('Informe um CNPJ válido.');
    let data: Record<string, unknown> | undefined;
    let notFound = 0;
    for (const url of [
      `https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(normalized)}`,
      `https://minhareceita.org/${encodeURIComponent(normalized)}`,
      `https://receitaws.com.br/v1/cnpj/${encodeURIComponent(normalized)}`,
    ]) {
      try {
        const response = await this.fetchPublicJson(url);
        if (
          !response ||
          typeof response !== 'object' ||
          Array.isArray(response)
        )
          throw new ServiceUnavailableException();
        const raw = response as Record<string, unknown>;
        if (raw.status === 'ERROR') {
          if (
            typeof raw.message === 'string' &&
            /not in cache|não encontrado|nao encontrado|not found/i.test(
              raw.message,
            )
          )
            throw new NotFoundException();
          throw new ServiceUnavailableException();
        }
        const candidate =
          typeof raw.nome === 'string' && raw.cnpj != null
            ? {
                ...raw,
                razao_social: raw.nome,
                nome_fantasia: raw.fantasia,
                ddd_telefone_1: raw.telefone,
              }
            : raw;
        if (
          typeof candidate.razao_social !== 'string' ||
          !candidate.razao_social.trim() ||
          (candidate.cnpj != null &&
            this.normalizeDocument(scalarText(candidate.cnpj)) !== normalized)
        )
          throw new ServiceUnavailableException();
        data = candidate;
        break;
      } catch (error) {
        if (error instanceof NotFoundException) notFound++;
      }
    }
    if (!data) {
      if (notFound > 0)
        throw new NotFoundException(
          'CNPJ não encontrado nas bases consultadas. Confira o número; cadastros recentes podem ainda não estar disponíveis. Você pode preencher os dados manualmente.',
        );
      throw new ServiceUnavailableException(
        'Não foi possível consultar o CNPJ agora. Tente novamente ou preencha os dados manualmente.',
      );
    }
    return {
      name: typeof data.razao_social === 'string' ? data.razao_social : '',
      alias: typeof data.nome_fantasia === 'string' ? data.nome_fantasia : '',
      document: normalized,
      zipCode: typeof data.cep === 'string' ? data.cep : '',
      address: [data.descricao_tipo_de_logradouro, data.logradouro]
        .filter((part) => typeof part === 'string' && part.trim())
        .join(' '),
      number: typeof data.numero === 'string' ? data.numero : '',
      complement: typeof data.complemento === 'string' ? data.complemento : '',
      neighborhood: typeof data.bairro === 'string' ? data.bairro : '',
      city: typeof data.municipio === 'string' ? data.municipio : '',
      state: typeof data.uf === 'string' ? data.uf : '',
      phone: typeof data.ddd_telefone_1 === 'string' ? data.ddd_telefone_1 : '',
      email: typeof data.email === 'string' ? data.email : '',
    };
  }

  async lookupAddressByZipCode(companyId: string, zipCode: string) {
    await this.ensureConfectionery(companyId);
    const normalized = zipCode.replace(/\D/g, '');
    if (!/^\d{8}$/.test(normalized))
      throw new BadRequestException('Informe um CEP com 8 dígitos.');
    let data: Record<string, unknown>;
    try {
      data = (await this.fetchPublicJson(
        `https://viacep.com.br/ws/${normalized}/json/`,
      )) as Record<string, unknown>;
      if (data.erro === true || data.erro === 'true')
        throw new NotFoundException('CEP não encontrado.');
    } catch (primaryError) {
      if (primaryError instanceof NotFoundException) throw primaryError;
      try {
        data = (await this.fetchPublicJson(
          `https://brasilapi.com.br/api/cep/v2/${normalized}`,
        )) as Record<string, unknown>;
      } catch {
        throw new ServiceUnavailableException(
          'Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente e gravar o cliente.',
        );
      }
    }
    return {
      zipCode: typeof data.cep === 'string' ? data.cep : normalized,
      address:
        typeof data.logradouro === 'string'
          ? data.logradouro
          : typeof data.street === 'string'
            ? data.street
            : '',
      complement: typeof data.complemento === 'string' ? data.complemento : '',
      neighborhood:
        typeof data.bairro === 'string'
          ? data.bairro
          : typeof data.neighborhood === 'string'
            ? data.neighborhood
            : '',
      city:
        typeof data.localidade === 'string'
          ? data.localidade
          : typeof data.city === 'string'
            ? data.city
            : '',
      state:
        typeof data.uf === 'string'
          ? data.uf
          : typeof data.state === 'string'
            ? data.state
            : '',
    };
  }

  private async fetchPublicJson(url: string): Promise<unknown> {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404)
        throw new NotFoundException(
          'Cadastro não encontrado na consulta pública.',
        );
      if (!response.ok)
        throw new ServiceUnavailableException(
          'O serviço de consulta está temporariamente indisponível.',
        );
      return await response.json();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      throw new ServiceUnavailableException(
        'Não foi possível conectar ao serviço de consulta. Tente novamente.',
      );
    }
  }

  async createCustomer(companyId: string, data: CriarClienteVendaDto) {
    await this.ensureConfectionery(companyId);
    if (!data.name?.trim())
      throw new BadRequestException('Informe o nome do cliente.');
    if (
      ['CONSUMIDOR FINAL', 'CLIENTE CARTAO'].includes(
        data.name
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleUpperCase('pt-BR'),
      )
    )
      throw new BadRequestException(
        'Este nome é reservado para um cadastro do sistema.',
      );
    if (!data.referenceOnly && !data.address?.trim())
      throw new BadRequestException('O endereço do cliente é obrigatório.');
    if (!data.referenceOnly || this.normalizeDocument(data.document)) {
      this.validateCustomerDocument(data.personType, data.document);
      await this.assertCustomerDocumentAvailable(
        companyId,
        this.normalizeDocument(data.document)!,
      );
    }
    try {
      return await this.prisma.salesCustomer.create({
        data: this.customerData(companyId, data),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe um cliente com este CPF/CNPJ.',
        );
      }
      throw error;
    }
  }

  async updateCustomer(
    companyId: string,
    id: string,
    data: AtualizarClienteVendaDto,
  ) {
    await this.ensureConfectionery(companyId);
    const existing = await this.prisma.salesCustomer.findFirst({
      where: { id, companyId, active: true },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado.');
    if (existing.isSystem)
      throw new ForbiddenException('Este cadastro é protegido pelo sistema.');
    if (data.name !== undefined && !data.name.trim())
      throw new BadRequestException('Informe o nome do cliente.');
    if (
      data.name &&
      ['CONSUMIDOR FINAL', 'CLIENTE CARTAO'].includes(
        data.name
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleUpperCase('pt-BR'),
      )
    )
      throw new BadRequestException(
        'Este nome é reservado para um cadastro do sistema.',
      );
    const referenceOnly = data.referenceOnly ?? existing.referenceOnly;
    if (
      !referenceOnly &&
      !(data.address !== undefined ? data.address : existing.address)?.trim()
    )
      throw new BadRequestException('O endereço do cliente é obrigatório.');
    const document =
      data.document !== undefined ? data.document : existing.document;
    if (!referenceOnly || this.normalizeDocument(document)) {
      this.validateCustomerDocument(
        data.personType || existing.personType,
        document || undefined,
      );
      await this.assertCustomerDocumentAvailable(
        companyId,
        this.normalizeDocument(document)!,
        id,
      );
    }
    let result;
    try {
      result = await this.prisma.salesCustomer.updateMany({
        where: { id, companyId, active: true },
        data: {
          ...(data.referenceOnly !== undefined
            ? { referenceOnly: data.referenceOnly }
            : {}),
          ...(data.personType !== undefined
            ? { personType: data.personType }
            : {}),
          ...(data.name !== undefined
            ? { name: data.name.trim().toLocaleUpperCase('pt-BR') }
            : {}),
          ...(data.alias !== undefined
            ? { alias: data.alias?.trim().toLocaleUpperCase('pt-BR') || null }
            : {}),
          ...(data.document !== undefined
            ? { document: this.normalizeDocument(data.document) }
            : {}),
          ...(data.identityNumber !== undefined
            ? {
                identityNumber:
                  data.identityNumber?.trim().toLocaleUpperCase('pt-BR') ||
                  null,
              }
            : {}),
          ...(data.issuingAuthority !== undefined
            ? {
                issuingAuthority:
                  data.issuingAuthority?.trim().toUpperCase() || null,
              }
            : {}),
          ...(data.birthDate !== undefined
            ? {
                birthDate: data.birthDate
                  ? new Date(`${data.birthDate}T00:00:00.000Z`)
                  : null,
              }
            : {}),
          ...(data.sex !== undefined ? { sex: data.sex || null } : {}),
          ...(data.email !== undefined
            ? { email: data.email?.trim().toLowerCase() || null }
            : {}),
          ...(data.phone !== undefined
            ? { phone: data.phone?.trim() || null }
            : {}),
          ...(data.phone2 !== undefined
            ? { phone2: data.phone2?.trim() || null }
            : {}),
          ...(data.zipCode !== undefined
            ? { zipCode: data.zipCode?.trim() || null }
            : {}),
          ...(data.address !== undefined
            ? {
                address:
                  data.address?.trim().toLocaleUpperCase('pt-BR') || null,
              }
            : {}),
          ...(data.number !== undefined
            ? { number: data.number?.trim().toLocaleUpperCase('pt-BR') || null }
            : {}),
          ...(data.complement !== undefined
            ? {
                complement:
                  data.complement?.trim().toLocaleUpperCase('pt-BR') || null,
              }
            : {}),
          ...(data.neighborhood !== undefined
            ? {
                neighborhood:
                  data.neighborhood?.trim().toLocaleUpperCase('pt-BR') || null,
              }
            : {}),
          ...(data.city !== undefined
            ? { city: data.city?.trim().toLocaleUpperCase('pt-BR') || null }
            : {}),
          ...(data.state !== undefined
            ? { state: data.state?.trim().toUpperCase() || null }
            : {}),
          ...(data.notes !== undefined
            ? { notes: data.notes?.trim().toLocaleUpperCase('pt-BR') || null }
            : {}),
          ...(data.creditLimit !== undefined
            ? { creditLimit: data.creditLimit }
            : {}),
          ...(data.creditDays !== undefined
            ? { creditDays: data.creditDays || null }
            : {}),
          ...(data.creditBlocked !== undefined
            ? { creditBlocked: data.creditBlocked }
            : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe um cliente com este CPF/CNPJ.',
        );
      }
      throw error;
    }
    if (!result.count) throw new NotFoundException('Cliente não encontrado.');
    return this.prisma.salesCustomer.findFirst({
      where: { id, companyId, active: true },
    });
  }

  async deleteCustomer(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockCompany(tx, companyId);
        const customer = await tx.salesCustomer.findFirst({
          where: { id, companyId },
        });
        if (!customer) throw new NotFoundException('Cliente não encontrado.');
        if (customer.isSystem)
          throw new ForbiddenException(
            'Este cadastro é protegido pelo sistema.',
          );
        if (
          (await tx.salesOrder.count({
            where: { companyId, customerId: id },
          })) ||
          (await tx.salesCustomerCredit.count({
            where: { companyId, customerId: id },
          })) ||
          (await tx.salesCreditAdjustment.count({
            where: { companyId, customerId: id },
          }))
        )
          throw new BadRequestException(
            'Este cliente não pode ser excluído porque possui venda, condicional, orçamento, pedido, troca ou outra movimentação. Utilize a opção Inativar.',
          );
        await tx.systemFile.deleteMany({
          where: { companyId, entityType: 'OTHER', entityId: id },
        });
        const result = await tx.salesCustomer.deleteMany({
          where: { id, companyId, isSystem: false },
        });
        if (!result.count)
          throw new NotFoundException('Cliente não encontrado.');
        return { success: true };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  async archiveCustomer(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    const existing = await this.prisma.salesCustomer.findFirst({
      where: { id, companyId, active: true },
      select: { isSystem: true },
    });
    if (existing?.isSystem)
      throw new ForbiddenException(
        'Este cadastro do sistema não pode ser inativado.',
      );
    const result = await this.prisma.salesCustomer.updateMany({
      where: { id, companyId, active: true },
      data: { active: false },
    });
    if (!result.count) throw new NotFoundException('Cliente não encontrado.');
    return { success: true };
  }

  private customerData(companyId: string, data: CriarClienteVendaDto) {
    return {
      companyId,
      referenceOnly: data.referenceOnly ?? false,
      personType: data.personType,
      name: data.name.trim().toLocaleUpperCase('pt-BR'),
      alias: data.alias?.trim().toLocaleUpperCase('pt-BR') || null,
      document: this.normalizeDocument(data.document),
      identityNumber:
        data.identityNumber?.trim().toLocaleUpperCase('pt-BR') || null,
      issuingAuthority: data.issuingAuthority?.trim().toUpperCase() || null,
      birthDate: data.birthDate
        ? new Date(`${data.birthDate}T00:00:00.000Z`)
        : null,
      sex: data.sex || null,
      email: data.email?.trim().toLowerCase() || null,
      phone: data.phone?.trim() || null,
      phone2: data.phone2?.trim() || null,
      zipCode: data.zipCode?.trim() || null,
      address: data.address?.trim().toLocaleUpperCase('pt-BR') || null,
      number: data.number?.trim().toLocaleUpperCase('pt-BR') || null,
      complement: data.complement?.trim().toLocaleUpperCase('pt-BR') || null,
      neighborhood:
        data.neighborhood?.trim().toLocaleUpperCase('pt-BR') || null,
      city: data.city?.trim().toLocaleUpperCase('pt-BR') || null,
      state: data.state?.trim().toUpperCase() || null,
      notes: data.notes?.trim().toLocaleUpperCase('pt-BR') || null,
      creditLimit: data.creditLimit ?? 0,
      creditDays: data.creditDays || null,
      creditBlocked: data.creditBlocked ?? false,
    };
  }

  private validateCustomerDocument(
    personType: string,
    document?: string | null,
  ) {
    const normalized = this.normalizeDocument(document);
    if (
      !normalized ||
      (personType === 'COMPANY'
        ? !hasValidCnpj(normalized)
        : !hasValidCpf(normalized))
    ) {
      throw new BadRequestException(
        personType === 'COMPANY'
          ? 'Informe um CNPJ com 14 dígitos.'
          : 'Informe um CPF com 11 dígitos.',
      );
    }
  }

  private isValidCustomerDocument(document: string) {
    return document.length === 11
      ? hasValidCpf(document)
      : document.length === 14 && hasValidCnpj(document);
  }

  private async assertCustomerDocumentAvailable(
    companyId: string,
    document: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.salesCustomer.findFirst({
      where: {
        companyId,
        document,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate)
      throw new BadRequestException('Já existe um cliente com este CPF/CNPJ.');
  }

  private normalizeDocument(document?: string | null) {
    const normalized = document?.replace(/[^\da-z]/gi, '').toUpperCase() || '';
    return normalized || null;
  }

  async listProducts(companyId: string) {
    await this.ensureConfectionery(companyId);
    const products = await this.prisma.salesProduct.findMany({
      where: { companyId },
      include: productCatalogInclude,
      orderBy: { name: 'asc' },
    });
    if (!products.length) return [];
    const photos = await this.prisma.systemFile.findMany({
      where: {
        companyId,
        entityType: 'OTHER',
        type: 'IMAGE',
        entityId: { in: products.map((product) => product.id) },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      distinct: ['entityId'],
      select: { entityId: true, url: true },
    });
    const byProduct = new Map(
      photos.map((photo) => [photo.entityId, photo.url]),
    );
    return products.map((product) => ({
      ...formatCatalogProduct(product),
      photoUrl:
        byProduct.get(product.id) ??
        (product.parentProductId
          ? byProduct.get(product.parentProductId)
          : null) ??
        null,
    }));
  }

  async getProductPriceComposition(companyId: string, productId: string) {
    await this.ensureConfectionery(companyId);
    const product = await this.prisma.salesProduct.findFirst({
      where: { id: productId, companyId },
      select: {
        priceComposition: true,
        priceHistory: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (
      product.priceComposition &&
      !validateSalesPriceComposition(product.priceComposition)
    )
      throw new ServiceUnavailableException(
        'A composição salva possui formato inválido. Reconfigure os parâmetros antes de salvar novamente.',
      );
    return {
      composition: product.priceComposition,
      priceUpdatedAt: product.priceHistory[0]?.createdAt.toISOString() ?? null,
    };
  }

  async saveProductPriceComposition(
    companyId: string,
    productId: string,
    actorId: string,
    composition: unknown,
  ) {
    await this.ensureConfectionery(companyId);
    if (!validateSalesPriceComposition(composition))
      throw new BadRequestException(
        'Confira os parâmetros da composição de preços.',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT set_config('contrx.price_actor_id', ${actorId}, true),
               set_config('contrx.price_origin', ${'COMPOSICAO_PRECOS'}, true)
      `;
      const updated = await tx.salesProduct.updateMany({
        where: { id: productId, companyId },
        data: { priceComposition: composition },
      });
      if (!updated.count)
        throw new NotFoundException('Produto não encontrado.');
      const saved = await tx.salesProduct.findFirstOrThrow({
        where: { id: productId, companyId },
        select: {
          priceComposition: true,
          priceHistory: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { createdAt: true },
          },
        },
      });
      return {
        composition: saved.priceComposition,
        priceUpdatedAt: saved.priceHistory[0]?.createdAt.toISOString() ?? null,
      };
    });
  }

  async getPriceCompositionTemplate(companyId: string) {
    await this.ensureConfectionery(companyId);
    const saved = await this.prisma.salesPriceCompositionTemplate.findUnique({
      where: { companyId },
    });
    return { template: saved?.template ?? null };
  }

  async savePriceCompositionTemplate(companyId: string, composition: unknown) {
    await this.ensureConfectionery(companyId);
    if (!validateSalesPriceComposition(composition))
      throw new BadRequestException(
        'Confira os parâmetros da composição de preços.',
      );
    const template = toSalesPriceCompositionTemplate(composition);
    const saved = await this.prisma.salesPriceCompositionTemplate.upsert({
      where: { companyId },
      create: { companyId, template },
      update: { template },
    });
    return { template: saved.template };
  }

  async listProductCategories(companyId: string) {
    await this.ensureConfectionery(companyId);
    const [saved, legacy] = await Promise.all([
      this.prisma.salesProductCategory.findMany({
        where: { companyId, active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.salesProduct.findMany({
        where: { companyId, active: true, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);
    const names = new Set(saved.map((item) => item.name));
    return [
      ...saved,
      ...legacy.flatMap((item) =>
        item.category && !names.has(item.category)
          ? [{ id: `legacy-category-${item.category}`, name: item.category }]
          : [],
      ),
    ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async createProductCategory(
    companyId: string,
    data: CriarClassificacaoProdutoDto,
  ) {
    await this.ensureConfectionery(companyId);
    const name = data.name.trim().toLocaleUpperCase('pt-BR');
    if (!name) throw new BadRequestException('Informe o nome da categoria.');
    try {
      return await this.prisma.salesProductCategory.create({
        data: { companyId, name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException('Esta categoria já está cadastrada.');
      throw error;
    }
  }

  async listProductBrands(companyId: string) {
    await this.ensureConfectionery(companyId);
    const [saved, legacy] = await Promise.all([
      this.prisma.salesProductBrand.findMany({
        where: { companyId, active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.salesProduct.findMany({
        where: { companyId, active: true, brand: { not: null } },
        select: { brand: true },
        distinct: ['brand'],
      }),
    ]);
    const names = new Set(saved.map((item) => item.name));
    return [
      ...saved,
      ...legacy.flatMap((item) =>
        item.brand && !names.has(item.brand)
          ? [{ id: `legacy-brand-${item.brand}`, name: item.brand }]
          : [],
      ),
    ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async listProductUnits(companyId: string) {
    await this.ensureConfectionery(companyId);
    const [saved, used] = await Promise.all([
      this.prisma.salesProductUnit.findMany({
        where: { companyId, active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.salesProduct.findMany({
        where: { companyId },
        select: { unit: true },
        distinct: ['unit'],
      }),
    ]);
    const options = new Map(
      saved.map((item) => [item.name, { id: item.id, name: item.name }]),
    );
    for (const name of [
      'UN',
      'KG',
      'G',
      'LT',
      'ML',
      'MT',
      'M2',
      'CX',
      'PCT',
      'PAR',
      ...used.map((item) => item.unit),
    ]) {
      if (name && !options.has(name))
        options.set(name, { id: `unit-${name}`, name });
    }
    return [...options.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  async createProductUnit(companyId: string, data: { name: string }) {
    await this.ensureConfectionery(companyId);
    const name = data.name.trim().toLocaleUpperCase('pt-BR');
    if (!name || name.length > 12)
      throw new BadRequestException(
        'Informe uma unidade com até 12 caracteres.',
      );
    return this.prisma.salesProductUnit.upsert({
      where: { companyId_name: { companyId, name } },
      create: { companyId, name },
      update: { active: true },
    });
  }

  async createProductBrand(
    companyId: string,
    data: CriarClassificacaoProdutoDto,
  ) {
    await this.ensureConfectionery(companyId);
    const name = data.name.trim().toLocaleUpperCase('pt-BR');
    if (!name) throw new BadRequestException('Informe o nome da marca.');
    try {
      return await this.prisma.salesProductBrand.create({
        data: { companyId, name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException('Esta marca já está cadastrada.');
      throw error;
    }
  }

  async listProductGrids(companyId: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.salesProductGrid.findMany({
      where: { companyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createProductGrid(companyId: string, data: CriarGradeProdutoDto) {
    await this.ensureConfectionery(companyId);
    const name = data.name.trim().toLocaleUpperCase('pt-BR');
    const values = [
      ...new Set(
        data.values
          .split(',')
          .map((value) => value.trim().toLocaleUpperCase('pt-BR'))
          .filter(Boolean),
      ),
    ];
    if (!name || !values.length)
      throw new BadRequestException(
        'Informe o nome da grade e ao menos uma variação.',
      );
    try {
      return await this.prisma.salesProductGrid.create({
        data: { companyId, name, values: values.join(', ') },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException('Esta grade já está cadastrada.');
      throw error;
    }
  }

  async createProduct(
    companyId: string,
    data: CriarProdutoVendaDto,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    if (
      data.gridId &&
      !(await this.prisma.salesProductGrid.findFirst({
        where: { id: data.gridId, companyId, active: true },
      }))
    )
      throw new BadRequestException('Grade inválida para esta empresa.');
    if (!data.category?.trim() || !data.brand?.trim())
      throw new BadRequestException('Categoria e marca são obrigatórias.');
    if (data.promotionalPrice != null && data.promotionalPrice > data.price)
      throw new BadRequestException(
        'O preço promocional não pode superar o preço de venda.',
      );
    if (
      data.commissionEnabled &&
      data.commissionType === 'PERCENTUAL' &&
      (data.commission ?? 0) > 100
    )
      throw new BadRequestException(
        'A comissão percentual não pode superar 100%.',
      );
    const supplier = await this.resolveProductSupplier(companyId, data);
    const productId = randomUUID();
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRawUnsafe(
          'SELECT "id" FROM "empresas" WHERE "id" = $1 FOR UPDATE',
          companyId,
        );
        if (actorId)
          await tx.$queryRaw`SELECT set_config('contrx.price_actor_id', ${actorId}, true)`;
        const codes = await tx.salesProduct.findMany({
          where: { companyId },
          select: { sku: true },
        });
        const nextCode =
          codes.reduce(
            (max, product) =>
              /^\d+$/.test(product.sku || '')
                ? Math.max(max, Number(product.sku))
                : max,
            0,
          ) + 1;
        const sku =
          data.sku?.trim().toLocaleUpperCase('pt-BR') || String(nextCode);
        if (
          codes.some(
            (product) => product.sku?.toLocaleUpperCase('pt-BR') === sku,
          )
        )
          throw new BadRequestException(
            'Já existe um produto com este código.',
          );
        await this.assertBarcodeAvailable(
          tx,
          companyId,
          data.barcode,
          productId,
        );
        const gridInputs =
          data.variants ??
          (data.variations || '')
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ name, stock: 0 }));
        const isGridParent = gridInputs.length > 0;
        const product = await tx.salesProduct.create({
          data: {
            id: productId,
            companyId,
            ...this.productData(data, sku),
            ...supplier,
            name: data.name.trim().toLocaleUpperCase('pt-BR'),
            price: data.price,
            ...(isGridParent
              ? { isGridParent: true, stock: 0, manageStock: true }
              : {}),
          } as unknown as Prisma.SalesProductUncheckedCreateInput,
        });
        if (product.stock.gt(0))
          await tx.salesStockMovement.create({
            data: {
              companyId,
              productId,
              stockChange: product.stock,
              reservedChange: 0,
              reason: 'ESTOQUE INICIAL DO CADASTRO',
            },
          });
        if (isGridParent)
          await syncGridProducts(
            tx,
            companyId,
            product,
            gridInputs,
            (barcode, id) =>
              this.assertBarcodeAvailable(tx, companyId, barcode, id),
          );
        else
          await this.syncProductVariants(tx, companyId, product, data.variants);
        return formatCatalogProduct(
          await tx.salesProduct.findFirstOrThrow({
            where: { id: productId, companyId },
            include: productCatalogInclude,
          }),
        );
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  async updateProduct(
    companyId: string,
    id: string,
    data: AtualizarProdutoVendaDto,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockCompany(tx, companyId);
        if (actorId)
          await tx.$queryRaw`SELECT set_config('contrx.price_actor_id', ${actorId}, true)`;
        const supplier = await this.resolveProductSupplier(companyId, data);
        if (
          data.gridId &&
          !(await tx.salesProductGrid.findFirst({
            where: { id: data.gridId, companyId, active: true },
          }))
        )
          throw new BadRequestException('Grade inválida para esta empresa.');
        const sku = data.sku?.trim().toLocaleUpperCase('pt-BR');
        if (sku) await this.assertProductCodeAvailable(companyId, sku, id);
        await this.assertBarcodeAvailable(tx, companyId, data.barcode, id);
        const existing = await tx.salesProduct.findFirst({
          where: { id, companyId },
          select: {
            updatedAt: true,
            isGridParent: true,
            parentProductId: true,
            gridId: true,
            stock: true,
            promotionalPrice: true,
            category: true,
            brand: true,
            price: true,
            commission: true,
            commissionEnabled: true,
            commissionType: true,
          },
        });
        if (!existing) throw new NotFoundException('Produto não encontrado.');
        if (existing.parentProductId && data.variants?.length)
          throw new BadRequestException(
            'Edite a grade no produto principal. Este cadastro representa uma única opção.',
          );
        if (
          existing.parentProductId &&
          data.gridId !== undefined &&
          data.gridId !== existing.gridId
        )
          throw new BadRequestException(
            'O vínculo da grade deve ser alterado na matriz.',
          );
        if (
          !data.expectedUpdatedAt ||
          existing.updatedAt.getTime() !==
            new Date(data.expectedUpdatedAt).getTime()
        )
          throw new BadRequestException(
            'O produto foi atualizado. Reabra o cadastro antes de gravar para preservar o estoque e os preços atuais.',
          );
        let convertToGrid = false;
        if (
          !existing.isGridParent &&
          !existing.parentProductId &&
          data.variants?.length
        ) {
          const orders = await tx.salesOrder.findMany({
            where: { companyId },
            select: { items: true, returnedItems: true },
          });
          const referenced = orders.some((order) =>
            [order.items, order.returnedItems].some(
              (items) =>
                Array.isArray(items) &&
                items.some(
                  (item) =>
                    item &&
                    typeof item === 'object' &&
                    !Array.isArray(item) &&
                    item.productId === id,
                ),
            ),
          );
          const movements = await tx.salesStockMovement.count({
            where: {
              companyId,
              productId: id,
              NOT: {
                OR: [
                  { reason: 'ESTOQUE INICIAL DO CADASTRO' },
                  { reason: 'AJUSTE MANUAL NO CADASTRO' },
                  { reason: { startsWith: 'DISTRIBUIÇÃO DA VARIAÇÃO ' } },
                ],
              },
            },
          });
          if (!referenced && !movements) {
            const distributed = data.variants.reduce(
              (sum, variant) => sum.add(variant.stock),
              new Prisma.Decimal(0),
            );
            if (!distributed.eq(data.stock ?? existing.stock))
              throw new BadRequestException(
                'Distribua todo o estoque informado entre as opções para criar os cadastros independentes da grade.',
              );
            convertToGrid = true;
          }
        }
        const isGridParent = existing.isGridParent || convertToGrid;
        if (
          !(
            data.category !== undefined ? data.category : existing.category
          )?.trim() ||
          !(data.brand !== undefined ? data.brand : existing.brand)?.trim()
        ) {
          throw new BadRequestException('Categoria e marca são obrigatórias.');
        }
        const effectivePrice = data.price ?? existing.price.toNumber();
        const effectivePromotionalPrice =
          data.promotionalPrice !== undefined
            ? data.promotionalPrice
            : existing.promotionalPrice;
        if (
          effectivePromotionalPrice != null &&
          new Prisma.Decimal(effectivePromotionalPrice).gt(effectivePrice)
        )
          throw new BadRequestException(
            'O preço promocional não pode superar o preço de venda.',
          );
        const commissionEnabled =
          data.commissionEnabled ?? existing.commissionEnabled;
        const commissionType = data.commissionType ?? existing.commissionType;
        const commission = data.commission ?? existing.commission.toNumber();
        if (
          commissionEnabled &&
          commissionType === 'PERCENTUAL' &&
          commission > 100
        )
          throw new BadRequestException(
            'A comissão percentual não pode superar 100%.',
          );
        const result = await tx.salesProduct.updateMany({
          where: {
            id,
            companyId,
            ...(data.stock !== undefined
              ? { reservedStock: { lte: data.stock } }
              : {}),
            ...(data.manageStock === false ? { reservedStock: 0 } : {}),
          },
          data: {
            ...this.productData(data, sku),
            ...supplier,
            ...(isGridParent
              ? {
                  isGridParent: true,
                  stock: 0,
                  reservedStock: 0,
                  manageStock: true,
                }
              : {}),
          },
        });
        if (!result.count)
          throw new BadRequestException(
            'Não é possível reduzir o estoque abaixo da reserva ou desativar o controle enquanto houver itens em condicional.',
          );
        const nextStock = isGridParent ? 0 : data.stock;
        if (nextStock !== undefined && !existing.stock.eq(nextStock))
          await tx.salesStockMovement.create({
            data: {
              companyId,
              productId: id,
              stockChange: new Prisma.Decimal(nextStock).sub(existing.stock),
              reservedChange: 0,
              reason: 'AJUSTE MANUAL NO CADASTRO',
            },
          });
        const updated = await tx.salesProduct.findFirstOrThrow({
          where: { id, companyId },
        });
        if (convertToGrid)
          await tx.salesProductVariant.deleteMany({
            where: { companyId, productId: id },
          });
        const gridInputs = convertToGrid
          ? data.variants?.map(
              ({ id: _id, expectedUpdatedAt: _updatedAt, ...variant }) =>
                variant,
            )
          : data.variants;
        if (isGridParent)
          await syncGridProducts(
            tx,
            companyId,
            updated,
            gridInputs,
            (barcode, childId) =>
              this.assertBarcodeAvailable(tx, companyId, barcode, childId),
          );
        else
          await this.syncProductVariants(tx, companyId, updated, data.variants);
        return formatCatalogProduct(
          await tx.salesProduct.findFirstOrThrow({
            where: { id, companyId },
            include: productCatalogInclude,
          }),
        );
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  async deleteProduct(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockCompany(tx, companyId);
        const product = await tx.salesProduct.findFirst({
          where: { id, companyId },
          select: { id: true, isGridParent: true },
        });
        if (!product) throw new NotFoundException('Produto nao encontrado.');
        const children = product.isGridParent
          ? await tx.salesProduct.findMany({
              where: { companyId, parentProductId: id },
              select: { id: true },
            })
          : [];
        const productIds = [id, ...children.map((child) => child.id)];
        const productFilter = productIds.length === 1 ? id : { in: productIds };

        const orders = await tx.salesOrder.findMany({
          where: { companyId },
          select: { items: true, returnedItems: true },
        });
        const hasMovement = orders.some((order) =>
          [order.items, order.returnedItems].some(
            (items) =>
              Array.isArray(items) &&
              items.some((value) => {
                if (!value || typeof value !== 'object' || Array.isArray(value))
                  return false;
                return productIds.includes(scalarText(value.productId));
              }),
          ),
        );
        if (
          hasMovement ||
          (await tx.salesStockMovement.count({
            where: {
              companyId,
              productId: productFilter,
              NOT: {
                OR: [
                  { reason: 'ESTOQUE INICIAL DO CADASTRO' },
                  { reason: 'AJUSTE MANUAL NO CADASTRO' },
                  { reason: { startsWith: 'DISTRIBUIÇÃO DA VARIAÇÃO ' } },
                ],
              },
            },
          }))
        )
          throw new BadRequestException(
            'Este produto não pode ser excluído porque está vinculado a venda, condicional, pedido, orçamento, troca ou outra movimentação operacional.',
          );

        await tx.salesStockMovement.deleteMany({
          where: { companyId, productId: productFilter },
        });
        await tx.salesProductVariant.deleteMany({
          where: { companyId, productId: productFilter },
        });
        if (children.length)
          await tx.salesProduct.deleteMany({
            where: { companyId, parentProductId: id },
          });
        const result = await tx.salesProduct.deleteMany({
          where: { id, companyId },
        });
        if (!result.count)
          throw new NotFoundException('Produto nao encontrado.');
        return { success: true };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  private async assertProductCodeAvailable(
    companyId: string,
    sku: string | null,
    excludeId?: string,
  ) {
    if (!sku) return;
    const product = await this.prisma.salesProduct.findFirst({
      where: {
        companyId,
        sku: { equals: sku, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (product)
      throw new BadRequestException('Já existe um produto com este código.');
  }

  async listProductPriceHistory(
    companyId: string,
    productId: string,
    cursor?: string,
  ) {
    const product = await this.prisma.salesProduct.findFirst({
      where: { id: productId, companyId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (
      cursor &&
      !(await this.prisma.salesProductPriceHistory.findFirst({
        where: { id: cursor, companyId, productId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Página de histórico inválida.');
    const rows = await this.prisma.salesProductPriceHistory.findMany({
      where: { companyId, productId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const records = rows.slice(0, 50);
    return {
      records,
      nextCursor: rows.length > 50 ? records.at(-1)!.id : null,
    };
  }

  async checkProductGtin(
    companyId: string,
    barcode: string,
    excludeId?: string,
  ) {
    const code = barcode?.trim() || '';
    if (!isValidGtin(code))
      return {
        valid: false,
        available: false,
        message:
          'GTIN inválido. Confira a quantidade de dígitos e o dígito verificador.',
      };
    const aliases = gtinAliases(code);
    const product = await this.prisma.salesProduct.findFirst({
      where: {
        companyId,
        barcode: { in: aliases },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { name: true },
    });
    const variant = await this.prisma.salesProductVariant.findFirst({
      where: { companyId, barcode: { in: aliases } },
      select: { name: true },
    });
    return {
      valid: true,
      available: !product && !variant,
      message:
        product || variant
          ? `GTIN já cadastrado: ${(product || variant)!.name}.`
          : 'GTIN válido e disponível nesta empresa.',
    };
  }

  private async assertBarcodeAvailable(
    tx: Prisma.TransactionClient,
    companyId: string,
    barcode: string | undefined,
    productId: string,
  ) {
    if (!barcode?.trim()) return;
    if (!isValidGtin(barcode.trim()))
      throw new BadRequestException(
        'GTIN inválido. Informe 8, 12, 13 ou 14 dígitos com dígito verificador correto.',
      );
    if (
      (await tx.salesProduct.findFirst({
        where: {
          companyId,
          barcode: { in: gtinAliases(barcode.trim()) },
          id: { not: productId },
        },
        select: { id: true },
      })) ||
      (await tx.salesProductVariant.findFirst({
        where: { companyId, barcode: { in: gtinAliases(barcode.trim()) } },
        select: { id: true },
      }))
    )
      throw new BadRequestException(
        'Código de barras já utilizado por produto ou variação.',
      );
  }

  private async syncProductVariants(
    tx: Prisma.TransactionClient,
    companyId: string,
    product: Prisma.SalesProductGetPayload<Record<string, never>>,
    variants: CriarProdutoVendaDto['variants'],
  ) {
    const existing = await tx.salesProductVariant.findMany({
      where: { companyId, productId: product.id },
    });
    if (
      variants === undefined &&
      !existing.length &&
      product.variations?.trim()
    )
      variants = [
        ...new Set(
          product.variations
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean),
        ),
      ].map((name) => ({ name, stock: 0 }));
    if (variants === undefined) {
      if (
        existing
          .filter((variant) => variant.active)
          .reduce(
            (sum, variant) => sum.add(variant.stock),
            new Prisma.Decimal(0),
          )
          .gt(product.stock)
      )
        throw new BadRequestException(
          'O estoque do produto não pode ser inferior ao estoque distribuído entre as variações.',
        );
      return;
    }
    if (variants.length && !product.manageStock)
      throw new BadRequestException(
        'Ative o controle de estoque para utilizar variações.',
      );
    const names = variants.map((variant) =>
      variant.name.trim().toLocaleUpperCase('pt-BR'),
    );
    if (names.some((name) => !name) || new Set(names).size !== names.length)
      throw new BadRequestException(
        'Os nomes das variações devem ser preenchidos e únicos.',
      );
    if (
      variants
        .reduce((sum, variant) => sum.add(variant.stock), new Prisma.Decimal(0))
        .gt(product.stock)
    )
      throw new BadRequestException(
        'A soma dos estoques das variações não pode superar o estoque físico do produto.',
      );
    await tx.salesProduct.updateMany({
      where: { id: product.id, companyId },
      data: { variations: names.join(', ') || null },
    });
    const keptIds = new Set<string>();
    for (const [index, input] of variants.entries()) {
      const previous = input.id
        ? existing.find((variant) => variant.id === input.id)
        : existing.find((variant) => variant.name === names[index]);
      if (input.id && !previous)
        throw new BadRequestException('Variação não pertence a este produto.');
      if (previous && previous.reservedStock.gt(input.stock))
        throw new BadRequestException(
          'A variação possui estoque reservado em condicional.',
        );
      const barcode = input.barcode?.trim() || null;
      if (barcode && !isValidGtin(barcode))
        throw new BadRequestException(
          'GTIN da variação inválido. Confira o dígito verificador.',
        );
      if (
        barcode &&
        ((await tx.salesProduct.findFirst({
          where: { companyId, barcode: { in: gtinAliases(barcode) } },
          select: { id: true },
        })) ||
          (await tx.salesProductVariant.findFirst({
            where: {
              companyId,
              barcode: { in: gtinAliases(barcode) },
              ...(previous ? { id: { not: previous.id } } : {}),
            },
            select: { id: true },
          })))
      )
        throw new BadRequestException(
          'Código de barras já utilizado por outro produto ou variação.',
        );
      const data = {
        name: names[index],
        barcode,
        price: input.price ?? null,
        stock: input.stock,
        active: true,
      };
      const variant = previous
        ? await tx.salesProductVariant.update({
            where: { id: previous.id },
            data,
          })
        : await tx.salesProductVariant.create({
            data: { companyId, productId: product.id, ...data },
          });
      keptIds.add(variant.id);
      const delta = new Prisma.Decimal(input.stock).sub(previous?.stock ?? 0);
      if (!delta.eq(0))
        await tx.salesStockMovement.create({
          data: {
            companyId,
            productId: product.id,
            stockChange: 0,
            reservedChange: 0,
            reason: `DISTRIBUIÇÃO DA VARIAÇÃO ${variant.name}: ${delta.toString()}`,
          },
        });
    }
    const removed = existing.filter(
      (variant) => variant.active && !keptIds.has(variant.id),
    );
    if (removed.some((variant) => variant.reservedStock.gt(0)))
      throw new BadRequestException(
        'Não é possível remover uma variação com reserva em condicional.',
      );
    await tx.salesProductVariant.updateMany({
      where: {
        companyId,
        productId: product.id,
        id: { in: removed.map((variant) => variant.id) },
      },
      data: { active: false, stock: 0 },
    });
  }

  private async resolveProductSupplier(
    companyId: string,
    data: AtualizarProdutoVendaDto,
  ) {
    if (data.supplierId === undefined && data.supplierName === undefined)
      return {};
    if (!data.supplierId && !data.supplierName?.trim())
      return { supplierId: null, supplierName: null };
    const suppliers = await this.prisma.salesSupplier.findMany({
      where: {
        companyId,
        active: true,
        ...(data.supplierId
          ? { id: data.supplierId }
          : {
              name: {
                equals: data.supplierName!.trim(),
                mode: 'insensitive' as const,
              },
            }),
      },
    });
    if (suppliers.length !== 1)
      throw new BadRequestException(
        'Selecione um fornecedor ativo e sem ambiguidade desta empresa.',
      );
    return { supplierId: suppliers[0].id, supplierName: suppliers[0].name };
  }

  private productData(
    data: CriarProdutoVendaDto | AtualizarProdutoVendaDto,
    sku?: string | null,
  ): Prisma.SalesProductUpdateManyMutationInput {
    const upper = (value?: string | null) =>
      value?.trim().toLocaleUpperCase('pt-BR') || null;
    return {
      ...(data.name !== undefined
        ? { name: data.name.trim().toLocaleUpperCase('pt-BR') }
        : {}),
      ...(sku !== undefined ? { sku } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.allowDiscount !== undefined
        ? { allowDiscount: data.allowDiscount }
        : {}),
      ...(data.allowAddition !== undefined
        ? { allowAddition: data.allowAddition }
        : {}),
      ...(data.purchaseCost !== undefined
        ? { purchaseCost: data.purchaseCost }
        : {}),
      ...(data.additionalCost !== undefined
        ? { additionalCost: data.additionalCost }
        : {}),
      ...(data.markupMultiplier !== undefined
        ? { markupMultiplier: data.markupMultiplier }
        : {}),
      ...(data.promotionalPrice !== undefined
        ? { promotionalPrice: data.promotionalPrice }
        : {}),
      ...(data.reference !== undefined
        ? { reference: upper(data.reference) }
        : {}),
      ...(data.barcode !== undefined
        ? { barcode: data.barcode?.trim() || null }
        : {}),
      ...(data.factoryCode !== undefined
        ? { factoryCode: upper(data.factoryCode) }
        : {}),
      ...(data.unit !== undefined ? { unit: upper(data.unit) || 'UN' } : {}),
      ...(data.gridId !== undefined ? { gridId: data.gridId } : {}),
      ...(data.kind !== undefined
        ? { kind: upper(data.kind) || 'PRODUTO' }
        : {}),
      ...(data.description !== undefined
        ? { description: upper(data.description) }
        : {}),
      ...(data.showInSale !== undefined ? { showInSale: data.showInSale } : {}),
      ...(data.manageStock !== undefined
        ? { manageStock: data.manageStock }
        : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.category !== undefined
        ? { category: upper(data.category) }
        : {}),
      ...(data.subcategory !== undefined
        ? { subcategory: upper(data.subcategory) }
        : {}),
      ...(data.brand !== undefined ? { brand: upper(data.brand) } : {}),
      ...(data.productType !== undefined
        ? { productType: upper(data.productType) || 'REVENDA' }
        : {}),
      ...(data.internalNote !== undefined
        ? { internalNote: upper(data.internalNote) }
        : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      ...(data.minimumStock !== undefined
        ? { minimumStock: data.minimumStock }
        : {}),
      ...(data.variations !== undefined
        ? { variations: upper(data.variations) }
        : {}),
      ...(data.inheritGridPrice !== undefined
        ? { inheritGridPrice: data.inheritGridPrice }
        : {}),
      ...(data.commission !== undefined ? { commission: data.commission } : {}),
      ...(data.commissionEnabled !== undefined
        ? { commissionEnabled: data.commissionEnabled }
        : {}),
      ...(data.commissionType !== undefined
        ? { commissionType: data.commissionType }
        : {}),
      ...(data.commissionRule !== undefined
        ? { commissionRule: data.commissionRule }
        : {}),
      ...(data.supplierName !== undefined
        ? { supplierName: upper(data.supplierName) }
        : {}),
    };
  }

  async listSuppliers(companyId: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.salesSupplier.findMany({
      where: { companyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(companyId: string, data: CriarFornecedorVendaDto) {
    await this.ensureConfectionery(companyId);
    if (!data.name?.trim())
      throw new BadRequestException('Informe o nome do fornecedor.');
    const document = this.normalizeDocument(data.document);
    if (document)
      await this.assertSupplierDocumentAvailable(companyId, document);
    try {
      return await this.prisma.salesSupplier.create({
        data: {
          companyId,
          ...this.supplierData(data, document),
          name: data.name.trim().toLocaleUpperCase('pt-BR'),
        } as unknown as Prisma.SalesSupplierUncheckedCreateInput,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException(
          'JÁ EXISTE UM FORNECEDOR COM ESTE DOCUMENTO.',
        );
      throw error;
    }
  }

  async updateSupplier(
    companyId: string,
    id: string,
    data: AtualizarFornecedorVendaDto,
  ) {
    await this.ensureConfectionery(companyId);
    const existing = await this.prisma.salesSupplier.findFirst({
      where: { id, companyId, active: true },
    });
    if (!existing) throw new NotFoundException('FORNECEDOR NÃO ENCONTRADO.');
    if (data.name !== undefined && !data.name?.trim())
      throw new BadRequestException('Informe o nome do fornecedor.');
    const document =
      data.document !== undefined
        ? this.normalizeDocument(data.document)
        : existing.document;
    if (document)
      await this.assertSupplierDocumentAvailable(companyId, document, id);
    try {
      const result = await this.prisma.salesSupplier.updateMany({
        where: { id, companyId, active: true },
        data: this.supplierData(data, document),
      });
      if (!result.count)
        throw new NotFoundException('FORNECEDOR NÃO ENCONTRADO.');
      return this.prisma.salesSupplier.findFirst({
        where: { id, companyId, active: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException(
          'JÁ EXISTE UM FORNECEDOR COM ESTE DOCUMENTO.',
        );
      throw error;
    }
  }

  async archiveSupplier(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    const result = await this.prisma.salesSupplier.updateMany({
      where: { id, companyId, active: true },
      data: { active: false },
    });
    if (!result.count)
      throw new NotFoundException('FORNECEDOR NÃO ENCONTRADO.');
    return { success: true };
  }

  private supplierData(
    data: CriarFornecedorVendaDto | AtualizarFornecedorVendaDto,
    document: string | null,
  ): Prisma.SalesSupplierUpdateManyMutationInput {
    const upper = (value?: string | null) =>
      value?.trim().toLocaleUpperCase('pt-BR') || null;
    return {
      ...(data.name !== undefined
        ? { name: data.name.trim().toLocaleUpperCase('pt-BR') }
        : {}),
      ...(data.document !== undefined ? { document } : {}),
      ...(data.contact !== undefined ? { contact: upper(data.contact) } : {}),
      ...(data.phone !== undefined
        ? { phone: data.phone?.trim() || null }
        : {}),
      ...(data.email !== undefined
        ? { email: data.email?.trim().toLowerCase() || null }
        : {}),
      ...(data.address !== undefined ? { address: upper(data.address) } : {}),
      ...(data.notes !== undefined ? { notes: upper(data.notes) } : {}),
    };
  }

  private async assertSupplierDocumentAvailable(
    companyId: string,
    document: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.salesSupplier.findFirst({
      where: {
        companyId,
        document,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate)
      throw new BadRequestException(
        'JÁ EXISTE UM FORNECEDOR COM ESTE DOCUMENTO.',
      );
  }

  async listSellers(companyId: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.salesSeller.findMany({
      where: { companyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async checkSellerDocument(
    companyId: string,
    document: string,
    excludeId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    const normalized = this.normalizeDocument(document);
    if (!normalized || !this.isValidCustomerDocument(normalized))
      throw new BadRequestException('Informe um CPF ou CNPJ válido.');
    const seller = await this.prisma.salesSeller.findFirst({
      where: {
        companyId,
        document: normalized,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return { exists: Boolean(seller) };
  }

  async createSeller(companyId: string, data: CriarVendedorVendaDto) {
    await this.ensureConfectionery(companyId);
    if (!data.name?.trim())
      throw new BadRequestException(
        'Informe o nome ou razão social do vendedor.',
      );
    const document = this.validateSellerDocument(
      data.document,
      data.personType,
    );
    if (document) await this.assertSellerDocumentAvailable(companyId, document);
    try {
      return await this.prisma.salesSeller.create({
        data: this.sellerData(companyId, data, document),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException(
          'Já existe um vendedor com este CPF/CNPJ.',
        );
      throw error;
    }
  }

  async updateSeller(
    companyId: string,
    id: string,
    data: AtualizarVendedorVendaDto,
  ) {
    await this.ensureConfectionery(companyId);
    const existing = await this.prisma.salesSeller.findFirst({
      where: { id, companyId, active: true },
    });
    if (!existing) throw new NotFoundException('Vendedor não encontrado.');
    if (data.name !== undefined && !data.name.trim())
      throw new BadRequestException(
        'Informe o nome ou razão social do vendedor.',
      );
    const document =
      data.document !== undefined
        ? this.validateSellerDocument(
            data.document,
            data.personType ?? existing.personType,
          )
        : this.validateSellerDocument(
            existing.document,
            data.personType ?? existing.personType,
          );
    if (document)
      await this.assertSellerDocumentAvailable(companyId, document, id);
    let result;
    try {
      result = await this.prisma.salesSeller.updateMany({
        where: { id, companyId, active: true },
        data: {
          ...this.sellerProfile(data),
          ...(data.name !== undefined
            ? { name: data.name.trim().toLocaleUpperCase('pt-BR') }
            : {}),
          ...(data.document !== undefined ? { document } : {}),
          ...(data.phone !== undefined
            ? { phone: data.phone?.trim() || null }
            : {}),
          ...(data.email !== undefined
            ? { email: data.email?.trim().toLowerCase() || null }
            : {}),
          ...(data.commission !== undefined
            ? { commission: data.commission }
            : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new BadRequestException(
          'Já existe um vendedor com este CPF/CNPJ.',
        );
      throw error;
    }
    if (!result.count) throw new NotFoundException('Vendedor não encontrado.');
    return this.prisma.salesSeller.findFirst({
      where: { id, companyId, active: true },
    });
  }

  async archiveSeller(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    const result = await this.prisma.salesSeller.updateMany({
      where: { id, companyId, active: true },
      data: { active: false },
    });
    if (!result.count) throw new NotFoundException('Vendedor não encontrado.');
    return { success: true };
  }

  async deleteSeller(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, companyId);
      const seller = await tx.salesSeller.findFirst({
        where: { id, companyId },
      });
      if (!seller) throw new NotFoundException('Vendedor não encontrado.');
      if (await tx.salesOrder.count({ where: { companyId, sellerId: id } }))
        throw new BadRequestException(
          'Vendedor com histórico não pode ser excluído. Utilize a inativação.',
        );
      await tx.salesSeller.deleteMany({ where: { id, companyId } });
      return { success: true };
    });
  }

  private validateSellerDocument(value?: string | null, personType?: string) {
    const document = this.normalizeDocument(value);
    if (
      document &&
      (!this.isValidCustomerDocument(document) ||
        (personType === 'INDIVIDUAL' && document.length !== 11) ||
        (personType === 'COMPANY' && document.length !== 14))
    )
      throw new BadRequestException(
        'Informe um CPF ou CNPJ válido para o tipo de pessoa selecionado.',
      );
    return document;
  }

  private async assertSellerDocumentAvailable(
    companyId: string,
    document: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.salesSeller.findFirst({
      where: {
        companyId,
        document,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate)
      throw new BadRequestException('Já existe um vendedor com este CPF/CNPJ.');
  }

  private sellerProfile(data: AtualizarVendedorVendaDto) {
    const result: Record<string, string | null> = {};
    for (const key of [
      'alias',
      'identityNumber',
      'issuingAuthority',
      'birthDate',
      'sex',
      'phone2',
      'zipCode',
      'address',
      'number',
      'complement',
      'neighborhood',
      'city',
      'state',
      'notes',
    ] as const) {
      if (data[key] !== undefined)
        result[key] = data[key]?.trim().toLocaleUpperCase('pt-BR') || null;
    }
    return {
      ...result,
      ...(data.personType ? { personType: data.personType } : {}),
    };
  }

  private sellerData(
    companyId: string,
    data: CriarVendedorVendaDto,
    document: string | null,
  ) {
    return {
      companyId,
      ...this.sellerProfile(data),
      personType:
        data.personType || (document?.length === 14 ? 'COMPANY' : 'INDIVIDUAL'),
      name: data.name.trim().toLocaleUpperCase('pt-BR'),
      document,
      phone: data.phone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      commission: data.commission ?? 0,
    };
  }

  async listOrders(
    companyId: string,
    before?: string,
    search?: string,
    filter?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    await this.ensureConfectionery(companyId);
    if (
      before &&
      (!/^\d+$/.test(before) || !Number.isSafeInteger(Number(before)))
    )
      throw new BadRequestException('Página inválida.');
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        companyId,
        ...(before ? { number: { lt: Number(before) } } : {}),
        ...orderListFilters(search, startDate, endDate, status),
        ...(filter === 'ATIVAS'
          ? { status: 'EM_ANDAMENTO' }
          : filter === 'GRAVADAS'
            ? {
                saleType: { in: ['VENDA', 'TROCA'] },
                status: { not: 'EM_ANDAMENTO' },
              }
            : ['VENDA', 'TROCA', 'ORCAMENTO', 'CONDICIONAL', 'PEDIDO'].includes(
                  filter || '',
                )
              ? {
                  saleType: filter,
                  status: { notIn: ['CANCELADA', 'ESTORNADA'] },
                }
              : filter === 'ESTORNAVEIS'
                ? { status: { in: ['CONCLUIDA', 'EM_ANDAMENTO'] } }
                : {}),
      },
      orderBy: { number: 'desc' },
      take: 100,
      include: {
        events: {
          where: { action: { in: ['CRIADA', 'ATUALIZADA'] } },
          orderBy: { createdAt: 'desc' },
          select: { details: true },
        },
      },
    });
    return orders.map(({ events, ...order }) => ({
      ...order,
      ...orderOrigin(order, events),
      operatorId:
        (events[0]?.details as Prisma.JsonObject | undefined)?.actorId ?? null,
      cardPayments:
        (events[0]?.details as Prisma.JsonObject | undefined)?.cardPayments ||
        [],
    }));
  }

  async reserveOrderNumber(companyId: string, userId: string) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, companyId);
      const reservation = await tx.salesOrderNumberReservation.findUnique({
        where: { companyId_userId: { companyId, userId } },
      });
      if (
        reservation &&
        reservation.expiresAt > new Date() &&
        !(await tx.salesOrder.findFirst({
          where: { companyId, number: reservation.number },
          select: { id: true },
        }))
      )
        return { number: reservation.number, expiresAt: reservation.expiresAt };

      const highestOrder = await tx.salesOrder.aggregate({
        _max: { number: true },
      });
      const highestSequence = await tx.$queryRaw<
        Array<{ number: bigint | number | null }>
      >`
        SELECT last_value::integer AS number FROM public.vendas_pedidos_numero_seq
      `;
      const highestReservation = await tx.salesOrderNumberReservation.aggregate(
        {
          _max: { number: true },
        },
      );
      const number =
        Math.max(
          highestOrder._max.number ?? 0,
          Number(highestSequence[0]?.number ?? 0),
          highestReservation._max.number ?? 0,
        ) + 1;
      await tx.$queryRaw`
        SELECT setval(
          pg_get_serial_sequence('public.vendas_pedidos', 'numero'),
          GREATEST(COALESCE((SELECT MAX(numero) FROM public.vendas_pedidos), 0), ${number}),
          true
        )
      `;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const saved = await tx.salesOrderNumberReservation.upsert({
        where: { companyId_userId: { companyId, userId } },
        create: { companyId, userId, number, expiresAt },
        update: { number, expiresAt },
      });
      return { number: saved.number, expiresAt: saved.expiresAt };
    });
  }

  async orderDetails(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        receivables: {
          where: { companyId },
          include: { payments: true },
          orderBy: { installmentNumber: 'asc' },
        },
        returns: {
          where: { companyId },
          select: { id: true, number: true, status: true, total: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Venda não encontrada.');
    const customer =
      ['ORCAMENTO', 'CONDICIONAL'].includes(order.saleType) && order.customerId
        ? await this.prisma.salesCustomer.findFirst({
            where: { id: order.customerId, companyId },
            select: {
              name: true,
              phone2: true,
              email: true,
              address: true,
              number: true,
              complement: true,
              neighborhood: true,
              city: true,
              state: true,
              zipCode: true,
              phone: true,
            },
          })
        : null;
    const latest = [...order.events]
      .reverse()
      .find((event) => ['CRIADA', 'ATUALIZADA'].includes(event.action));
    const metadata = latest?.details as Prisma.JsonObject | undefined;
    return {
      ...order,
      ...orderOrigin(
        order,
        order.events
          .filter((event) => ['CRIADA', 'ATUALIZADA'].includes(event.action))
          .reverse(),
      ),
      ...(['ORCAMENTO', 'CONDICIONAL'].includes(order.saleType)
        ? { customer }
        : {}),
      cardPayments: metadata?.cardPayments || [],
      operatorId: metadata?.actorId ?? null,
      lastRequestId: metadata?.requestId ?? order.requestId,
      cashTender:
        typeof metadata?.cashTender === 'string' ? metadata.cashTender : null,
    };
  }

  async createOrder(companyId: string, data: CriarVendaDto, actorId?: string) {
    return this.saveOrder(companyId, data, actorId);
  }

  async updateOrder(
    companyId: string,
    id: string,
    data: CriarVendaDto,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockCompany(tx, companyId);
        const existing = await tx.salesOrder.findFirst({
          where: { id, companyId },
        });
        if (!existing) throw new NotFoundException('Venda não encontrada.');
        const repeated = data.requestId
          ? await tx.salesOrderEvent.findFirst({
              where: {
                orderId: existing.id,
                action: 'ATUALIZADA',
                details: { path: ['requestId'], equals: data.requestId },
              },
              orderBy: { createdAt: 'desc' },
            })
          : null;
        if (repeated) {
          const metadata = repeated.details as Prisma.JsonObject;
          if (metadata.requestSignature !== this.requestSignature(data))
            throw new BadRequestException(
              'Esta tentativa já foi processada com outros dados. Consulte a venda gravada.',
            );
          return {
            ...existing,
            cardPayments: metadata.cardPayments || [],
            cashTender: metadata.cashTender || null,
          };
        }
        if (
          existing.status !== 'EM_ANDAMENTO' &&
          !(
            existing.status === 'CONCLUIDA' &&
            ['ORCAMENTO', 'PEDIDO', 'CONDICIONAL'].includes(existing.saleType)
          )
        )
          throw new BadRequestException(
            'Venda encerrada não pode ser alterada. Estorne e registre uma nova venda.',
          );
        if (data.version !== existing.version)
          throw new BadRequestException(
            'A venda foi alterada. Atualize a tela antes de gravar.',
          );
        if (
          existing.saleType === 'CONDICIONAL' &&
          (!['CONDICIONAL', 'VENDA'].includes(data.saleType) ||
            (data.saleType === 'VENDA' && data.status === 'EM_ANDAMENTO'))
        )
          throw new BadRequestException(
            'Mantenha o condicional ou converta-o em venda concluída para baixar os itens que o cliente ficou.',
          );
        const orderData = await this.buildOrderData(companyId, data, tx);
        if (existing.stockApplied)
          await this.applyOrderStock(tx, companyId, existing.items, 1);
        if (existing.stockReserved)
          await this.applyOrderStock(tx, companyId, existing.items, 1, true);
        const stockReserved =
          orderData.saleType === 'CONDICIONAL'
            ? await this.applyOrderStock(
                tx,
                companyId,
                orderData.items as Prisma.JsonValue,
                -1,
                true,
              )
            : false;
        const stockApplied = this.movesStock(orderData)
          ? await this.applyOrderStock(
              tx,
              companyId,
              orderData.items as Prisma.JsonValue,
              -1,
            )
          : false;
        const result = await tx.salesOrder.updateMany({
          where: { id, companyId, version: existing.version },
          data: {
            ...orderData,
            stockApplied,
            stockReserved,
            version: { increment: 1 },
          },
        });
        if (!result.count)
          throw new BadRequestException(
            'A venda foi alterada por outro operador. Atualize a tela e tente novamente.',
          );
        const order = await tx.salesOrder.findFirstOrThrow({
          where: { id, companyId },
        });
        await this.createOrderFinancials(
          tx,
          companyId,
          order,
          data.installments ?? 1,
        );
        const cardPayments = await validateCardPayments(
          tx,
          companyId,
          data,
          order,
        );
        await this.recordOrderEvent(tx, order, 'ATUALIZADA', {
          requestId: data.requestId ?? null,
          requestSignature: this.requestSignature(data),
          cashTender: data.cashTender ?? null,
          cardPayments,
          refundConfirmed: data.refundConfirmed === true,
          previousVersion: existing.version,
          actorId: actorId ?? null,
        });
        return { ...order, cardPayments, cashTender: data.cashTender ?? null };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  async reverseOrder(
    companyId: string,
    id: string,
    reason: string,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Venda não encontrada.');
    if (existing.status !== 'CONCLUIDA')
      throw new BadRequestException(
        'Somente operações concluídas podem ser estornadas.',
      );
    return this.closeOrderAndRestoreStock(
      companyId,
      existing,
      'ESTORNADA',
      reason,
      'Estorno',
      actorId,
    );
  }

  async discardOrder(
    companyId: string,
    id: string,
    reason: string,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
    });
    if (!order) throw new NotFoundException('Venda não encontrada.');
    if (order.status !== 'EM_ANDAMENTO')
      throw new BadRequestException(
        'Somente vendas em andamento podem ser excluídas por esta ação. Atualize a lista.',
      );
    return this.closeOrderAndRestoreStock(
      companyId,
      order,
      'CANCELADA',
      reason,
      'Excluída de Em andamento',
      actorId,
    );
  }

  async cancelOrder(
    companyId: string,
    id: string,
    reason: string,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Venda não encontrada.');
    if (existing.status === 'ESTORNADA' || existing.status === 'CANCELADA')
      throw new BadRequestException('Esta venda j? foi encerrada.');
    return this.closeOrderAndRestoreStock(
      companyId,
      existing,
      'CANCELADA',
      reason,
      'Cancelada',
      actorId,
    );
  }

  private async closeOrderAndRestoreStock(
    companyId: string,
    existing: Prisma.SalesOrderGetPayload<Record<string, never>>,
    status: 'ESTORNADA' | 'CANCELADA',
    reason: string,
    label: string,
    actorId?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockCompany(tx, companyId);
        const current = await tx.salesOrder.findFirst({
          where: { id: existing.id, companyId },
        });
        if (
          !current ||
          current.version !== existing.version ||
          ['ESTORNADA', 'CANCELADA'].includes(current.status)
        )
          throw new BadRequestException(
            'A venda foi alterada. Atualize a tela.',
          );
        if (
          await tx.salesOrder.count({
            where: {
              companyId,
              originalOrderId: existing.id,
              status: 'CONCLUIDA',
            },
          })
        )
          throw new BadRequestException(
            'Estorne primeiro as trocas/devoluções vinculadas a esta venda.',
          );
        if (existing.stockApplied)
          await this.applyOrderStock(tx, companyId, existing.items, 1);
        if (existing.stockReserved)
          await this.applyOrderStock(tx, companyId, existing.items, 1, true);
        await this.undoReturnAndCredit(tx, companyId, existing);
        const result = await tx.salesOrder.updateMany({
          where: { id: existing.id, companyId, version: existing.version },
          data: {
            status,
            stockApplied: false,
            stockReserved: false,
            version: { increment: 1 },
            notes:
              [existing.notes, label + ': ' + reason.trim()]
                .filter(Boolean)
                .join('\n') || null,
          },
        });
        if (!result.count)
          throw new BadRequestException(
            'A venda foi alterada por outro operador. Atualize a tela e tente novamente.',
          );
        await this.reverseOrderFinancials(
          tx,
          companyId,
          existing.id,
          actorId,
          reason,
        );
        const closed = await tx.salesOrder.findFirstOrThrow({
          where: { id: existing.id, companyId },
        });
        await this.recordOrderEvent(tx, closed, status, {
          reason: reason.trim(),
          actorId: actorId ?? null,
        });
        return closed;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  private async saveOrder(
    companyId: string,
    data: CriarVendaDto,
    actorId?: string,
  ) {
    await this.ensureConfectionery(companyId);
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockCompany(tx, companyId);
        if (!data.requestId)
          throw new BadRequestException(
            'Identificador da gravação obrigatório. Atualize a tela.',
          );
        const previous = await tx.salesOrder.findFirst({
          where: { companyId, requestId: data.requestId },
        });
        if (previous) {
          const savedItems = previous.items as Array<{
            productId: string;
            variantId?: string | null;
            quantity: number;
            unitPrice: string;
          }>;
          const sameItems =
            Array.isArray(savedItems) &&
            savedItems.length === data.items.length &&
            savedItems.every(
              (item, index) =>
                item.productId === data.items[index].productId &&
                (item.variantId || null) ===
                  (data.items[index].variantId || null) &&
                item.quantity === data.items[index].quantity &&
                (data.items[index].unitPrice === undefined ||
                  new Prisma.Decimal(item.unitPrice).eq(
                    data.items[index].unitPrice,
                  )),
            );
          const savedReturns =
            (
              previous.returnedItems as Array<{
                itemIndex: number;
                quantity: number;
              }> | null
            )?.map((item) => ({
              itemIndex: item.itemIndex,
              quantity: item.quantity,
            })) ?? [];
          if (
            previous.bankAccountId !== (data.bankAccountId || null) ||
            previous.installments !== (data.installments ?? 1) ||
            (previous.paymentMethod === 'MISTO' &&
              previous.total.gt(0) &&
              paymentSignature(
                previous.paymentDetails as Record<string, number> | null,
              ) !==
                paymentSignature(
                  this.validateOrderPayments(
                    data.paymentMethod,
                    data.paymentDetails,
                    previous.total,
                  ),
                )) ||
            JSON.stringify(savedReturns) !==
              JSON.stringify(data.returnedItems ?? []) ||
            (previous.originalOrderId || null) !==
              (data.originalOrderId || null) ||
            (previous.returnDisposition || null) !==
              (data.returnDisposition || null) ||
            !sameItems ||
            previous.customerId !== data.customerId ||
            previous.sellerId !== data.sellerId ||
            previous.saleType !== data.saleType ||
            previous.status !== (data.status || 'CONCLUIDA') ||
            !previous.discount.eq(data.discount) ||
            !previous.addition.eq(data.addition) ||
            previous.paymentMethod !== data.paymentMethod ||
            (previous.notes || '') !== (data.notes?.trim() || '')
          )
            throw new BadRequestException(
              'Esta gravação já foi processada com outros dados. Abra o documento salvo ou inicie uma nova venda.',
            );
          if (data.cardPayments?.length) {
            const normalized = await validateCardPayments(
              tx,
              companyId,
              data,
              previous,
            );
            const event = await tx.salesOrderEvent.findFirst({
              where: {
                orderId: previous.id,
                action: { in: ['CRIADA', 'ATUALIZADA'] },
              },
              orderBy: { createdAt: 'desc' },
            });
            const saved = ((event?.details as Prisma.JsonObject | undefined)
              ?.cardPayments || []) as typeof normalized;
            if (
              saved.length !== normalized.length ||
              normalized.some((item) => {
                const original = saved.find(
                  (row) => row.method === item.method,
                );
                return (
                  !original ||
                  Object.entries(item).some(
                    ([key, value]) => original[key] !== value,
                  )
                );
              })
            )
              throw new BadRequestException(
                'Esta gravação já foi processada com outros dados de cartão.',
              );
            const metadata = event?.details as Prisma.JsonObject | undefined;
            if (
              metadata?.requestSignature &&
              metadata.requestSignature !== this.requestSignature(data)
            )
              throw new BadRequestException(
                'Esta gravação já foi processada com outros dados.',
              );
            return {
              ...previous,
              cardPayments: saved,
              cashTender: metadata?.cashTender ?? null,
            };
          }
          const event = await tx.salesOrderEvent.findFirst({
            where: {
              orderId: previous.id,
              action: { in: ['CRIADA', 'ATUALIZADA'] },
            },
            orderBy: { createdAt: 'desc' },
          });
          const metadata = event?.details as Prisma.JsonObject | undefined;
          if (
            metadata?.requestSignature &&
            metadata.requestSignature !== this.requestSignature(data)
          )
            throw new BadRequestException(
              'Esta gravação já foi processada com outros dados.',
            );
          return {
            ...previous,
            cardPayments: metadata?.cardPayments ?? [],
            cashTender: metadata?.cashTender ?? null,
          };
        }
        let reservedNumber: number | undefined;
        if (data.reservedNumber !== undefined) {
          const reservation = await tx.salesOrderNumberReservation.findUnique({
            where: { companyId_userId: { companyId, userId: actorId ?? '' } },
          });
          if (
            !reservation ||
            reservation.number !== data.reservedNumber ||
            reservation.expiresAt <= new Date()
          )
            throw new BadRequestException(
              'O número reservado para esta venda expirou. Atualize a tela e tente novamente.',
            );
          reservedNumber = reservation.number;
        }
        if (
          ['VENDA', 'TROCA'].includes(data.saleType) &&
          (data.status || 'CONCLUIDA') === 'CONCLUIDA'
        ) {
          const standardAccount = await tx.bankAccount.findFirst({
            where: {
              companyId,
              name: 'VENDAS - PADRAO AUTOMATICO',
              type: 'CASH',
              active: true,
              deletedAt: null,
            },
          });
          const account =
            standardAccount ??
            (await tx.bankAccount.create({
              data: {
                companyId,
                name: 'VENDAS - PADRAO AUTOMATICO',
                type: 'CASH',
              },
            }));
          data.bankAccountId = account.id;
        }
        const orderData = await this.buildOrderData(companyId, data, tx);
        const stockReserved =
          orderData.saleType === 'CONDICIONAL'
            ? await this.applyOrderStock(
                tx,
                companyId,
                orderData.items as Prisma.JsonValue,
                -1,
                true,
              )
            : false;
        const stockApplied = this.movesStock(orderData)
          ? await this.applyOrderStock(
              tx,
              companyId,
              orderData.items as Prisma.JsonValue,
              -1,
            )
          : false;
        const order = await tx.salesOrder.create({
          data: {
            companyId,
            ...(reservedNumber !== undefined ? { number: reservedNumber } : {}),
            ...orderData,
            stockApplied,
            stockReserved,
            requestId: data.requestId,
          },
        });
        if (reservedNumber !== undefined)
          await tx.salesOrderNumberReservation.delete({
            where: { companyId_userId: { companyId, userId: actorId ?? '' } },
          });
        await this.createOrderFinancials(
          tx,
          companyId,
          order,
          data.installments ?? 1,
        );
        const cardPayments = await validateCardPayments(
          tx,
          companyId,
          data,
          order,
        );
        await this.recordOrderEvent(tx, order, 'CRIADA', {
          requestId: data.requestId ?? null,
          requestSignature: this.requestSignature(data),
          cashTender: data.cashTender ?? null,
          cardPayments,
          refundConfirmed: data.refundConfirmed === true,
          actorId: actorId ?? null,
        });
        return { ...order, cardPayments, cashTender: data.cashTender ?? null };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  private async buildOrderData(
    companyId: string,
    data: CriarVendaDto,
    tx: Prisma.TransactionClient,
  ) {
    if (data.cashTender) {
      const tender = new Prisma.Decimal(data.cashTender);
      if (tender.lt(0) || tender.decimalPlaces() > 2)
        throw new BadRequestException('Dinheiro entregue inválido.');
    }
    if (!data.customerId || !data.sellerId)
      throw new BadRequestException(
        'Selecione um cliente e um vendedor para a venda.',
      );
    const ids = [...new Set(data.items.map((item) => item.productId))];
    const products = await tx.salesProduct.findMany({
      where: { companyId, active: true, showInSale: true, id: { in: ids } },
      include: {
        supplier: { select: { name: true } },
        variants: { where: { active: true } },
      },
    });
    if (products.length !== ids.length)
      throw new NotFoundException('Um ou mais produtos não foram encontrados.');
    if (products.some((product) => product.isGridParent))
      throw new BadRequestException(
        'Selecione o cadastro do tamanho/cor para vender. A matriz da grade não possui estoque próprio.',
      );
    const [customer, seller] = await Promise.all([
      tx.salesCustomer.findFirst({
        where: {
          id: data.customerId,
          companyId,
          ...(data.saleType === 'TROCA' ? {} : { active: true }),
        },
      }),
      tx.salesSeller.findFirst({
        where: { id: data.sellerId, companyId, active: true },
      }),
    ]);
    if (data.customerId && !customer)
      throw new BadRequestException('Cliente inválido para esta empresa.');
    if (data.sellerId && !seller)
      throw new BadRequestException('Vendedor inválido para esta empresa.');
    if (data.saleType === 'CONDICIONAL' && customer?.isSystem)
      throw new BadRequestException(
        'Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.',
      );
    if (
      data.saleType === 'VENDA' &&
      customer?.isSystem &&
      (data.paymentMethod === 'CREDIARIO' ||
        (data.paymentMethod === 'MISTO' &&
          Number(data.paymentDetails?.CREDIARIO || 0) > 0))
    )
      throw new BadRequestException(
        'CONSUMIDOR FINAL não pode ser usado em vendas a prazo.',
      );
    if (!data.items.length && data.saleType !== 'TROCA')
      throw new BadRequestException('Adicione ao menos um produto.');
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const items = data.items.map((item) => {
      const product = productsById.get(item.productId)!;
      const variant = item.variantId
        ? product.variants.find((entry) => entry.id === item.variantId)
        : undefined;
      if (item.variantId && !variant)
        throw new BadRequestException('Variação inválida para este produto.');
      if (product.variants.length && !variant)
        throw new BadRequestException('Selecione o tamanho/cor do produto.');
      const pricing = resolveSalesItemPrice(product, variant, item);
      const unitPrice = pricing.unitPrice;
      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        commission: '0',
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        barcode: variant?.barcode ?? product.barcode ?? null,
        allowDiscount: product.allowDiscount,
        allowAddition: product.allowAddition,
        stockManaged: product.manageStock,
        brand: product.brand ?? null,
        priceType: pricing.priceType,
        originalUnitPrice: pricing.originalUnitPrice,
        baseUnitPrice: pricing.baseUnitPrice,
        discount: pricing.discount,
        addition: pricing.addition,
        supplierId: product.supplierId,
        supplierName: product.supplier?.name ?? product.supplierName,
        unitPrice: unitPrice.toString(),
        quantity: item.quantity,
        subtotal: unitPrice
          .mul(item.quantity)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toString(),
      };
    });
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(data.discount || 0);
    const addition = new Prisma.Decimal(data.addition || 0);
    const discountEligible = items.reduce(
      (sum, item) =>
        item.priceType === 'PROMOCIONAL' ||
        productsById.get(item.productId)?.allowDiscount === false
          ? sum
          : sum.add(item.subtotal),
      new Prisma.Decimal(0),
    );
    const additionEligible = items.some(
      (item) => productsById.get(item.productId)?.allowAddition !== false,
    );
    if (discount.gt(discountEligible))
      throw new BadRequestException(
        'O desconto supera o valor dos produtos que permitem desconto.',
      );
    if (addition.gt(0) && !additionEligible)
      throw new BadRequestException(
        'Os produtos desta venda não permitem acréscimo.',
      );
    if (discount.gt(subtotal))
      throw new BadRequestException(
        'O desconto não pode ser maior que o subtotal.',
      );
    const returnData =
      data.saleType === 'TROCA'
        ? await this.prepareReturn(tx, companyId, data)
        : null;
    const total = subtotal
      .sub(discount)
      .add(addition)
      .sub(returnData ? returnData.returnTotal.sub(returnData.debtOffset) : 0);
    if (
      total.lt(0) &&
      data.returnDisposition === 'REFUND' &&
      data.refundConfirmed !== true
    )
      throw new BadRequestException(
        'Confirme a devolução efetiva do dinheiro, Pix ou cartão antes de registrar o reembolso.',
      );
    if (
      data.saleType === 'TROCA' &&
      (data.expectedTotal === undefined || !total.eq(data.expectedTotal))
    )
      throw new BadRequestException(
        'O valor da troca mudou. Feche e reabra o modal para conferir o saldo atualizado.',
      );
    const paymentDetails =
      ['VENDA', 'TROCA'].includes(data.saleType) && total.gt(0)
        ? this.validateOrderPayments(
            data.paymentMethod,
            data.paymentDetails,
            total,
            (data.status || 'CONCLUIDA') === 'CONCLUIDA',
          )
        : null;
    if (
      data.cashTender &&
      (data.status || 'CONCLUIDA') === 'CONCLUIDA' &&
      total.gt(0)
    ) {
      const cash =
        data.paymentMethod === 'DINHEIRO'
          ? total
          : new Prisma.Decimal(paymentDetails?.DINHEIRO ?? 0);
      if (new Prisma.Decimal(data.cashTender).lt(cash))
        throw new BadRequestException(
          'O valor entregue não cobre a parcela em dinheiro.',
        );
    }
    const onCredit =
      data.paymentMethod === 'CREDIARIO'
        ? total
        : new Prisma.Decimal(paymentDetails?.CREDIARIO ?? 0);
    if (
      ['VENDA', 'TROCA'].includes(data.saleType) &&
      onCredit.gt(0) &&
      customer?.referenceOnly
    )
      throw new BadRequestException(
        'Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.',
      );
    const finalizedSale =
      ['VENDA', 'TROCA'].includes(data.saleType) &&
      (data.status || 'CONCLUIDA') === 'CONCLUIDA';
    const customerCredit = total.gt(0)
      ? data.paymentMethod === 'SALDO_CLIENTE'
        ? total
        : new Prisma.Decimal(paymentDetails?.SALDO_CLIENTE ?? 0)
      : new Prisma.Decimal(0);
    if (
      finalizedSale &&
      customerCredit.gt(0) &&
      (!customer ||
        customer.isSystem ||
        (await this.customerCreditBalance(tx, companyId, customer.id)).lt(
          customerCredit,
        ))
    )
      throw new BadRequestException(
        'Saldo de crédito do cliente insuficiente.',
      );
    if (
      finalizedSale &&
      (total.sub(onCredit).sub(customerCredit).gt(0) ||
        (total.lt(0) && data.returnDisposition === 'REFUND')) &&
      !data.bankAccountId
    )
      throw new BadRequestException(
        'Selecione a conta ou caixa de recebimento/reembolso.',
      );
    if (
      finalizedSale &&
      total.lt(0) &&
      data.returnDisposition === 'REFUND' &&
      !['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'].includes(
        data.paymentMethod,
      )
    )
      throw new BadRequestException(
        'Escolha dinheiro, Pix ou cartão para o reembolso.',
      );
    if (
      finalizedSale &&
      total.lt(0) &&
      (!data.returnDisposition ||
        (data.returnDisposition === 'CREDIT' && customer?.isSystem))
    )
      throw new BadRequestException(
        'Escolha reembolso ou crédito. Para crédito, selecione um cliente identificado.',
      );
    if (onCredit.gt(0) && finalizedSale) {
      if (
        customer?.referenceOnly ||
        !customer?.address?.trim() ||
        !this.isValidCustomerDocument(customer?.document || '')
      )
        throw new BadRequestException(
          'Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.',
        );
      if (!customer || customer.isSystem || customer.creditBlocked)
        throw new BadRequestException(
          'Cliente bloqueado para compras a prazo.',
        );
      if (!customer.creditDays || customer.creditDays < 1)
        throw new BadRequestException(
          'Cadastre o prazo de crediário do cliente.',
        );
      const charges = await tx.contaReceber.findMany({
        where: {
          companyId,
          salesCustomerId: customer.id,
          cancelledAt: null,
          status: 'PENDING',
        },
        include: { payments: true },
      });
      const debt = charges.reduce(
        (sum, charge) =>
          sum.add(
            Prisma.Decimal.max(
              0,
              charge.amount.sub(
                charge.payments.reduce(
                  (paid, payment) =>
                    paid
                      .add(payment.amountPaid)
                      .add(payment.discount)
                      .sub(payment.interest),
                  new Prisma.Decimal(0),
                ),
              ),
            ),
          ),
        new Prisma.Decimal(0),
      );
      if (debt.add(onCredit).gt(customer.creditLimit))
        throw new BadRequestException(
          'O valor a prazo excede o limite disponível do cliente.',
        );
    }
    if (
      data.bankAccountId &&
      !(await tx.bankAccount.findFirst({
        where: {
          id: data.bankAccountId,
          companyId,
          active: true,
          deletedAt: null,
        },
      }))
    )
      throw new BadRequestException('Conta de recebimento inválida.');
    const commissionTotal = items
      .reduce((sum, item) => {
        const product = productsById.get(item.productId)!;
        if (!product.commissionEnabled) return sum;
        if (product.commissionType === 'FIXO') {
          const amount = product.commission
            .mul(item.quantity)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          item.commission = amount.toString();
          return sum.add(amount);
        }
        const rate =
          product.commissionType === 'VENDEDOR'
            ? seller!.commission
            : product.commission;
        const base = new Prisma.Decimal(item.subtotal);
        const net =
          product.commissionRule === 'VALOR_LIQUIDO' &&
          discountEligible.gt(0) &&
          product.allowDiscount !== false &&
          item.priceType !== 'PROMOCIONAL'
            ? base.mul(discountEligible.sub(discount)).div(discountEligible)
            : base;
        const amount = net
          .mul(rate)
          .div(100)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        item.commission = amount.toString();
        return sum.add(amount);
      }, new Prisma.Decimal(0))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return {
      completedAt: finalizedSale ? new Date() : null,
      installments: data.installments ?? 1,
      sellerId: seller?.id ?? null,
      customerId: customer?.id ?? null,
      sellerName: seller?.name ?? data.sellerName.trim(),
      customerName: customer?.name ?? data.customerName.trim(),
      saleType: data.saleType,
      items: items as Prisma.InputJsonValue,
      subtotal,
      discount,
      addition,
      total,
      commissionTotal: finalizedSale
        ? commissionTotal.sub(returnData?.returnedCommission ?? 0)
        : new Prisma.Decimal(0),
      bankAccountId: data.bankAccountId || null,
      paymentMethod: data.paymentMethod,
      paymentDetails: paymentDetails
        ? (paymentDetails as Prisma.InputJsonValue)
        : Prisma.DbNull,
      status: data.status || 'CONCLUIDA',
      notes: data.notes?.trim() || null,
      ...(returnData
        ? {
            originalOrderId: returnData.originalOrderId,
            returnedItems: returnData.items as Prisma.InputJsonValue,
            returnTotal: returnData.returnTotal,
            debtOffset: returnData.debtOffset,
            returnDisposition: data.returnDisposition || null,
            returnAdjustments: returnData.adjustments as Prisma.InputJsonValue,
          }
        : {}),
    };
  }

  async getCustomerCredit(companyId: string, customerId: string) {
    await this.ensureConfectionery(companyId);
    if (
      !(await this.prisma.salesCustomer.findFirst({
        where: { id: customerId, companyId, active: true },
      }))
    )
      throw new NotFoundException('Cliente não encontrado.');
    return {
      balance: (
        await this.customerCreditBalance(this.prisma, companyId, customerId)
      ).toString(),
    };
  }

  private async customerCreditBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    customerId: string,
  ) {
    return customerCreditBalance(tx, companyId, customerId);
  }

  async getReturnInfo(companyId: string, id: string) {
    await this.ensureConfectionery(companyId);
    const original = await this.prisma.salesOrder.findFirst({
      where: {
        id,
        companyId,
        status: 'CONCLUIDA',
        saleType: { in: ['VENDA', 'TROCA'] },
      },
    });
    if (!original)
      throw new NotFoundException(
        'Venda original não encontrada ou encerrada.',
      );
    if (
      original.total.gt(0) &&
      !(await this.prisma.contaReceber.count({
        where: { companyId, salesOrderId: original.id },
      }))
    )
      throw new BadRequestException(
        'Concilie os recebimentos da venda antiga antes de registrar uma troca ou devolução.',
      );
    const returns = await this.prisma.salesOrder.findMany({
      where: { companyId, originalOrderId: id, status: 'CONCLUIDA' },
      select: { returnedItems: true, returnTotal: true },
    });
    const items = original.items as Array<Record<string, unknown>>;
    const remaining = items.map((item, itemIndex) => ({
      itemIndex,
      name: String(item.name),
      variantName: item.variantName ? scalarText(item.variantName) : null,
      quantity: Number(item.quantity),
      available: Number(item.quantity),
    }));
    for (const order of returns)
      for (const item of order.returnedItems as Array<{
        itemIndex: number;
        quantity: number;
      }>)
        if (remaining[item.itemIndex])
          remaining[item.itemIndex].available -= item.quantity;
    const charges = await this.prisma.contaReceber.findMany({
      where: { companyId, salesOrderId: id, cancelledAt: null },
      include: { payments: true },
    });
    const outstanding = charges.reduce(
      (sum, charge) =>
        sum.add(
          Prisma.Decimal.max(
            0,
            charge.amount.sub(
              charge.payments.reduce(
                (paid, payment) =>
                  paid
                    .add(payment.amountPaid)
                    .add(payment.discount)
                    .sub(payment.interest),
                new Prisma.Decimal(0),
              ),
            ),
          ),
        ),
      new Prisma.Decimal(0),
    );
    const merchandiseTotal = original.subtotal
      .sub(original.discount)
      .add(original.addition);
    const customer = await this.prisma.salesCustomer.findFirstOrThrow({
      where: { id: original.customerId!, companyId },
    });
    return {
      order: original,
      customer,
      remainingReturnValue: Prisma.Decimal.max(
        0,
        merchandiseTotal.sub(
          returns.reduce(
            (sum, entry) => sum.add(entry.returnTotal),
            new Prisma.Decimal(0),
          ),
        ),
      ).toString(),
      items: remaining.map((item) => ({
        ...item,
        available: Number(item.available.toFixed(3)),
        unitReturnValue: original.subtotal.gt(0)
          ? new Prisma.Decimal(String(items[item.itemIndex].subtotal))
              .mul(merchandiseTotal)
              .div(original.subtotal)
              .div(item.quantity)
              .toNumber()
          : 0,
      })),
      outstanding: outstanding.toString(),
    };
  }

  private async prepareReturn(
    tx: Prisma.TransactionClient,
    companyId: string,
    data: CriarVendaDto,
  ) {
    if (
      !data.originalOrderId ||
      !data.returnedItems?.length ||
      data.status === 'EM_ANDAMENTO'
    )
      throw new BadRequestException(
        'Selecione a venda original e os itens devolvidos. Trocas/devoluções devem ser concluídas.',
      );
    const original = await tx.salesOrder.findFirst({
      where: {
        id: data.originalOrderId,
        companyId,
        status: 'CONCLUIDA',
        saleType: { in: ['VENDA', 'TROCA'] },
      },
    });
    if (!original || original.customerId !== data.customerId)
      throw new BadRequestException(
        'A venda original deve pertencer ao cliente selecionado e estar concluída.',
      );
    if (
      new Set(data.returnedItems.map((item) => item.itemIndex)).size !==
      data.returnedItems.length
    )
      throw new BadRequestException('Item devolvido duplicado.');
    if (
      original.total.gt(0) &&
      !(await tx.contaReceber.count({
        where: { companyId, salesOrderId: original.id },
      }))
    )
      throw new BadRequestException(
        'Concilie os recebimentos da venda antiga antes de registrar uma troca ou devolução.',
      );
    const previousReturns = await tx.salesOrder.findMany({
      where: { companyId, originalOrderId: original.id, status: 'CONCLUIDA' },
      select: { returnedItems: true, returnTotal: true },
    });
    const originalItems = original.items as Array<Record<string, unknown>>;
    const grossTotal = original.subtotal
      .sub(original.discount)
      .add(original.addition);
    let rawTotal = new Prisma.Decimal(0);
    const items = data.returnedItems.map((input) => {
      const source = originalItems[input.itemIndex];
      if (!source)
        throw new BadRequestException('Item não pertence à venda original.');
      const previousQuantity = previousReturns.reduce(
        (sum, order) =>
          sum.add(
            (
              order.returnedItems as Array<{
                itemIndex: number;
                quantity: number;
              }>
            )
              .filter((item) => item.itemIndex === input.itemIndex)
              .reduce((total, item) => total + item.quantity, 0),
          ),
        new Prisma.Decimal(0),
      );
      if (previousQuantity.add(input.quantity).gt(String(source.quantity)))
        throw new BadRequestException(
          'Quantidade devolvida maior que o saldo do item.',
        );
      if (original.subtotal.gt(0))
        rawTotal = rawTotal.add(
          new Prisma.Decimal(String(source.subtotal))
            .mul(grossTotal)
            .div(original.subtotal)
            .mul(input.quantity)
            .div(String(source.quantity)),
        );
      return {
        ...source,
        itemIndex: input.itemIndex,
        quantity: input.quantity,
      };
    });
    const alreadyReturned = previousReturns.reduce(
      (sum, order) => sum.add(order.returnTotal),
      new Prisma.Decimal(0),
    );
    const returnTotal = Prisma.Decimal.min(
      rawTotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      Prisma.Decimal.max(0, grossTotal.sub(alreadyReturned)),
    );
    const charges = await tx.contaReceber.findMany({
      where: { companyId, salesOrderId: original.id, cancelledAt: null },
      include: { payments: true },
      orderBy: { dueDate: 'desc' },
    });
    let remainingOffset = returnTotal;
    const adjustments: Array<Record<string, string | null>> = [];
    for (const charge of charges) {
      const settled = charge.payments.reduce(
        (sum, payment) =>
          sum
            .add(payment.amountPaid)
            .add(payment.discount)
            .sub(payment.interest),
        new Prisma.Decimal(0),
      );
      const offset = Prisma.Decimal.min(
        remainingOffset,
        Prisma.Decimal.max(0, charge.amount.sub(settled)),
      );
      if (offset.lte(0)) continue;
      const amount = charge.amount.sub(offset);
      const status = amount.lte(settled)
        ? ('PAID' as const)
        : ('PENDING' as const);
      const cancelledAt = amount.eq(0) ? new Date() : null;
      adjustments.push({
        id: charge.id,
        amount: charge.amount.toString(),
        status: charge.status,
        cancelledAt: charge.cancelledAt?.toISOString() ?? null,
        newAmount: amount.toString(),
        newStatus: status,
      });
      await tx.contaReceber.update({
        where: { id: charge.id },
        data: { amount, status, cancelledAt },
      });
      remainingOffset = remainingOffset.sub(offset);
    }
    await this.applyOrderStock(tx, companyId, items, 1);
    const returnedCommission = items
      .reduce((sum, item) => {
        const source = originalItems[item.itemIndex];
        return sum.add(
          source.commission != null
            ? new Prisma.Decimal(scalarText(source.commission))
                .mul(item.quantity)
                .div(String(source.quantity))
            : grossTotal.gt(0)
              ? original.commissionTotal
                  .mul(returnTotal)
                  .div(grossTotal)
                  .div(items.length)
              : 0,
        );
      }, new Prisma.Decimal(0))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return {
      originalOrderId: original.id,
      items,
      returnTotal,
      debtOffset: returnTotal.sub(remainingOffset),
      adjustments,
      returnedCommission,
    };
  }

  private movesStock(order: { status: string; saleType: string }) {
    return (
      order.status === 'CONCLUIDA' &&
      ['VENDA', 'TROCA'].includes(order.saleType)
    );
  }

  private async lockCompany(tx: Prisma.TransactionClient, companyId: string) {
    await tx.$queryRaw`SELECT "id" FROM "empresas" WHERE "id" = ${companyId} FOR UPDATE`;
  }

  private requestSignature(data: CriarVendaDto) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(
        ([key]) => !['version', 'requestId', 'reservedNumber'].includes(key),
      ),
    );
    const canonical = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([, v]) => v !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, canonical(v)]),
            )
          : value;
    return JSON.stringify(canonical(payload));
  }

  async orderByRequest(companyId: string, requestId: string) {
    await this.ensureConfectionery(companyId);
    const order = await this.prisma.salesOrder.findFirst({
      where: {
        companyId,
        OR: [
          { requestId },
          {
            events: {
              some: { details: { path: ['requestId'], equals: requestId } },
            },
          },
        ],
      },
      orderBy: { number: 'desc' },
    });
    if (!order)
      throw new NotFoundException(
        'Tentativa ainda não localizada. Mantenha o atendimento e tente consultar novamente.',
      );
    return this.orderDetails(companyId, order.id);
  }

  private validateOrderPayments(
    method: string,
    details: Record<string, unknown> | undefined,
    total: Prisma.Decimal,
    requireTotal = true,
  ) {
    if (method !== 'MISTO') return null;
    const aliases: Record<string, string> = {
      DEBITO: 'CARTAO_DEBITO',
      CREDITO: 'CARTAO_CREDITO',
    };
    const allowed = [
      'DINHEIRO',
      'PIX',
      'CARTAO_DEBITO',
      'CARTAO_CREDITO',
      'CREDIARIO',
      'SALDO_CLIENTE',
    ];
    if ((!details || !Object.keys(details).length) && !requireTotal) return {};
    if (!details || !Object.keys(details).length)
      throw new BadRequestException('Informe as partes do pagamento misto.');
    const normalized: Record<string, number> = {};
    let sum = new Prisma.Decimal(0);
    for (const [key, value] of Object.entries(details)) {
      const canonical = aliases[key] || key;
      if (
        !allowed.includes(canonical) ||
        canonical in normalized ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        new Prisma.Decimal(value).decimalPlaces() > 2
      )
        throw new BadRequestException('Parte do pagamento misto inválida.');
      normalized[canonical] = value;
      sum = sum.add(value);
    }
    if (requireTotal && !sum.eq(total))
      throw new BadRequestException(
        'A soma dos pagamentos deve ser igual ao total da venda.',
      );
    return normalized;
  }

  private async recordOrderEvent(
    tx: Prisma.TransactionClient,
    order: Prisma.SalesOrderGetPayload<Record<string, never>>,
    action: string,
    details: Prisma.InputJsonObject,
  ) {
    await tx.salesOrderEvent.create({
      data: {
        orderId: order.id,
        action,
        details: {
          ...details,
          version: order.version,
          saleType: order.saleType,
          status: order.status,
          items: order.items as Prisma.InputJsonValue,
          total: order.total.toString(),
          stockApplied: order.stockApplied,
          stockReserved: order.stockReserved,
          commissionTotal: order.commissionTotal.toString(),
        },
      },
    });
  }

  private async createOrderFinancials(
    tx: Prisma.TransactionClient,
    companyId: string,
    order: Prisma.SalesOrderGetPayload<Record<string, never>>,
    installments: number,
  ) {
    if (
      order.status !== 'CONCLUIDA' ||
      !['VENDA', 'TROCA'].includes(order.saleType)
    )
      return;
    if (order.total.lt(0)) {
      const payable = await tx.contaPagar.create({
        data: {
          companyId,
          salesReturnId: order.id,
          personName: order.customerName,
          description: `DEVOLUÇÃO DA VENDA #${order.number}`,
          category: 'DEVOLUÇÕES DE VENDAS',
          amount: order.total.neg(),
          issueDate: new Date(),
          dueDate: new Date(),
          status: order.returnDisposition === 'CREDIT' ? 'PENDING' : 'PAID',
          manual: false,
        },
      });
      if (order.returnDisposition === 'CREDIT')
        await tx.salesCustomerCredit.create({
          data: {
            companyId,
            customerId: order.customerId!,
            orderId: order.id,
            amount: order.total.neg(),
            reason: 'CRÉDITO POR TROCA/DEVOLUÇÃO',
          },
        });
      else {
        const method = (
          {
            DINHEIRO: 'CASH',
            PIX: 'PIX',
            CARTAO_DEBITO: 'DEBIT_CARD',
            CARTAO_CREDITO: 'CREDIT_CARD',
          } as Record<string, PaymentMethod>
        )[order.paymentMethod];
        await tx.pagamentoRealizado.create({
          data: {
            expenseId: payable.id,
            paidAt: new Date(),
            method,
            amountPaid: order.total.neg(),
            note: 'REEMBOLSO POR TROCA/DEVOLUÇÃO',
          },
        });
        await tx.bankTransaction.create({
          data: {
            bankAccountId: order.bankAccountId!,
            type: 'OUTFLOW',
            status: 'CONFIRMED',
            amount: order.total.neg(),
            description: `REEMBOLSO DA DEVOLUÇÃO #${order.number}`,
            competenceDate: new Date(),
            paymentDate: new Date(),
            category: 'DEVOLUÇÕES DE VENDAS',
            referenceType: 'SALES_RETURN',
            referenceId: order.id,
          },
        });
        await tx.bankAccount.update({
          where: { id: order.bankAccountId! },
          data: { currentBalance: { decrement: order.total.neg() } },
        });
      }
      return;
    }
    if (order.total.eq(0)) return;
    if (
      await tx.contaReceber.count({
        where: { companyId, salesOrderId: order.id },
      })
    )
      throw new BadRequestException(
        'A venda já possui lançamentos financeiros.',
      );
    const parts =
      order.paymentMethod === 'MISTO'
        ? (order.paymentDetails as Record<string, number>)
        : { [order.paymentMethod]: order.total.toNumber() };
    const customer = await tx.salesCustomer.findFirstOrThrow({
      where: { id: order.customerId!, companyId },
    });
    const methods: Record<string, PaymentMethod> = {
      DINHEIRO: 'CASH',
      PIX: 'PIX',
      CARTAO_DEBITO: 'DEBIT_CARD',
      CARTAO_CREDITO: 'CREDIT_CARD',
      SALDO_CLIENTE: 'OTHER',
    };
    const now = new Date();
    for (const [method, value] of Object.entries(parts)) {
      if (value <= 0) continue;
      const credit = method === 'CREDIARIO';
      const count = credit ? installments : 1;
      const cents = new Prisma.Decimal(value).mul(100).toNumber();
      if (count > cents)
        throw new BadRequestException(
          'O valor não permite essa quantidade de parcelas.',
        );
      for (let index = 0; index < count; index++) {
        const amount = new Prisma.Decimal(
          Math.floor(cents / count) + (index < cents % count ? 1 : 0),
        ).div(100);
        const dueDate = new Date(now);
        if (credit)
          dueDate.setUTCDate(
            dueDate.getUTCDate() + customer.creditDays! * (index + 1),
          );
        const charge = await tx.contaReceber.create({
          data: {
            companyId,
            salesOrderId: order.id,
            salesCustomerId: customer.id,
            propertyName: `VENDA #${order.number} · ${method}`,
            tenantName: order.customerName,
            issueDate: now,
            dueDate,
            amount,
            status: credit ? 'PENDING' : 'PAID',
            manual: false,
            installmentNumber: index + 1,
            installmentTotal: count,
            installmentGroupId: order.id,
          },
        });
        if (!credit) {
          await tx.pagamentoRecebido.create({
            data: {
              chargeId: charge.id,
              paidAt: now,
              method: methods[method],
              amountPaid: amount,
              note: `RECEBIMENTO MANUAL DA VENDA #${order.number}`,
            },
          });
          if (method === 'SALDO_CLIENTE') {
            await tx.salesCustomerCredit.create({
              data: {
                companyId,
                customerId: customer.id,
                orderId: order.id,
                amount: amount.neg(),
                reason: 'UTILIZAÇÃO EM VENDA',
              },
            });
            await this.settleCustomerCreditPayables(
              tx,
              companyId,
              customer.id,
              order.id,
              amount,
            );
          }
          if (order.bankAccountId && method !== 'SALDO_CLIENTE') {
            await tx.bankTransaction.create({
              data: {
                bankAccountId: order.bankAccountId,
                type: 'INFLOW',
                status: 'CONFIRMED',
                amount,
                description: `VENDA #${order.number} · ${method}`,
                competenceDate: now,
                paymentDate: now,
                category: 'VENDAS',
                referenceType: 'RECEIVABLE',
                referenceId: charge.id,
              },
            });
            await tx.bankAccount.update({
              where: { id: order.bankAccountId },
              data: { currentBalance: { increment: amount } },
            });
          }
        }
      }
    }
  }

  private async reverseOrderFinancials(
    tx: Prisma.TransactionClient,
    companyId: string,
    orderId: string,
    actorId?: string,
    reason = 'Estorno comercial',
  ) {
    const charges = await tx.contaReceber.findMany({
      where: { companyId, salesOrderId: orderId, cancelledAt: null },
    });
    const ids = charges.map((charge) => charge.id);
    const transactions = await tx.bankTransaction.findMany({
      where: {
        bankAccount: { companyId },
        OR: [
          { referenceType: 'RECEIVABLE', referenceId: { in: ids } },
          { referenceType: 'SALES_RETURN', referenceId: orderId },
        ],
      },
    });
    for (const transaction of transactions) {
      if (transaction.status !== 'CONFIRMED')
        throw new BadRequestException(
          'Concilie as movimentações bancárias pendentes antes de estornar a venda.',
        );
      await tx.salesRefund.create({
        data: {
          companyId,
          orderId,
          transactionId: transaction.id,
          amount: transaction.amount,
          actorId: actorId ?? null,
          reason: reason.trim(),
        },
      });
    }
    await tx.contaReceber.updateMany({
      where: { companyId, id: { in: ids } },
      data: { cancelledAt: new Date() },
    });
  }

  private async undoReturnAndCredit(
    tx: Prisma.TransactionClient,
    companyId: string,
    order: Prisma.SalesOrderGetPayload<Record<string, never>>,
  ) {
    const credits = await tx.salesCustomerCredit.findMany({
      where: { companyId, orderId: order.id, reversedAt: null },
    });
    const creditDelta = credits.reduce(
      (sum, entry) => sum.add(entry.amount),
      new Prisma.Decimal(0),
    );
    if (
      creditDelta.gt(0) &&
      (await this.customerCreditBalance(tx, companyId, order.customerId!))
        .sub(creditDelta)
        .lt(0)
    )
      throw new BadRequestException(
        'O crédito desta devolução já foi utilizado. Estorne primeiro as vendas que utilizaram o saldo.',
      );
    const sourcePayables = await tx.contaPagar.findMany({
      where: { companyId, salesReturnId: order.id, cancelledAt: null },
      include: { payments: true },
    });
    if (
      order.returnDisposition === 'CREDIT' &&
      sourcePayables.some((payable) =>
        payable.payments
          .reduce(
            (sum, payment) => sum.add(payment.amountPaid),
            new Prisma.Decimal(0),
          )
          .gt(0),
      )
    )
      throw new BadRequestException(
        'O crédito desta devolução já foi utilizado. Estorne primeiro as vendas que utilizaram o saldo.',
      );
    const usages = await tx.pagamentoRealizado.findMany({
      where: {
        expense: { companyId, salesReturnId: { not: null }, cancelledAt: null },
        note: 'CRÉDITO UTILIZADO NA VENDA ' + order.id,
      },
    });
    for (const usage of usages) {
      await tx.pagamentoRealizado.create({
        data: {
          expenseId: usage.expenseId,
          paidAt: new Date(),
          method: 'OTHER',
          amountPaid: usage.amountPaid.neg(),
          note: 'ESTORNO DE UTILIZAÇÃO DE CRÉDITO ' + order.id,
        },
      });
      await tx.contaPagar.update({
        where: { id: usage.expenseId },
        data: { status: 'PENDING' },
      });
    }
    await tx.contaPagar.updateMany({
      where: { companyId, salesReturnId: order.id, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });
    await tx.salesCustomerCredit.updateMany({
      where: { companyId, orderId: order.id, reversedAt: null },
      data: { reversedAt: new Date() },
    });
    if (!order.originalOrderId) return;
    if (
      await tx.salesOrder.count({
        where: {
          companyId,
          originalOrderId: order.originalOrderId,
          number: { gt: order.number },
          status: 'CONCLUIDA',
        },
      })
    )
      throw new BadRequestException(
        'Estorne as devoluções mais recentes desta venda primeiro.',
      );
    await this.applyOrderStock(tx, companyId, order.returnedItems, -1);
    for (const adjustment of (order.returnAdjustments as Array<{
      id: string;
      amount: string;
      newAmount: string;
      cancelledAt: string | null;
    }>) ?? []) {
      const charge = await tx.contaReceber.findFirst({
        where: {
          id: adjustment.id,
          companyId,
          salesOrderId: order.originalOrderId,
        },
        include: { payments: true },
      });
      if (!charge || !charge.amount.eq(adjustment.newAmount))
        throw new BadRequestException(
          'O recebível de origem foi alterado. Revise os lançamentos antes de estornar.',
        );
      const paid = charge.payments.reduce(
        (sum, payment) =>
          sum
            .add(payment.amountPaid)
            .add(payment.discount)
            .sub(payment.interest),
        new Prisma.Decimal(0),
      );
      await tx.contaReceber.update({
        where: { id: charge.id },
        data: {
          amount: adjustment.amount,
          status: paid.gte(adjustment.amount) ? 'PAID' : 'PENDING',
          cancelledAt: adjustment.cancelledAt
            ? new Date(adjustment.cancelledAt)
            : null,
        },
      });
    }
  }

  private async settleCustomerCreditPayables(
    tx: Prisma.TransactionClient,
    companyId: string,
    customerId: string,
    orderId: string,
    amount: Prisma.Decimal,
  ) {
    const payables = await tx.contaPagar.findMany({
      where: {
        companyId,
        cancelledAt: null,
        salesReturn: {
          customerId,
          returnDisposition: 'CREDIT',
          status: 'CONCLUIDA',
        },
      },
      include: { payments: true },
      orderBy: { createdAt: 'asc' },
    });
    let remaining = amount;
    for (const payable of payables) {
      const settled = payable.payments.reduce(
        (sum, payment) => sum.add(payment.amountPaid),
        new Prisma.Decimal(0),
      );
      const used = Prisma.Decimal.min(
        remaining,
        Prisma.Decimal.max(0, payable.amount.sub(settled)),
      );
      if (used.lte(0)) continue;
      await tx.pagamentoRealizado.create({
        data: {
          expenseId: payable.id,
          paidAt: new Date(),
          method: 'OTHER',
          amountPaid: used,
          note: 'CRÉDITO UTILIZADO NA VENDA ' + orderId,
        },
      });
      await tx.contaPagar.update({
        where: { id: payable.id },
        data: {
          status: settled.add(used).gte(payable.amount) ? 'PAID' : 'PENDING',
        },
      });
      remaining = remaining.sub(used);
    }
    // Ajustes manuais são obrigações no livro complementar, sem título legado.
    // O saldo total já foi validado sob o mesmo bloqueio de empresa.
    if (remaining.gt(0)) {
      const adjustments = await tx.salesCreditAdjustment.aggregate({
        where: { companyId, customerId },
        _sum: { amount: true },
      });
      if (remaining.gt(adjustments._sum.amount ?? 0))
        throw new BadRequestException(
          'O saldo de crédito não confere com os lançamentos financeiros. Revise o cadastro.',
        );
    }
  }

  private async applyOrderStock(
    tx: Prisma.TransactionClient,
    companyId: string,
    rawItems: Prisma.JsonValue,
    direction: 1 | -1,
    reserve = false,
  ) {
    if (!Array.isArray(rawItems)) return false;
    const quantities = new Map<
      string,
      { productId: string; variantId: string | null; quantity: Prisma.Decimal }
    >();
    for (const value of rawItems) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const item = value;
      if (item.stockManaged !== true || typeof item.productId !== 'string')
        continue;
      const quantity = new Prisma.Decimal(scalarText(item.quantity ?? 0));
      const variantId =
        typeof item.variantId === 'string' ? item.variantId : null;
      const key = item.productId + ':' + (variantId || '');
      quantities.set(key, {
        productId: item.productId,
        variantId,
        quantity: (quantities.get(key)?.quantity ?? new Prisma.Decimal(0)).add(
          quantity,
        ),
      });
    }
    for (const { productId, variantId, quantity } of quantities.values()) {
      const product = await tx.salesProduct.findFirst({
        where: { id: productId, companyId },
      });
      if (
        !product ||
        (reserve && direction === 1 && product.reservedStock.lt(quantity))
      )
        throw new BadRequestException(
          'Estoque disponível insuficiente ou reserva inconsistente.',
        );
      const changes = reserve
        ? {
            reservedStock:
              direction === -1
                ? { increment: quantity }
                : { decrement: quantity },
          }
        : {
            stock:
              direction === -1
                ? { decrement: quantity }
                : { increment: quantity },
          };
      if (variantId) {
        const variant = await tx.salesProductVariant.findFirst({
          where: { id: variantId, productId, companyId },
        });
        if (
          !variant ||
          (direction === -1 && !variant.active) ||
          (reserve && direction === 1 && variant.reservedStock.lt(quantity))
        )
          throw new BadRequestException(
            'Estoque da variação insuficiente ou reserva inconsistente.',
          );
        await tx.salesProductVariant.update({
          where: { id: variant.id },
          data: changes,
        });
      }
      const result = await tx.salesProduct.updateMany({
        where: { id: productId, companyId },
        data: changes,
      });
      if (!result.count)
        throw new BadRequestException(
          direction === -1
            ? 'Estoque insuficiente para concluir a venda.'
            : 'Não foi possível restaurar o estoque do produto.',
        );
      await tx.salesStockMovement.create({
        data: {
          companyId,
          productId,
          stockChange: reserve ? 0 : quantity.mul(direction),
          reservedChange: reserve ? quantity.mul(-direction) : 0,
          reason:
            (variantId ? 'VARIAÇÃO ' + variantId + ' · ' : '') +
            (reserve
              ? direction === -1
                ? 'RESERVA EM CONDICIONAL'
                : 'LIBERAÇÃO DE CONDICIONAL'
              : direction === -1
                ? 'SAÍDA POR VENDA'
                : 'REPOSIÇÃO POR ESTORNO OU DEVOLUÇÃO'),
        },
      });
    }
    return quantities.size > 0;
  }

  private async ensureConfectionery(companyId: string) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { companyId },
      select: { companySettings: true },
    });
    const companySettings = settings?.companySettings as Record<
      string,
      unknown
    > | null;
    if (companySettings?.ramoAtividade !== 'CONFECCOES')
      throw new ForbiddenException(
        'O módulo de Vendas está disponível somente para empresas do ramo de Confecções.',
      );
  }
}
