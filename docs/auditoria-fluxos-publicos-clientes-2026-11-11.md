# Auditoria técnica — páginas públicas e fluxos de atendimento do Flow

**Data:** 11–12/11/2026
**Escopo:** código da prévia `cloudflare-workers-migration-2026-10-13`, páginas publicadas e reserva por cliente, sem alterar o ambiente oficial.
**Método:** revisão estática de rotas, componentes e servidor; testes automatizados existentes e regressões desta entrega; verificação CI/deploy. **Não equivale a homologação E2E autenticada em Android com banco e WhatsApp reais.**

## Mapa de jornadas

| Jornada | Entrada | Caminho comprovado no código | Situação após este lote |
| --- | --- | --- | --- |
| Vitrine/Clássica | `/b/$slug` | `TelaPublicaBarbearia` → `PaginaPublicaConteudo` → `/agendar/$slug`, com serviço pré-selecionado | Ligação existente; seções reveladas na rolagem, com movimento reduzido |
| Site Figaro | Mesmo link, layout `figaro-site-completo` | `SiteCompleto`: hero, serviços, equipe, galeria, avaliação, contato; CTAs usam `renderAgendar` | Sete seções com entrada discreta ao rolar; CTAs e navegação mantidos |
| Raízes | Mesmo link, layout Raízes | `Raizes` → CTA por serviço → agendamento | Movimento `Aparece` já existente; preservado |
| Link direto | `/agendar/$slug` | `useSelecaoAgendamento`: serviço → profissional → dia → horário → dados → `agendarComoConvidado` | Estados e regras mantidos; entrada suave de blocos e retry de rede |
| Reserva Figaro | `/agendar/$slug` com layout Figaro | `ReservaFigaro`: serviços → seleção de horário/profissional → dados → confirmação | Corrigido cálculo com horários especiais/intervalos por data; limpa profissional ao trocar serviço |
| Conversa/Chat | `/agendar/$slug` modo conversa | `AgendamentoChat` + `useConversaAgendamento`: serviço → profissional → dia → horário → dados → confirmar | Entrada de etapa de 220 ms, após digitando; contrato de seleção preservado |
| Agenda indisponível | Consulta pública com plano sem reserva/sem serviços/equipe/horários | Avisa indisponibilidade e oferece WhatsApp quando configurado | Horário excepcional pode abrir data mesmo sem semana regular ativa |
| Falha de consulta pública | Consulta de `getAgendaPublica` com erro | Tratamento de `isError && !data` distinto de slug não encontrado | **Corrigido:** tentativa novamente sem marcar o negócio como inexistente |
| Conflito de agenda | `agendarComoConvidado` | Valida no servidor, retorno `conflito`, permite substituir reserva existente dentro das regras | Existente; servidor permanece autoridade |
| Confirmação de telefone | Telefone já cadastrado | `ConfirmarTelefone` com código e consulta periódica ao servidor | Existente; requer teste de webhook/WhatsApp real |
| Reserva confirmada | Sucesso do RPC `criar_agendamento` | `ConfirmacaoAgendamento`, calendário, preferências, aviso WhatsApp | **Corrigido:** não oculta comprovante se o negócio fecha novas reservas depois |
| Cancelar/remarcar | Comprovante | `cancelarComoConvidado` e `substituiId`, com prazo e verificação no servidor | Caminhos existentes; requer testes E2E de permissão e reversão |
| Consulta após recarga | Reserva guardada no navegador | `situacaoComoConvidado` com id+telefone e atualização do estado | Existente; verificar recuperabilidade em dispositivo diferente |

## Correções implementadas

1. **Regra:** `reserva-figaro.ts` recebe `intervalosPorData` e os encaminha a `horariosDisponiveis`; a UI Figaro exibe os horários especiais da data e intervalos excepcionais em vez de se apoiar apenas na semana.
2. **Regra:** nova escolha de serviço no Figaro descarta o profissional selecionado para o serviço anterior; evita herdar um profissional incompatível.
3. **Continuidade:** o bloqueio de *novos* agendamentos não pode tomar o lugar da confirmação de horário já existente. Comprovante/alteração/cancelamento continuam visíveis.
4. **Continuidade:** erro de rede da consulta pública recebe explicação e **Tentar novamente**; link inválido continua sendo caso separado.
5. **Disponibilidade:** dias com abertura excepcional válida na janela não são bloqueados apenas porque todos os dias da semana estão configurados como fechados.
6. **Movimento:** Site Figaro revela seções com `transform/opacity`; Chat anima só o conteúdo novo da etapa, sem bloquear seleção; agendamento direto/etapas Figaro entram suavemente. Layout Raízes e vitrine preservam seus movimentos já existentes.
7. **Acessibilidade:** opção `prefers-reduced-motion` é respeitada. Elementos de navegação e controles fixos não foram transformados.

## Evidências e regressões

- `src/lib/reserva-figaro.test.ts`: cobertura de janela excepcional e intervalo personalizado por data (testes funcionais puros).
- `src/components/agendamento/fluxos-publicos-auditoria.test.ts`: guarda de confirmação, retry de falha, propagação de exceções, CTAs e integridade das etapas e do movimento (contratos do código).
- Testes anteriores de disponibilidade, páginas externas, reserva, confirmações e estilos permanecem no pipeline.
- Resultado de build, suíte e smoke da URL da prévia: consultar o GitHub Actions associado ao commit final desta entrega. A validação de implantação não executa agendamento real.

## Critérios pendentes para declarar jornada 100% homologada

1. **E2E no navegador e Android 360/390 px:** Vitrine/Site/Chat, sem cache, com serviço pré-selecionado, filtros de profissional, dia lotado, lista de espera, teclado e reduzir movimento; comparar ida/volta das etapas sem travamento.
2. **Gravação real em tenant de teste isolado:** dois toques rápidos em Confirmar, concorrência de dois clientes pelo mesmo horário, conflito, prazo de cancelamento, remarcação atômica, retorno do comprovante após recarga e eventual indisponibilidade.
3. **Verificação real de telefone/WhatsApp:** código enviado, código expirado, ausência de número do negócio, erro de entrega, status e opt-out; a reserva não deve ser indevidamente desfeita quando o aviso falha.
4. **Desconexão e acessibilidade:** consulta sem internet, erro de servidor, navegação por teclado/leitor de tela, foco dos formulários, acessibilidade de mensagens de estado, contraste em cada tema.
5. **LGPD e segurança:** confirmar segregação tenant, limites por IP/telefone, autorização para cancelamento/consulta, retenção de telefone e integridade de `preferenciasToken`; revisão específica antes de uso comercial amplo.

**Conclusão:** o código cobre os caminhos principais e a entrega elimina falhas reais de disponibilidade/continuidade, mas não existe evidência suficiente nesta auditoria para declarar os fluxos de atendimento integralmente fechados ponta a ponta em produção. Homologação real depende dos cenários acima, sem usar reservas de clientes reais.
