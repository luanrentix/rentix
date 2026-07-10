import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ChamadosService {
  private readonly logger = new Logger(ChamadosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarChamadoDto, userId: string, companyId: string) {
    // 1. Criar no banco de dados
    const chamado = await this.prisma.supportTicket.create({
      data: {
        subject: data.subject,
        message: data.message,
        userId,
        companyId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        company: {
          select: {
            tradeName: true,
            companyName: true,
          },
        },
      },
    });

    // 2. Enviar e-mail para o dono do sistema
    // Dispara de forma assíncrona para não atrasar a resposta da API
    this.enviarNotificacaoEmail(chamado).catch((err) => {
      this.logger.error(
        'Falha ao enviar e-mail de notificacao do chamado:',
        err,
      );
    });

    return chamado;
  }

  async findAll(userId: string, companyId: string, role: string) {
    const isSystemOwner = role === 'SYSTEM_OWNER' || role === 'DONO_SISTEMA';

    if (isSystemOwner) {
      // Dono do sistema visualiza todos os chamados
      return this.prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          company: {
            select: {
              tradeName: true,
            },
          },
        },
      });
    }

    // Usuário comum visualiza apenas os chamados da sua própria empresa
    return this.prisma.supportTicket.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        company: {
          select: {
            tradeName: true,
          },
        },
      },
    });
  }

  async responder(id: string, responseText: string) {
    const chamado = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!chamado) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    // Update status to RESPONDIDO and store response
    const updatedChamado = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'RESPONDIDO',
        response: responseText,
      },
    });

    // Send email to the customer who created the ticket
    await this.enviarEmailResposta(
      chamado.user.email,
      chamado.user.name,
      chamado.subject,
      chamado.message,
      responseText,
    );

    return updatedChamado;
  }

  async clienteAcao(
    id: string,
    action: 'reply' | 'close',
    replyText: string | undefined,
    companyId: string,
  ) {
    const chamado = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!chamado) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    if (chamado.companyId !== companyId) {
      throw new ForbiddenException('Acesso negado.');
    }

    if (action === 'close') {
      return this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'FECHADO',
        },
      });
    }

    if (action === 'reply') {
      if (!replyText || !replyText.trim()) {
        throw new BadRequestException('A mensagem de resposta é obrigatória.');
      }

      const updatedMessage = `${chamado.message}\n\n--- Minha Resposta em ${new Date().toLocaleDateString('pt-BR')} ---\n${replyText}`;

      const updatedTicket = await this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'ABERTO',
          message: updatedMessage,
          response: null, // Clear developer's response until next reply
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          company: {
            select: {
              tradeName: true,
              companyName: true,
            },
          },
        },
      });

      // Send email to system owners notifying them that the customer replied
      this.enviarNotificacaoEmail(updatedTicket).catch((err) => {
        this.logger.error(
          'Falha ao enviar e-mail de notificacao do chamado:',
          err,
        );
      });

      return updatedTicket;
    }
  }

  private async enviarEmailResposta(
    email: string,
    name: string,
    subject: string,
    originalMessage: string,
    responseText: string,
  ) {
    const smtpPort = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : 587;
    const smtpFrom =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'Contrx <no-reply@contrx.com.br>';

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `[SUPORTE CONTRX] Resposta ao seu chamado: ${subject}`,
      text: [
        `Olá, ${name}!`,
        ``,
        `Seu chamado de suporte foi respondido pelo desenvolvedor/proprietário do sistema.`,
        ``,
        `--- Sua Mensagem Original ---`,
        originalMessage,
        `-----------------------------`,
        ``,
        `--- Resposta do Suporte ---`,
        responseText,
        `---------------------------`,
        ``,
        `Obrigado por utilizar o Contrx!`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="margin: 0 0 16px; color: #ff4b00; border-bottom: 2px solid #ff4b00; padding-bottom: 8px;">
            Resposta ao seu chamado
          </h2>
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Seu chamado de suporte foi respondido pelo desenvolvedor/proprietário do sistema.</p>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px; margin: 15px 0; border: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
            <strong>Mensagem Original:</strong><br/>
            ${originalMessage}
          </div>

          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #ff4b00; white-space: pre-wrap;">
            <strong>Resposta do Suporte:</strong><br/>
            ${responseText}
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 13px; color: #64748b; text-align: center;">
            Atenciosamente,<br/>
            <strong>Equipe Contrx</strong>
          </p>
        </div>
      `,
    });
  }

  private async enviarNotificacaoEmail(chamado: any) {
    const smtpPort = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : 587;
    const smtpFrom =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'Contrx <no-reply@contrx.com.br>';

    // Procurar donos do sistema no banco
    const systemOwners = await this.prisma.user.findMany({
      where: {
        role: 'SYSTEM_OWNER',
        isActive: true,
      },
      select: {
        email: true,
      },
    });

    // Destinatários: adm@contrx.com + emails dos SYSTEM_OWNERs encontrados
    const destinatariosSet = new Set<string>(['adm@contrx.com']);
    systemOwners.forEach((owner) => {
      if (owner.email) destinatariosSet.add(owner.email);
    });
    const destinatarios = Array.from(destinatariosSet).join(', ');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const infoEmpresa =
      chamado.company.tradeName ||
      chamado.company.companyName ||
      'Nao identificada';
    const infoUsuario = `${chamado.user.name} (${chamado.user.email})`;

    await transporter.sendMail({
      from: smtpFrom,
      to: destinatarios,
      subject: `[SUPORTE CONTRX] Novo Chamado: ${chamado.subject}`,
      text: [
        `Ola, Dono do Sistema!`,
        ``,
        `Um novo chamado de suporte foi aberto na plataforma Contrx.`,
        ``,
        `--- Detalhes do Chamado ---`,
        `ID: ${chamado.id}`,
        `Assunto: ${chamado.subject}`,
        `Empresa: ${infoEmpresa}`,
        `Usuario: ${infoUsuario}`,
        `Mensagem:`,
        chamado.message,
        `---------------------------`,
        ``,
        `Acesse a plataforma administrativa para responder ou visualizar.`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="margin: 0 0 16px; color: #ff4b00; border-bottom: 2px solid #ff4b00; padding-bottom: 8px;">
            Novo Chamado de Suporte
          </h2>
          <p>Um novo chamado de suporte foi aberto na plataforma <strong>Contrx</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; width: 120px; border: 1px solid #e2e8f0;">Empresa:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${infoEmpresa}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Usuario:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${infoUsuario}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Assunto:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${chamado.subject}</td>
            </tr>
          </table>

          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #cbd5e1; white-space: pre-wrap;">
            <strong>Mensagem:</strong><br/>
            ${chamado.message}
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 13px; color: #64748b; text-align: center;">
            Este e-mail foi gerado automaticamente pelo sistema de suporte do Contrx.
          </p>
        </div>
      `,
    });

    this.logger.log(
      `E-mail de notificacao de chamado enviado para: ${destinatarios}`,
    );
  }
}
