import {
  Body,
  Controller,
  Delete,
  Get,
  ForbiddenException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { AtualizarProdutoVendaDto } from './dto/atualizar-produto-venda.dto';
import { AtualizarClienteVendaDto } from './dto/atualizar-cliente-venda.dto';
import { CriarClienteVendaDto } from './dto/criar-cliente-venda.dto';
import { CriarProdutoVendaDto } from './dto/criar-produto-venda.dto';
import { CriarVendedorVendaDto } from './dto/criar-vendedor-venda.dto';
import { AtualizarVendedorVendaDto } from './dto/atualizar-vendedor-venda.dto';
import { CriarFornecedorVendaDto } from './dto/criar-fornecedor-venda.dto';
import { AtualizarFornecedorVendaDto } from './dto/atualizar-fornecedor-venda.dto';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { EstornarVendaDto } from './dto/estornar-venda.dto';
import { CriarClassificacaoProdutoDto } from './dto/criar-classificacao-produto.dto';
import { CriarGradeProdutoDto } from './dto/criar-grade-produto.dto';
import { VendasService } from './vendas.service';
import { CriarUnidadeProdutoDto } from './dto/criar-unidade-produto.dto';

@Controller('vendas')
@RequireToolPermission('sales')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class VendasController {
  constructor(private readonly service: VendasService) {}

  private requireFinancialAuthorization(user: UsuarioAutenticado) {
    if (!['OWNER', 'ADMIN', 'SYSTEM_OWNER', 'DONO_SISTEMA'].includes(user.role))
      throw new ForbiddenException(
        'Somente proprietário ou administrador pode autorizar estornos e devoluções financeiras.',
      );
  }

  @RequireToolAction('view')
  @Get('produtos/unidades')
  listProductUnits(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listProductUnits(user.companyId);
  }

  @RequireToolAction('create')
  @Post('produtos/unidades')
  createProductUnit(
    @Body() data: CriarUnidadeProdutoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createProductUnit(user.companyId, data);
  }

  @RequireToolAction('view')
  @Get('contas-recebimento')
  listReceivingAccounts(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listReceivingAccounts(user.companyId);
  }
  @RequireToolAction('view')
  @Get('clientes/:id/saldo')
  customerCredit(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.getCustomerCredit(user.companyId, id);
  }
  @RequireToolAction('view')
  @Get('pedidos/:id/devolucao')
  returnInfo(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.service.getReturnInfo(user.companyId, id);
  }

  @RequireToolAction('view')
  @Get('produtos/verificar-gtin')
  checkProductGtin(
    @Query('barcode') barcode: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.checkProductGtin(user.companyId, barcode, excludeId);
  }

  @RequireToolAction('view')
  @Get('clientes')
  listCustomers(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listCustomers(user.companyId);
  }
  @RequireToolAction('view')
  @Get('clientes/verificar-documento')
  checkCustomerDocument(
    @Query('document') document: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.checkCustomerDocument(
      user.companyId,
      document,
      excludeId,
    );
  }
  @RequireToolAction('view')
  @Get('clientes/consultar-cnpj/:cnpj')
  lookupCompany(
    @Param('cnpj') cnpj: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.lookupCompanyByCnpj(user.companyId, cnpj);
  }
  @RequireToolAction('view')
  @Get('clientes/consultar-cep')
  lookupAddress(
    @Query('cep') cep: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.lookupAddressByZipCode(user.companyId, cep);
  }
  @RequireToolAction('create')
  @Post('clientes')
  createCustomer(
    @Body() data: CriarClienteVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createCustomer(user.companyId, data);
  }
  @RequireToolAction('edit')
  @Patch('clientes/:id')
  updateCustomer(
    @Param('id') id: string,
    @Body() data: AtualizarClienteVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.updateCustomer(user.companyId, id, data);
  }
  @RequireToolAction('delete')
  @Delete('clientes/:id/excluir')
  deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.deleteCustomer(user.companyId, id);
  }
  @RequireToolAction('delete')
  @Delete('clientes/:id')
  archiveCustomer(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.archiveCustomer(user.companyId, id);
  }

  @RequireToolAction('view')
  @Get('produtos/categorias')
  listProductCategories(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listProductCategories(user.companyId);
  }
  @RequireToolAction('create')
  @Post('produtos/categorias')
  createProductCategory(
    @Body() data: CriarClassificacaoProdutoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createProductCategory(user.companyId, data);
  }
  @RequireToolAction('view')
  @Get('produtos/marcas')
  listProductBrands(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listProductBrands(user.companyId);
  }
  @RequireToolAction('create')
  @Post('produtos/marcas')
  createProductBrand(
    @Body() data: CriarClassificacaoProdutoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createProductBrand(user.companyId, data);
  }
  @RequireToolAction('view')
  @Get('produtos/grades')
  listProductGrids(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listProductGrids(user.companyId);
  }
  @RequireToolAction('create')
  @Post('produtos/grades')
  createProductGrid(
    @Body() data: CriarGradeProdutoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createProductGrid(user.companyId, data);
  }
  @RequireToolAction('view')
  @Get('produtos')
  listProducts(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listProducts(user.companyId);
  }
  @RequireToolAction('create')
  @Post('produtos')
  createProduct(
    @Body() data: CriarProdutoVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createProduct(user.companyId, data, user.id);
  }
  @RequireToolAction('edit')
  @Patch('produtos/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() data: AtualizarProdutoVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.updateProduct(user.companyId, id, data, user.id);
  }
  @RequireToolAction('view')
  @Get('produtos/:id/historico-precos')
  productPriceHistory(
    @Param('id') id: string,
    @Query('cursor') cursor: string | undefined,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.listProductPriceHistory(user.companyId, id, cursor);
  }
  @RequireToolAction('delete')
  @Delete('produtos/:id')
  deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.deleteProduct(user.companyId, id);
  }
  @RequireToolAction('view')
  @Get('vendedores')
  listSellers(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listSellers(user.companyId);
  }
  @RequireToolAction('view')
  @Get(['vendedores/verificar-cpf', 'vendedores/verificar-documento'])
  checkSellerDocument(
    @Query('document') document: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.checkSellerDocument(
      user.companyId,
      document,
      excludeId,
    );
  }
  @RequireToolAction('create')
  @Post('vendedores')
  createSeller(
    @Body() data: CriarVendedorVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createSeller(user.companyId, data);
  }
  @RequireToolAction('edit')
  @Patch('vendedores/:id')
  updateSeller(
    @Param('id') id: string,
    @Body() data: AtualizarVendedorVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.updateSeller(user.companyId, id, data);
  }
  @RequireToolAction('delete')
  @Delete('vendedores/:id')
  archiveSeller(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.archiveSeller(user.companyId, id);
  }
  @RequireToolAction('delete')
  @Delete('vendedores/:id/excluir')
  deleteSeller(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.deleteSeller(user.companyId, id);
  }
  @RequireToolAction('view')
  @Get('fornecedores/consultar-cnpj/:cnpj')
  lookupSupplierCompany(
    @Param('cnpj') cnpj: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.lookupCompanyByCnpj(user.companyId, cnpj);
  }
  @RequireToolAction('view')
  @Get('fornecedores')
  listSuppliers(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listSuppliers(user.companyId);
  }
  @RequireToolAction('create')
  @Post('fornecedores')
  createSupplier(
    @Body() data: CriarFornecedorVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.createSupplier(user.companyId, data);
  }
  @RequireToolAction('edit')
  @Patch('fornecedores/:id')
  updateSupplier(
    @Param('id') id: string,
    @Body() data: AtualizarFornecedorVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.updateSupplier(user.companyId, id, data);
  }
  @RequireToolAction('delete')
  @Delete('fornecedores/:id')
  archiveSupplier(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.archiveSupplier(user.companyId, id);
  }
  @RequireToolAction('view')
  @Get('pedidos')
  listOrders(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('before') before?: string,
  ) {
    return this.service.listOrders(user.companyId, before);
  }
  @RequireToolAction('create')
  @Post('pedidos')
  createOrder(
    @Body() data: CriarVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    if (data.refundConfirmed || data.returnDisposition === 'CREDIT')
      this.requireFinancialAuthorization(user);
    return this.service.createOrder(user.companyId, data, user.id);
  }
  @RequireToolAction('view')
  @Get('pedidos/:id')
  orderDetails(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.orderDetails(user.companyId, id);
  }
  @RequireToolAction('edit')
  @Patch('pedidos/:id')
  updateOrder(
    @Param('id') id: string,
    @Body() data: CriarVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    if (data.refundConfirmed || data.returnDisposition === 'CREDIT')
      this.requireFinancialAuthorization(user);
    return this.service.updateOrder(user.companyId, id, data, user.id);
  }
  @RequireToolAction('delete')
  @Post('pedidos/:id/estornar')
  reverseOrder(
    @Param('id') id: string,
    @Body() data: EstornarVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    this.requireFinancialAuthorization(user);
    return this.service.reverseOrder(user.companyId, id, data.reason, user.id);
  }
  @RequireToolAction('delete')
  @Post('pedidos/:id/descartar')
  discardOrder(
    @Param('id') id: string,
    @Body() data: EstornarVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.service.discardOrder(user.companyId, id, data.reason, user.id);
  }

  @RequireToolAction('delete')
  @Post('pedidos/:id/cancelar')
  async cancelOrder(
    @Param('id') id: string,
    @Body() data: EstornarVendaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    const order = await this.service.orderDetails(user.companyId, id);
    if (order.status !== 'EM_ANDAMENTO')
      this.requireFinancialAuthorization(user);
    return this.service.cancelOrder(user.companyId, id, data.reason, user.id);
  }
}
