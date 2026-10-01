export type ReleaseCategory = "novo" | "melhoria" | "correcao" | "seguranca";

export interface ReleaseHighlight {
  category: ReleaseCategory;
  title: string;
  description: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  subtitle: string;
  highlights: ReleaseHighlight[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.19",
    date: "29 de Setembro de 2026",
    title: "Compressão de Imagens, Manutenção de Ativos & Notificação de Versões",
    subtitle: "Otimização automática de imagens no upload, novo modal de agendamento de manutenção e sistema de avisos de versão no primeiro acesso.",
    highlights: [
      {
        category: "novo",
        title: "Compressão Inteligente de Fotos no Upload de Imóveis",
        description:
          "Fotos anexadas aos imóveis agora são compactadas automaticamente no navegador antes do envio, acelerando uploads e economizando largura de banda e armazenamento.",
      },
      {
        category: "novo",
        title: "Modal de Agendamento e Manutenção de Ativos",
        description:
          "Novo fluxo dedicado para registro de manutenções preventivas e corretivas diretamente integrado à agenda operacional.",
      },
      {
        category: "novo",
        title: "Avisos de Novidades da Versão no Primeiro Acesso",
        description:
          "Popup automático apresentando melhorias e novas funcionalidades aos usuários logo após o deploy de cada versão.",
      },
      {
        category: "melhoria",
        title: "Performance e Responsividade em Ativos e Pessoas",
        description:
          "Refinamentos na tabela de imóveis, modais de cadastro de pessoas e sincronização de contratos.",
      },
      {
        category: "correcao",
        title: "Compatibilidade de ENUMs no Banco de Dados",
        description:
          "Ajuste na tipagem de consultas SQL garantindo estabilidade e inicialização limpa dos serviços.",
      },
    ],
  },
  {
    version: "1.0.18",
    date: "29 de Setembro de 2026",
    title: "Novo Dashboard, Gestão de Ativos & Contratos Públicos",
    subtitle: "Uma das maiores atualizações do Contrx, trazendo arquitetura modular, novo painel inteligente e compartilhamento seguro de contratos.",
    highlights: [
      {
        category: "novo",
        title: "Novo Módulo de Dashboard com Métricas em Tempo Real",
        description:
          "Novo painel inteligente com taxa de ocupação de ativos, evolução financeira de receitas e despesas, alertas de vencimento e checklist de onboarding.",
      },
      {
        category: "novo",
        title: "Status Operacional de Imóveis & Ativos",
        description:
          "Controle dinâmico de disponibilidade dos imóveis (Disponível, Alugado, Em Manutenção ou Inativo), com sincronização automática com contratos ativos.",
      },
      {
        category: "novo",
        title: "Visualização e Compartilhamento Público de Contratos",
        description:
          "Geração de links seguros com hash criptográfico para clientes e parceiros consultarem e imprimirem contratos sem necessidade de login.",
      },
      {
        category: "melhoria",
        title: "Modularização Completa das Telas de Pessoas e Financeiro",
        description:
          "Filtros avançados, cards para visualização mobile e modais mais rápidos e leves nas telas de Pessoas, Contas a Pagar e Contas a Receber.",
      },
      {
        category: "melhoria",
        title: "Impressão e Pré-Visualização de Documentos",
        description:
          "Novo modal de pré-visualização de modelos de impressão e recibos na aba de configurações.",
      },
      {
        category: "seguranca",
        title: "Hardening de Consultas e Proteção de Banco",
        description:
          "Isolamento rigoroso por empresa em todas as novas rotas, sanitização de consultas SQL e validação preventiva contra erros de tipagem.",
      },
      {
        category: "correcao",
        title: "Estorno Seguro de Lançamentos Bancários",
        description:
          "Ao cancelar ou reverter um recebimento ou pagamento, as movimentações de saldo bancário correspondentes são estornadas de forma automática e consistente.",
      },
    ],
  },
  {
    version: "1.0.17",
    date: "24 de Setembro de 2026",
    title: "Conciliação Bancária Avançada & Padronização ERP",
    subtitle: "Aprimoramentos profundos no fluxo de conciliação e acabamento visual do sistema.",
    highlights: [
      {
        category: "novo",
        title: "Modal Unificado de Movimentação Bancária",
        description:
          "Interface completa para transferências entre contas, lançamentos avulsos e conciliação direta no extrato.",
      },
      {
        category: "melhoria",
        title: "Refinamento Visual ERP e Tipografia",
        description:
          "Alinhamento profissional de fontes, tabelas com rolagem suave no mobile e cards de métricas padronizados.",
      },
      {
        category: "correcao",
        title: "Tratamento de Exceções e Telemetria",
        description:
          "Captura detalhada de erros no backend com prevenção de travamentos em chamadas de API assíncronas.",
      },
    ],
  },
  {
    version: "1.0.16",
    date: "10 de Setembro de 2026",
    title: "Estorno Financeiro & Gestão de Bancos",
    subtitle: "Controle robusto de saldo e reversão de baixas financeiras.",
    highlights: [
      {
        category: "novo",
        title: "Estorno Automático no Contas a Receber e a Pagar",
        description:
          "Reversão em cadeia com estorno simultâneo de lançamentos bancários e recomposição de saldos de contas correntes.",
      },
      {
        category: "melhoria",
        title: "Filtros Persistentes nas Listagens",
        description:
          "Memorização de filtros por período, cliente e status para maior agilidade operacional no dia a dia.",
      },
    ],
  },
];

export function getReleaseNoteForVersion(version: string): ReleaseNote | undefined {
  const cleanVersion = version.replace(/^v/, "").trim();
  return RELEASE_NOTES.find((note) => note.version === cleanVersion);
}

export function getLatestReleaseNote(): ReleaseNote {
  return RELEASE_NOTES[0];
}
