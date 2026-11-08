# Flow Core — agentes inspirados no Helpin e CRM analítico

Data: 2026-11-08. Escopo: branch de desenvolvimento, sem integração com produção.

## Motivação e limites

O Helpin organiza agentes em torno de um único executor (Agent Runtime), enquanto o produto hospedeiro continua dono de autenticação, contexto, permissões, negócio e aprovação. O Flow já tem essa fronteira em `src/lib/brain/`: um catálogo oficial de ações, confirmação, auditoria e controles por canal.

**Não instalar Helpin completo, não criar outro cérebro.** Agent Runtime Apache-2.0 é candidato para teste futuro e exige validação de consumo, infraestrutura e segurança antes de execução. Referências:
- https://github.com/helpin-ai/helpin/blob/main/ARCHITECTURE.md
- https://github.com/helpin-ai/agent-runtime/blob/main/docs/agent-ownership.md
- https://github.com/helpin-ai/agent-runtime/blob/main/docs/interfaces.md
- https://github.com/helpin-ai/agent-runtime/blob/main/docs/memory.md

## Entrega isolada

- `src/lib/crm/indicadores.ts`: cálculo puro, pelo fuso do negócio, de cadastros, atendimentos finalizados, recorrência e retorno mensal.
- `src/lib/crm/indicadores.functions.ts`: leitura paginada, autenticada, com conferência de vínculo, permissão `relatorios`, recurso `crescimento` e `tenant_id`. Se o limite de paginação for excedido, falha em vez de exibir dados falsos.
- `src/routes/barbeiro.crm.tsx`: painel experimental em `/barbeiro/crm`, 3/6 meses, gráfico responsivo, tabela acessível e nenhuma ação de escrita. Não muda menu ou fichas já reservados.
- `src/lib/agente-flow/especialistas.ts`: seis perfis declarativos em modo sombra, somente leitura, ferramentas sempre intersectadas com a autorização do cérebro.
- Testes puros cobrem recorrência, futuro, cancelamentos, fuso, falta de receita inventada e não elevação de privilégios.

## Regras invioláveis

1. Somente `finalizado` é visita concluída; valores de agendamento não são pagamentos.
2. Não estimar capacidade de ocupação por contagem fixa de slots; quando implementar ocupação real, usar motor único de disponibilidade.
3. Falha em consultas não equivale a zero.
4. Nenhum modelo decide `tenant_id`, permissões ou destinatários.
5. Não criar memória paralela por cliente: reutilizar fonte existente e aplicar autorização/consentimento.
6. Agentes não fazem pagamentos ou marketing automático. Ações com impacto passam pelo catálogo e confirmações oficiais.
7. Não conectar Agent Runtime, Oracle, WhatsApp, secrets, migrações ou produção neste lote.

## Próximas etapas

- Revisar dados de CRM em um negócio fictício no Supabase de prévia; testar RLS, permissões, paginação e carga.
- Unificar a navegação com o módulo Clientes somente após liberação das reservas da UI, preservando estilo Figaro.
- Calcular receita a partir de pagamentos efetivos e conciliar estornos; não usar `valor_centavos` de agendamento.
- Criar ferramenta de CRM no catálogo oficial do cérebro após testes e revisão de isolamento.
- Fazer prova de conceito externa do Agent Runtime com um agente somente leitura, token restrito, log de aprovações, timeout, limite de concorrência e interruptor desligado por padrão.
- Validar CI, dispositivo 360/390px claro/escuro e publicação apenas na prévia antes de considerar concluída a UI.
