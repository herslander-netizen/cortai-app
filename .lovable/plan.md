# Rodada 1 — página pública móvel

## Objetivo
Evoluir a vitrine e o agendamento público para uso rápido em celular e navegadores internos, preservando integralmente disponibilidade, conflitos, alteração segura de horário e preferências pós-agendamento.

## Implementação
1. **Reorganizar sem mudar o motor**
   - Extrair o estado, persistência, criação, cancelamento, conflito e `substituiId` de `agendar.$slug.tsx` para `useAgendamentoPublico.ts`.
   - Dividir a seleção tradicional em componentes menores e manter cada arquivo dentro do limite do contrato.
   - Criar uma única `ConfirmacaoAgendamento.tsx`, usada após qualquer modo de agendamento.

2. **Confirmação com identidade do negócio**
   - Exibir capa, logo e nome usando os dados e tokens já publicados pelo negócio.
   - Reaproveitar o ingresso visual do chat para serviço, profissional, data, horário, duração e valor.
   - Adicionar Google Agenda, arquivo `.ics` real e compartilhamento nativo quando disponível.
   - Proteger o cancelamento com `AlertDialog` e manter a alteração sem liberar o horário anterior.
   - Mostrar “Agendado com Cortaí” somente quando a assinatura estiver habilitada.

3. **Fluxo móvel e botão voltar**
   - Modelar etapas explícitas: serviço → profissional → dia → horário → dados → confirmação.
   - Registrar cada avanço no histórico do navegador; voltar recua uma etapa preservando escolhas, enquanto o primeiro passo permite sair normalmente.
   - Ignorar estado de etapa vindo de uma URL reaberta e iniciar com segurança no começo.
   - Levar a ação principal do modo conversa para uma barra fixa com área segura e comportamento adequado ao teclado em `360×640`.

4. **Dados pessoais no fim e ritmo do chat**
   - Remover nome/WhatsApp do início; começar pela mensagem configurada e pela escolha do serviço.
   - Pré-preencher apenas pelo armazenamento do próprio aparelho e saudar pelo primeiro nome quando houver.
   - Pedir os dados depois do horário e antes da confirmação.
   - Aplicar pausas de 120–280 ms somente na primeira visita; visitas seguintes usam 0–60 ms e movimento reduzido usa zero.

5. **Status e desempenho**
   - Criar `status-funcionamento.ts` puro, considerando fuso, dia fechado, intervalo e expediente que cruza meia-noite.
   - Exibir a faixa de status na vitrine e no cabeçalho do agendamento.
   - Implementar “próximo horário” apenas se a investigação confirmar reutilização direta do motor oficial; caso contrário, não duplicar regras.
   - Otimizar fontes para os pesos realmente usados, manter `display=swap`, preconnects e dimensões estáveis da capa com carregamento prioritário só na vitrine.
   - Mover as cores internas do agendamento para a exceção central de marca, preservando o visual.
   - Corrigir textos menores que 12 px e alvos menores que 48 px no fluxo público.

6. **Qualidade e medição**
   - Cobrir histórico por etapa, primeiro passo, URL reaberta, dados ao final, pré-preenchimento, pausas, status, calendários, compartilhamento, confirmação destrutiva, assinatura e regressões de conflito/alteração.
   - Validar sem armazenamento disponível e sem `navigator.share`.
   - Medir LCP/CLS antes e depois com rede 4G e CPU 4×; validar visualmente em 360, 390 e 1280 px, incluindo teclado em `360×640`.
   - Rodar tipos, lint dirigido, testes e compilação; não publicar.

## Decisões de segurança
- A página pública não lerá preferências privadas do cliente.
- Nenhuma regra de agenda será reimplementada no navegador.
- O ingresso e a confirmação serão visuais; criação, conflito, cancelamento e troca continuam nos mesmos caminhos atuais.
