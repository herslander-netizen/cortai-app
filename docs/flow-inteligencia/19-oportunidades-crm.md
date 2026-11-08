# Flow CRM — fase 3: oportunidades de retorno verificáveis

**Escopo:** melhoria nativa e mobile-first de `/barbeiro/crm` na prévia, sem alteração de backend da Agenda e sem mensagens.

## Decisões e fonte única

- A regra de prazo é `src/lib/retorno.ts`: `dataDeRetorno`, `estaNaHoraDeVoltar` e prazo geral de 30 dias. Serviço com `retorno_dias` válido prevalece.
- Somente registros `agendamentos.status = 'finalizado'` e `inicio <= agora` representam visita realizada. A última visita concluída por cliente determina o prazo.
- Agendamento futuro ainda ativo (`agendado`, `chegou`, `na_cadeira`) exclui o cliente de listas de retorno. Agendamento cancelado ou falta não contam como visita nem suprimem retorno.
- Até 30 dias depois do prazo oficial: **Em retorno**. Depois: **Inativo**.
- Não inferimos probabilidade de compra, consentimento ou intenção; as oportunidades são sugestões de acompanhamento.
- Sem pagamentos, faturamento, lucro ou envios automáticos; mensagens WhatsApp permanecem no único fluxo autorizado, sujeito a consentimento.

## Arquivos

- `src/lib/crm/oportunidades.ts` e `oportunidades.test.ts`: cálculo puro, sem DB, com seis testes de regressão.
- `src/lib/crm/oportunidades.functions.ts`: função de leitura autenticada, exige permissões `relatorios` + `visualizar_clientes` e recurso `crescimento`, escopo obrigatório de `tenant_id`, resultados paginados; falha explicitamente se dados excederem a janela, sem mostrar amostra como total.
- `src/components/crm/OportunidadesCRM.tsx`: novos cartões e lista clicável de clientes com ficha já existente, padrão Figaro, estados vazios/erros e atualização manual.
- `src/routes/barbeiro.crm.tsx`: acrescenta uma terceira série ao gráfico (atendimentos finalizados) e a seção de oportunidades.

## Isolamento e segurança

Clientes só aparecem na lista interna para membros autenticados com a permissão de visualização. Dados individuais não vão para o Helpin Runtime; o adaptador da fase 2 continua desligado e só aceita indicadores agregados após uma autorização do servidor que ainda precisa ser implementada.

**Pendente de homologação:** navegação autenticada em 360/390 px nos dois temas, volume de dados elevado, desempenho para tenants grandes e aprovação antes de eventual automação. Nenhum arquivo de Agenda foi alterado neste lote.
