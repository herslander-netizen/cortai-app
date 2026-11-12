# PROMPT DE EXECUÇÃO — FLOW | Auditoria completa da Agenda no GitHub Actions

**Escopo:** Agenda operacional mobile-first; telas Timeline, Cartões/Lista, Semana, Modo Foco, edição de horários, agendamento manual, remarcação, bloqueios, disponibilidade, fila, estados de atendimento e cobrança. **Referência:** comportamento do Flow oficial e especificação Figaro em `docs/referencia-figaro/apk/2-agenda.md`.

## Papel e objetivo

Atuar como engenheiro full-stack sênior, QA de automação e especialista de desempenho mobile. **Ler antes de escrever**: `src/components/barbeiro/agenda/AGENTS.md`, a documentação do projeto e os testes existentes. Priorizar descobrir falhas reais e reproduzíveis, sem adivinhar causas. Preserve contratos, multi-tenant, rotas, estilos e gestos.

## Execução automatizada já implementada nesta branch

1. **Testes por domínio com Vitest:** executar os testes existentes da Agenda e fluxos relacionados, agrupando interação/gestos/visualização; regras de agendamento/disponibilidade; páginas públicas; fila/atendimento/cobrança; desempenho.
2. **Navegador real com Playwright/Chromium:** montar uma bancada isolada com os componentes de produção `TrocaDeVisualizacao`, `AgendaTimeline` e `ListaAgenda`; usar exclusivamente dados fictícios, sem login, sem Supabase ou WhatsApp. Exercitar 360, 390 e 1280 px, tema claro/escuro, movimento reduzido, toques rápidos, seleção de cartão, alteração de dia, alternância repetida Timeline ↔ Cartões e 40/120 eventos.
3. **Telemetria:** registrar tempo do clique até o painel montado/primeiro quadro; relatório de latência por cenário. Um teste verde **não** comprova 60 FPS ou ausência de lag num Android real. Evitar limiar rigoroso de milissegundos dependente da carga do runner, exceto limites amplos para travamento.
4. **CI geral:** manter build, TypeScript e todos os testes existentes do workflow `validate.yml`.
5. **Proibição:** não executar migrações, não tocar dados do Supabase de prévia/produção, não utilizar credenciais reais, não publicar ou fazer merge. PR de rascunho, alterações pequenas e reversíveis.

## Critérios funcionais de aceite

- Timeline e Cartões aparecem no primeiro clique em ambas as direções; sem espera artificial, painel vazio ou travamento.
- Botão de alternância não muda de posição nem ganha translação fora do ícone; preserva animação do catálogo.
- A rolagem nativa mobile, posição/restauração, filtro, calendário, zoom, gesto de troca de dia e `prefers-reduced-motion` não regridem.
- Arrastar só enquanto há pressão longa; soltura/pointercancel não salvam mudanças indevidas. Duração só pela alça.
- Disponibilidade não aceita sobreposições e a fonte da verdade segue sendo o servidor; comportamento de fila e pagamentos não deve ser mockado como sucesso de backend.
- Se falhar um teste, fornecer log, reprodução, hipótese demonstrada no código ou no navegador e correção mínima seguida de reexecução.

## Limitações explícitas

Os testes de navegador exercitam **componentes reais em bancada isolada**, não o painel autenticado completo. Pagamentos reais, WhatsApp, RLS, backend integrado, animação em Android físico e 60 FPS não estão cobertos por este laboratório. A lista de testes descobre os arquivos existentes; não implica cobertura de 100% das funções. Para completar o E2E do painel é necessário preparar um tenant fictício dedicado e fluxo de login autorizado em ambiente isolado, sem dados de clientes.

## Saídas esperadas

- Resultados e links dos jobs GitHub Actions, testes aprovados/reprovados e logs.
- Latências observadas por cenário e dispositivo simulado.
- Correções apenas para problemas comprovados, com testes de regressão.
- Lista separada das pendências de homologação integrada/Android.
