# Flow Core + CRM — ponte para Helpin Agent Runtime (fase 2)

Situação: código e testes na branch de prévia; **não implantado ou ativado** em infraestrutura externa.

## Ferramenta de CRM no cérebro oficial

A ferramenta `consultar_indicadores_crm` está em `src/lib/brain/acoes.server.ts`.
Somente painel, exigindo permissão `relatorios`, bloqueando papel `profissional`.
A leitura de dados é feita pelo serviço compartilhado `src/lib/crm/indicadores.server.ts`,
que aplica `tenant_id` em todas as consultas e verifica capacidade do plano `crescimento`.
O WhatsApp (cliente e equipe) e o site nunca oferecem essa ferramenta.
O mesmo serviço alimenta o gráfico `/barbeiro/crm`, evitando regras duplicadas.
Somente atendimentos finalizados contam como visitas. Não há métricas monetárias inventadas.

Os especialistas CRM e Insights incluem a ferramenta, ainda em modo sombra.
Não se alteram o gateway principal, o Flow Bot, a Agenda, a fila ou os webhooks.

## Adaptador Agent Runtime (integração preparatória)

`src/lib/agente-flow/helpin-runtime.server.ts` permite, no futuro, iniciar
uma análise com o runtime Helpin, **apenas após aprovação do servidor** e
opt-in explícito. Não há chamada automática. Nenhuma rota ou agente atual
invoca a função.

Contratos conferidos no Agent Runtime:
- `PUT /v1/agents/{id}?app_id=...`, para registrar o perfil de executor;
- `POST /v1/runs`, para iniciar a execução;
- `AGENT_RUNTIME_SERVICE_TOKEN` como autenticação Bearer.

Exigências futuras de configuração (NÃO aplicadas nesta entrega):
- `FLOW_HELPIN_RUNTIME_ATIVO=true`
- `FLOW_HELPIN_RUNTIME_URL` e `FLOW_HELPIN_RUNTIME_ORIGEM` (origem HTTPS fixa)
- `FLOW_HELPIN_RUNTIME_SERVICE_TOKEN` guardado exclusivamente no servidor

**Não ligar o interruptor** sem verificar o estado de cobrança e infraestrutura,
usar autenticação e registro durável de aprovação humana, registrar uso/cotas
por tenant e configurar um provedor compatível realmente gratuito.

O agente registrado pelo adaptador recebe `allowed_tools: []`, não tem
servidores MCP nem acesso ao Supabase. O runtime só pode receber sete números
agregados pré-aprovados. É um teste futuro de análise, não uma substituição
do cérebro. O retorno "iniciada" representa somente a aceitação de um run;
não garante resultado, auditoria, duração nem recuperação após falha.

Esta implementação não cria uma aprovação persistente: o campo
`aprovadoNoServidor` deverá ser derivado de decisão humana auditada no host,
**nunca de um booleano fornecido diretamente pelo navegador**. Por isso,
o adaptador deve continuar sem chamadores até essa etapa.

## Referências

https://github.com/helpin-ai/agent-runtime/blob/main/docs/agent-ownership.md

https://github.com/helpin-ai/agent-runtime/blob/main/docs/interfaces.md

https://github.com/helpin-ai/agent-runtime/blob/main/docs/openapi.yaml

https://github.com/helpin-ai/agent-runtime/blob/main/docs/runtime-configuration.md

## Próxima etapa

- Validar a consulta com negócio fictício e testar a interface a 360/390 px.
- Integrar CRM à navegação após liberar as reservas antigas.
- Implementar outbox, aprovação persistente e cotas; só depois ligar a ponte.
- Testar a instalação do Agent Runtime numa Oracle preparada, sem recursos
  pagos ou instância ativa de inferência não verificada.
