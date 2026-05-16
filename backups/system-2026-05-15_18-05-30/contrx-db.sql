--
-- PostgreSQL database dump
--

\restrict R1fZ5ssUeTFfbkonDkNSRmVaj8POFsHr7RLNXNoglFcEc1HcovAD2czpH03Sc9F

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: forma_pagamento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.forma_pagamento AS ENUM (
    'DINHEIRO',
    'PIX',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'BOLETO',
    'TRANSFERENCIA',
    'OUTRO'
);


ALTER TYPE public.forma_pagamento OWNER TO postgres;

--
-- Name: papel_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.papel_usuario AS ENUM (
    'PROPRIETARIO',
    'ADMINISTRADOR',
    'GERENTE',
    'USER',
    'DONO_SISTEMA'
);


ALTER TYPE public.papel_usuario OWNER TO postgres;

--
-- Name: status_conta_financeira; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_conta_financeira AS ENUM (
    'PENDENTE',
    'PAGO'
);


ALTER TYPE public.status_conta_financeira OWNER TO postgres;

--
-- Name: status_contrato; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_contrato AS ENUM (
    'ATIVO',
    'INATIVO',
    'CANCELADO',
    'FINALIZADO',
    'EXCLUIDO'
);


ALTER TYPE public.status_contrato OWNER TO postgres;

--
-- Name: status_pessoa; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_pessoa AS ENUM (
    'ATIVO',
    'INATIVO'
);


ALTER TYPE public.status_pessoa OWNER TO postgres;

--
-- Name: tipo_motivo_status_contrato; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_motivo_status_contrato AS ENUM (
    'CANCELADO',
    'EXCLUIDO'
);


ALTER TYPE public.tipo_motivo_status_contrato OWNER TO postgres;

--
-- Name: tipo_pessoa; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_pessoa AS ENUM (
    'PESSOA_FISICA',
    'PESSOA_JURIDICA'
);


ALTER TYPE public.tipo_pessoa OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: agenda_itens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agenda_itens (
    id text NOT NULL,
    empresa_id text NOT NULL,
    titulo text NOT NULL,
    cliente text NOT NULL,
    imovel text NOT NULL,
    data timestamp(3) without time zone NOT NULL,
    horario text NOT NULL,
    tipo text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    prioridade text DEFAULT 'medium'::text NOT NULL,
    responsavel text NOT NULL,
    lembrete text NOT NULL,
    observacoes text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.agenda_itens OWNER TO postgres;

--
-- Name: configuracoes_app; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracoes_app (
    id text NOT NULL,
    empresa_id text NOT NULL,
    configuracoes_usuario jsonb,
    configuracoes_empresa jsonb,
    configuracoes_tema jsonb,
    modelos_impressao jsonb,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.configuracoes_app OWNER TO postgres;

--
-- Name: contas_pagar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contas_pagar (
    id text NOT NULL,
    empresa_id text NOT NULL,
    pessoa_id text,
    pessoa text,
    descricao text NOT NULL,
    categoria text,
    observacao text,
    valor numeric(10,2) NOT NULL,
    data_lancamento timestamp(3) without time zone,
    data_vencimento timestamp(3) without time zone NOT NULL,
    status public.status_conta_financeira DEFAULT 'PENDENTE'::public.status_conta_financeira NOT NULL,
    manual boolean DEFAULT true NOT NULL,
    numero_parcela integer,
    total_parcelas integer,
    grupo_parcelamento_id text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contas_pagar OWNER TO postgres;

--
-- Name: contas_receber; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contas_receber (
    id text NOT NULL,
    empresa_id text NOT NULL,
    contrato_id text,
    inquilino_id text,
    imovel text NOT NULL,
    inquilino text NOT NULL,
    data_lancamento timestamp(3) without time zone,
    data_vencimento timestamp(3) without time zone NOT NULL,
    valor numeric(10,2) NOT NULL,
    status public.status_conta_financeira DEFAULT 'PENDENTE'::public.status_conta_financeira NOT NULL,
    manual boolean DEFAULT true NOT NULL,
    numero_parcela integer,
    total_parcelas integer,
    grupo_parcelamento_id text,
    entrada boolean DEFAULT false NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contas_receber OWNER TO postgres;

--
-- Name: contratos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contratos (
    id text CONSTRAINT "Contract_id_not_null" NOT NULL,
    empresa_id text CONSTRAINT "Contract_companyId_not_null" NOT NULL,
    imovel_id text CONSTRAINT "Contract_propertyId_not_null" NOT NULL,
    inquilino_id text CONSTRAINT "Contract_tenantId_not_null" NOT NULL,
    nome_imovel text,
    nome_inquilino text,
    data_inicio timestamp(3) without time zone CONSTRAINT "Contract_startDate_not_null" NOT NULL,
    data_fim timestamp(3) without time zone CONSTRAINT "Contract_endDate_not_null" NOT NULL,
    valor_aluguel numeric(10,2) CONSTRAINT "Contract_rentValue_not_null" NOT NULL,
    status public.status_contrato DEFAULT 'ATIVO'::public.status_contrato CONSTRAINT "Contract_status_not_null" NOT NULL,
    excluido_em timestamp(3) without time zone,
    motivo_status text,
    tipo_motivo_status public.tipo_motivo_status_contrato,
    motivo_status_em timestamp(3) without time zone,
    locacao_temporaria boolean DEFAULT false CONSTRAINT "Contract_isTemporaryRental_not_null" NOT NULL,
    horario_entrada text,
    horario_saida text,
    renovado_em timestamp(3) without time zone,
    historico_renovacoes jsonb,
    finalizado_em timestamp(3) without time zone,
    motivo_finalizacao text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Contract_createdAt_not_null" NOT NULL,
    atualizado_em timestamp(3) without time zone CONSTRAINT "Contract_updatedAt_not_null" NOT NULL
);


ALTER TABLE public.contratos OWNER TO postgres;

--
-- Name: empresas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresas (
    id text CONSTRAINT "Company_id_not_null" NOT NULL,
    nome_fantasia text CONSTRAINT "Company_tradeName_not_null" NOT NULL,
    razao_social text,
    documento text,
    telefone text,
    email text,
    ativo boolean DEFAULT true CONSTRAINT "Company_isActive_not_null" NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Company_createdAt_not_null" NOT NULL,
    atualizado_em timestamp(3) without time zone CONSTRAINT "Company_updatedAt_not_null" NOT NULL
);


ALTER TABLE public.empresas OWNER TO postgres;

--
-- Name: imoveis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imoveis (
    id text CONSTRAINT "Property_id_not_null" NOT NULL,
    empresa_id text CONSTRAINT "Property_companyId_not_null" NOT NULL,
    proprietario_id text,
    titulo text CONSTRAINT "Property_title_not_null" NOT NULL,
    codigo text,
    tipo text,
    finalidade text,
    valor_aluguel numeric(10,2),
    cep text,
    cidade text,
    estado text,
    endereco text,
    bairro text,
    numero text,
    complemento text,
    quartos integer,
    banheiros integer,
    garagens integer,
    descricao text,
    ativo boolean DEFAULT true CONSTRAINT "Property_isActive_not_null" NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Property_createdAt_not_null" NOT NULL,
    atualizado_em timestamp(3) without time zone CONSTRAINT "Property_updatedAt_not_null" NOT NULL
);


ALTER TABLE public.imoveis OWNER TO postgres;

--
-- Name: movimentacoes_imoveis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimentacoes_imoveis (
    id text NOT NULL,
    empresa_id text NOT NULL,
    imovel_id text NOT NULL,
    nome_imovel text NOT NULL,
    tipo text NOT NULL,
    descricao text NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.movimentacoes_imoveis OWNER TO postgres;

--
-- Name: pagamentos_realizados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagamentos_realizados (
    id text NOT NULL,
    conta_pagar_id text NOT NULL,
    pago_em timestamp(3) without time zone NOT NULL,
    forma_pagamento public.forma_pagamento NOT NULL,
    itens_pagamento jsonb,
    juros numeric(10,2) DEFAULT 0 NOT NULL,
    desconto numeric(10,2) DEFAULT 0 NOT NULL,
    valor_pago numeric(10,2) NOT NULL,
    observacao text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pagamentos_realizados OWNER TO postgres;

--
-- Name: pagamentos_recebidos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagamentos_recebidos (
    id text NOT NULL,
    conta_receber_id text NOT NULL,
    pago_em timestamp(3) without time zone NOT NULL,
    forma_pagamento public.forma_pagamento NOT NULL,
    itens_pagamento jsonb,
    juros numeric(10,2) DEFAULT 0 NOT NULL,
    desconto numeric(10,2) DEFAULT 0 NOT NULL,
    valor_pago numeric(10,2) NOT NULL,
    observacao text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pagamentos_recebidos OWNER TO postgres;

--
-- Name: pessoas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pessoas (
    id text CONSTRAINT "Person_id_not_null" NOT NULL,
    empresa_id text CONSTRAINT "Person_companyId_not_null" NOT NULL,
    tipo public.tipo_pessoa CONSTRAINT "Person_type_not_null" NOT NULL,
    status public.status_pessoa DEFAULT 'ATIVO'::public.status_pessoa CONSTRAINT "Person_status_not_null" NOT NULL,
    nome text CONSTRAINT "Person_name_not_null" NOT NULL,
    documento text CONSTRAINT "Person_document_not_null" NOT NULL,
    email text,
    telefone text,
    cidade text,
    estado text,
    endereco text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Person_createdAt_not_null" NOT NULL,
    atualizado_em timestamp(3) without time zone CONSTRAINT "Person_updatedAt_not_null" NOT NULL,
    rg text,
    inscricao_estadual text,
    cep text
);


ALTER TABLE public.pessoas OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id text CONSTRAINT "User_id_not_null" NOT NULL,
    empresa_id text CONSTRAINT "User_companyId_not_null" NOT NULL,
    nome text CONSTRAINT "User_name_not_null" NOT NULL,
    email text CONSTRAINT "User_email_not_null" NOT NULL,
    senha_hash text CONSTRAINT "User_passwordHash_not_null" NOT NULL,
    papel public.papel_usuario DEFAULT 'USER'::public.papel_usuario CONSTRAINT "User_role_not_null" NOT NULL,
    ativo boolean DEFAULT true CONSTRAINT "User_isActive_not_null" NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "User_createdAt_not_null" NOT NULL,
    atualizado_em timestamp(3) without time zone CONSTRAINT "User_updatedAt_not_null" NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
feba15e7-ca1c-4308-9f38-b1ac4d6c4250	867b946206a361a45a0d83aab393c588c0e5eb7c2f5ffe46ec8427e339b5b215	2026-05-15 17:27:39.093661-04	20260509192700_init	\N	\N	2026-05-15 17:27:39.093-04	1
050c4b38-7d15-40d3-9059-87e9eba17896	410384346dbd1ed5051f290413585ad5fd880ee5d4255115fea3b7bfe93c7188	2026-05-15 17:27:39.163445-04	20260512202130_create_people	\N	\N	2026-05-15 17:27:39.162-04	1
b4ba71d0-ffd1-4919-aadd-2fcc4250fe7b	1b43a7db7d483b4f02253998f7a2b06db05656bd1e3b141f81e8994a78d82a61	2026-05-15 17:27:39.227309-04	20260513192416_create_properties	\N	\N	2026-05-15 17:27:39.226-04	1
7907c5bc-a741-4946-ab9f-e4c639e9cea2	e42359d88a1836c4dc671be84ca2833615de9349135e5bb3b403105807d3a42b	2026-05-15 17:27:39.311091-04	20260513233000_create_contracts	\N	\N	2026-05-15 17:27:39.31-04	1
2d615043-4b0d-4e7d-9fce-4e427cfcfcbe	58e7fcd8fc6ccd9fa9155db2fabf278676822578698afb0417d39e5634190795	2026-05-15 17:27:39.563154-04	20260514000000_translate_database_to_portuguese	\N	\N	2026-05-15 17:27:39.562-04	1
fdb4b25c-908a-4928-8bed-02f935b30779	8e695100496bee2398c99ca93f20598d5771e07bfd17c7056b2735207172538e	2026-05-15 17:27:39.591721-04	20260514003000_create_financial_accounts	\N	\N	2026-05-15 17:27:39.591-04	1
522e9933-871e-4cda-a0a2-9777d4e9a8ca	9164913348481bebfdbb8cde1b957314c358b2a18af824e53a9da04840d1adec	2026-05-15 17:27:40.099171-04	20260514090000_create_app_settings	\N	\N	2026-05-15 17:27:40.098-04	1
980c5818-f135-44a8-8a60-4c8ef21d3e04	5c8ee50669e081330e20e0837fb996c553f05bbdd42aa17141a257724028005e	2026-05-15 17:27:40.124802-04	20260514100000_create_schedule_items	\N	\N	2026-05-15 17:27:40.124-04	1
98325a32-82dc-4db1-aa24-e4e3e14be323	61836421f9231996604ac33e4220525772e0852d9337641eb2cedbf7098e9e80	2026-05-15 17:27:40.171168-04	20260514103000_create_property_movements	\N	\N	2026-05-15 17:27:40.17-04	1
8c894d10-aded-4edf-a41e-97c782b891bd	4d084f7ec641df8a5f6e86620f3cbd351bed4a7b6d99da5b637888c55d119e17	2026-05-15 17:27:40.203682-04	20260514140000_add_system_owner_role	\N	\N	2026-05-15 17:27:40.202-04	1
\.


--
-- Data for Name: agenda_itens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agenda_itens (id, empresa_id, titulo, cliente, imovel, data, horario, tipo, status, prioridade, responsavel, lembrete, observacoes, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: configuracoes_app; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracoes_app (id, empresa_id, configuracoes_usuario, configuracoes_empresa, configuracoes_tema, modelos_impressao, criado_em, atualizado_em) FROM stdin;
d1a3ec22-88c3-4d0a-9654-1cfb3cfbb105	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	{"name": "Administrador", "email": "adm@contrx.com"}	{"email": "contato@contrx.com", "phone": "69999999999", "document": "12345678000199", "tradeName": "Contrx Imobiliaria", "companyName": "Contrx Imobiliaria LTDA"}	{"mode": "light"}	\N	2026-05-15 17:29:15.886	2026-05-15 17:29:15.886
\.


--
-- Data for Name: contas_pagar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contas_pagar (id, empresa_id, pessoa_id, pessoa, descricao, categoria, observacao, valor, data_lancamento, data_vencimento, status, manual, numero_parcela, total_parcelas, grupo_parcelamento_id, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: contas_receber; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contas_receber (id, empresa_id, contrato_id, inquilino_id, imovel, inquilino, data_lancamento, data_vencimento, valor, status, manual, numero_parcela, total_parcelas, grupo_parcelamento_id, entrada, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: contratos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contratos (id, empresa_id, imovel_id, inquilino_id, nome_imovel, nome_inquilino, data_inicio, data_fim, valor_aluguel, status, excluido_em, motivo_status, tipo_motivo_status, motivo_status_em, locacao_temporaria, horario_entrada, horario_saida, renovado_em, historico_renovacoes, finalizado_em, motivo_finalizacao, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empresas (id, nome_fantasia, razao_social, documento, telefone, email, ativo, criado_em, atualizado_em) FROM stdin;
bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	Contrx Imobiliaria	Contrx Imobiliaria LTDA	12345678000199	69999999999	contato@contrx.com	t	2026-05-10 00:03:38.627	2026-05-10 00:03:38.627
46d54f9c-8c16-4575-b81e-e15e0008ccea	Contrx Imobiliaria	Contrx Imobiliaria LTDA	12345678000199	69999999999	contato@contrx.com	t	2026-05-10 00:07:23.032	2026-05-10 00:07:23.032
\.


--
-- Data for Name: imoveis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imoveis (id, empresa_id, proprietario_id, titulo, codigo, tipo, finalidade, valor_aluguel, cep, cidade, estado, endereco, bairro, numero, complemento, quartos, banheiros, garagens, descricao, ativo, criado_em, atualizado_em) FROM stdin;
3fa8c169-45ac-4587-bbc1-cfe35d45e96d	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	\N	APARTAMENTO 01	\N	Apartment	Available	1250.00	76940-000	ROLIM DE MOURA	RO	RUA CORUMBIARA	CENTROQ	4031	\N	\N	\N	\N	\N	t	2026-05-14 00:11:19.454	2026-05-14 00:13:36.383
\.


--
-- Data for Name: movimentacoes_imoveis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimentacoes_imoveis (id, empresa_id, imovel_id, nome_imovel, tipo, descricao, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: pagamentos_realizados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagamentos_realizados (id, conta_pagar_id, pago_em, forma_pagamento, itens_pagamento, juros, desconto, valor_pago, observacao, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: pagamentos_recebidos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagamentos_recebidos (id, conta_receber_id, pago_em, forma_pagamento, itens_pagamento, juros, desconto, valor_pago, observacao, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: pessoas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pessoas (id, empresa_id, tipo, status, nome, documento, email, telefone, cidade, estado, endereco, criado_em, atualizado_em, rg, inscricao_estadual, cep) FROM stdin;
60b6c518-0c77-442e-afc7-667c37846385	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	PESSOA_FISICA	ATIVO	LUAN HENRIQUE LEITE SANTOS	006.455.032-07	edif.luan@gmail.com	(69) 98484-1925	Rolim de Moura	RO	Rua Corumbiara 4031	2026-05-13 03:24:48.194	2026-05-13 03:24:48.194	\N	\N	\N
fa23b806-8fc4-4d5d-a4a6-ce72c101d891	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	PESSOA_JURIDICA	ATIVO	CASA DOS PARAFUSOS COMERCIO DE FERRAGENS FERRAMENTAS LTDA	32.830.059/0002-84	\N	(69) 3442-2391	Rolim de Moura	RO	\N	2026-05-13 03:48:09.703	2026-05-13 22:40:27.81	\N	\N	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, empresa_id, nome, email, senha_hash, papel, ativo, criado_em, atualizado_em) FROM stdin;
101d81ca-4e03-429c-9fd7-92554ec9384c	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	Luan Santos	luan@contrx.com	$2b$10$QkM6.ZjaypM9SGzwjhgddu2.uePLGfwURJza0tEyATbAf38BF9.ki	USER	t	2026-05-10 00:31:09.775	2026-05-10 00:31:09.775
3aaeae13-ca83-402a-b41d-fd4106af425c	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	Luan Novo	novo@contrx.com	$2b$10$R3.5YnLBfmkOrIF5bNvrjOcFXEqm12uIIEHDjjtvAL3NmW8XUroOu	USER	t	2026-05-12 17:17:20.855	2026-05-12 17:17:20.855
c2414599-3c0a-4ecc-9b95-920f36533b03	bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9	Administrador	adm@contrx.com	$2b$10$hSqQSdeFUKrPBPb2HUUCm.3o8S/TC6Agz6heRQlWaJTsl.0LTofJK	DONO_SISTEMA	t	2026-05-12 22:46:03.998	2026-05-15 17:29:26.721
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: agenda_itens agenda_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_itens
    ADD CONSTRAINT agenda_itens_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_app configuracoes_app_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_app
    ADD CONSTRAINT configuracoes_app_pkey PRIMARY KEY (id);


--
-- Name: contas_pagar contas_pagar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_pkey PRIMARY KEY (id);


--
-- Name: contas_receber contas_receber_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_pkey PRIMARY KEY (id);


--
-- Name: contratos contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: imoveis imoveis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imoveis
    ADD CONSTRAINT imoveis_pkey PRIMARY KEY (id);


--
-- Name: movimentacoes_imoveis movimentacoes_imoveis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes_imoveis
    ADD CONSTRAINT movimentacoes_imoveis_pkey PRIMARY KEY (id);


--
-- Name: pagamentos_realizados pagamentos_realizados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos_realizados
    ADD CONSTRAINT pagamentos_realizados_pkey PRIMARY KEY (id);


--
-- Name: pagamentos_recebidos pagamentos_recebidos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos_recebidos
    ADD CONSTRAINT pagamentos_recebidos_pkey PRIMARY KEY (id);


--
-- Name: pessoas pessoas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pessoas
    ADD CONSTRAINT pessoas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: agenda_itens_data_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX agenda_itens_data_idx ON public.agenda_itens USING btree (data);


--
-- Name: agenda_itens_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX agenda_itens_empresa_id_idx ON public.agenda_itens USING btree (empresa_id);


--
-- Name: configuracoes_app_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX configuracoes_app_empresa_id_idx ON public.configuracoes_app USING btree (empresa_id);


--
-- Name: configuracoes_app_empresa_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX configuracoes_app_empresa_id_key ON public.configuracoes_app USING btree (empresa_id);


--
-- Name: contas_pagar_data_vencimento_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_pagar_data_vencimento_idx ON public.contas_pagar USING btree (data_vencimento);


--
-- Name: contas_pagar_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_pagar_empresa_id_idx ON public.contas_pagar USING btree (empresa_id);


--
-- Name: contas_pagar_pessoa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_pagar_pessoa_id_idx ON public.contas_pagar USING btree (pessoa_id);


--
-- Name: contas_pagar_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_pagar_status_idx ON public.contas_pagar USING btree (status);


--
-- Name: contas_receber_contrato_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_receber_contrato_id_idx ON public.contas_receber USING btree (contrato_id);


--
-- Name: contas_receber_data_vencimento_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_receber_data_vencimento_idx ON public.contas_receber USING btree (data_vencimento);


--
-- Name: contas_receber_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_receber_empresa_id_idx ON public.contas_receber USING btree (empresa_id);


--
-- Name: contas_receber_inquilino_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_receber_inquilino_id_idx ON public.contas_receber USING btree (inquilino_id);


--
-- Name: contas_receber_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contas_receber_status_idx ON public.contas_receber USING btree (status);


--
-- Name: contratos_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contratos_empresa_id_idx ON public.contratos USING btree (empresa_id);


--
-- Name: contratos_imovel_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contratos_imovel_id_idx ON public.contratos USING btree (imovel_id);


--
-- Name: contratos_inquilino_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contratos_inquilino_id_idx ON public.contratos USING btree (inquilino_id);


--
-- Name: contratos_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contratos_status_idx ON public.contratos USING btree (status);


--
-- Name: imoveis_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX imoveis_empresa_id_idx ON public.imoveis USING btree (empresa_id);


--
-- Name: imoveis_proprietario_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX imoveis_proprietario_id_idx ON public.imoveis USING btree (proprietario_id);


--
-- Name: movimentacoes_imoveis_criado_em_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX movimentacoes_imoveis_criado_em_idx ON public.movimentacoes_imoveis USING btree (criado_em);


--
-- Name: movimentacoes_imoveis_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX movimentacoes_imoveis_empresa_id_idx ON public.movimentacoes_imoveis USING btree (empresa_id);


--
-- Name: movimentacoes_imoveis_imovel_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX movimentacoes_imoveis_imovel_id_idx ON public.movimentacoes_imoveis USING btree (imovel_id);


--
-- Name: pagamentos_realizados_conta_pagar_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pagamentos_realizados_conta_pagar_id_idx ON public.pagamentos_realizados USING btree (conta_pagar_id);


--
-- Name: pagamentos_recebidos_conta_receber_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pagamentos_recebidos_conta_receber_id_idx ON public.pagamentos_recebidos USING btree (conta_receber_id);


--
-- Name: pessoas_documento_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pessoas_documento_idx ON public.pessoas USING btree (documento);


--
-- Name: pessoas_empresa_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pessoas_empresa_id_idx ON public.pessoas USING btree (empresa_id);


--
-- Name: usuarios_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);


--
-- Name: agenda_itens agenda_itens_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_itens
    ADD CONSTRAINT agenda_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: configuracoes_app configuracoes_app_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_app
    ADD CONSTRAINT configuracoes_app_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contas_pagar contas_pagar_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contas_pagar contas_pagar_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contas_receber contas_receber_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contas_receber contas_receber_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contas_receber contas_receber_inquilino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_inquilino_id_fkey FOREIGN KEY (inquilino_id) REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contratos contratos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contratos contratos_imovel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_imovel_id_fkey FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contratos contratos_inquilino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_inquilino_id_fkey FOREIGN KEY (inquilino_id) REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: imoveis imoveis_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imoveis
    ADD CONSTRAINT imoveis_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: imoveis imoveis_proprietario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imoveis
    ADD CONSTRAINT imoveis_proprietario_id_fkey FOREIGN KEY (proprietario_id) REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: movimentacoes_imoveis movimentacoes_imoveis_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes_imoveis
    ADD CONSTRAINT movimentacoes_imoveis_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimentacoes_imoveis movimentacoes_imoveis_imovel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes_imoveis
    ADD CONSTRAINT movimentacoes_imoveis_imovel_id_fkey FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagamentos_realizados pagamentos_realizados_conta_pagar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos_realizados
    ADD CONSTRAINT pagamentos_realizados_conta_pagar_id_fkey FOREIGN KEY (conta_pagar_id) REFERENCES public.contas_pagar(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pagamentos_recebidos pagamentos_recebidos_conta_receber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos_recebidos
    ADD CONSTRAINT pagamentos_recebidos_conta_receber_id_fkey FOREIGN KEY (conta_receber_id) REFERENCES public.contas_receber(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pessoas pessoas_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pessoas
    ADD CONSTRAINT pessoas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usuarios usuarios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict R1fZ5ssUeTFfbkonDkNSRmVaj8POFsHr7RLNXNoglFcEc1HcovAD2czpH03Sc9F

