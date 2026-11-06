# Inicio de Confeccoes

O painel fica em `/confeccoes`, acessivel pelo menu Inicio no ramo CONFECCOES.
As outras atividades continuam com suas telas existentes. As APIs exigem sessao,
permissao de vendas e acao de visualizacao; os indicadores filtram a empresa autenticada.

O resumo considera vendas e trocas concluidas, desconta pecas devolvidas e exclui
documentos cancelados ou em andamento. Usa o fuso da cidade escolhida para delimitar
o dia e o mes; as parcelas vencidas usam a data civil do vencimento. Estoque baixo
considera produtos ativos com controle de estoque, excluindo a matriz da grade.

Cidade, atalhos e meta pessoal sao preferencias do usuario/empresa neste navegador.
A cidade cadastrada na empresa e sugerida quando nao existe escolha anterior.
Sem cidade selecionada, o painel nao inventa previsao ou localizacao.

## Clima e licencas

- Previsao: MET Norway Locationforecast, via backend, sem expor o IP do usuario.
  Atribuicao exibida no card. Fonte: https://api.met.no/weatherapi/locationforecast/2.0/documentation
- Uso: https://api.met.no/doc/TermsOfService e https://www.met.no/en/free-meteorological-data/Licensing-and-crediting
- Coordenadas, municipios e fusos: https://github.com/kelvins/municipios-brasileiros
  Base MIT incorporada em `contrx-backend/src/vendas/data/brazilian-cities.json`,
  com a licenca incluida no proprio JSON e em arquivo separado.
- A paisagem e SVG local e varia com o simbolo da previsao e o horario da cidade.
  Nenhuma foto de uma cidade especifica e apresentada como se fosse uma camera local.

O backend armazena previsoes por cidade durante tres horas, conforme o intervalo
recomendado pelo provedor fora da regiao nordica. Reutiliza chamadas em andamento,
limita concorrencia e nao aceita URLs arbitrarias. Consultas de municipios usam
a base local e nao geram trafego para um geocodificador.

Configure `WEATHER_USER_AGENT` no backend com nome e dominio/contato da empresa,
por exemplo `Contrx/1.0 (https://seu-dominio.example)`. O identificador padrao e
`Contrx/1.0 (company management dashboard)`. O backend precisa de acesso HTTPS a
`api.met.no`. Falhas do provedor mantem o restante do painel utilizavel e exibem
uma mensagem no card, sem dados climaticos ficticios.

Validacao: testes `confections-dashboard.spec.ts`, verificacoes de TypeScript,
ESLint e builds locais. Nenhum commit, push ou deploy automatico.
