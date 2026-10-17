# Fase 1 — agendamento público realmente conversacional

## Objetivo
Transformar o modo conversa em uma recepção humana e determinística, preservando integralmente disponibilidade, conflitos, troca segura de horário e preferências pós-confirmação. Nada será publicado.

## Implementação

1. **Contraste crítico da confirmação**
   - Completar os tokens semânticos dentro de `.agendamento-marca`, derivados dos tokens já calculados da página.
   - Garantir leitura AA para botões `outline`, `ghost`, `secondary`, campos e textos auxiliares nos 13 temas.
   - Adicionar teste de contraste mínimo 4,5:1 para cada tema.

2. **Recepcionista configurável**
   - Normalizar `pagina.chat.nomeRecepcao` para Lisa por padrão, preservando nomes antigos já salvos.
   - Adicionar em “Sua Página” a escolha Lisa/Davi com dois controles acessíveis de 48 px.
   - Atualizar o cabeçalho para inicial, nome e linha “{negócio} · {status}”.

3. **Motor determinístico de conversa**
   - Criar módulos puros em `src/lib/conversa/` para interpretação, textos e memória.
   - Reconhecer serviço/apelidos, profissional, datas, períodos, horários, “mais cedo”, sim/não/menu/voltar/equipe, sem IA ou custo.
   - Tratar datas ambíguas com confirmação explícita e nunca inventar dados.
   - Responder perguntas rápidas usando somente dados públicos já carregados.

4. **Interface móvel do chat**
   - Compor transcript e mensagens sobre AI Elements já instalados e instalar o campo oficial de entrada compatível.
   - Criar campo fixo, envio por ícone, sugestões contextuais roláveis e menu persistente.
   - Mostrar até três horários concretos por vez, com “Ver mais”.
   - Manter mensagens curtas, `aria-live`, foco restaurado e alvos mínimos de 48 px.

5. **Memória e retomada local**
   - Estender a memória opcional por negócio com primeiro nome, último serviço/profissional e período preferido.
   - Guardar rascunho por 30 minutos, oferecer continuar/recomeçar e revalidar o horário pelo motor atual.
   - Priorizar agendamento futuro salvo com ações existentes de ver, remarcar e cancelar.
   - Funcionar normalmente quando armazenamento local estiver indisponível.

6. **Correção sem reinício e “o de sempre”**
   - Tornar respostas do cliente editáveis por toque/teclado.
   - Ao corrigir uma etapa, limpar somente escolhas dependentes.
   - Oferecer “o de sempre” a clientes reconhecidos, sem pular validações de disponibilidade.

7. **Preferências após confirmação**
   - Reapresentar o fluxo existente como até quatro perguntas sequenciais e puláveis.
   - Reutilizar exatamente a função de gravação, token, validação, limite e proteção já existentes.

## Detalhes técnicos
- `useSelecaoAgendamento` continuará sendo a única seleção local e `disponibilidade.ts` continuará sendo a única fonte de horários.
- `substituiId`, criação, conflito e cancelamento permanecerão na rota atual, apenas expostos ao chat por callbacks.
- Textos ficarão centralizados e o motor não importará React nem APIs do navegador.
- Componentes grandes serão divididos em `src/components/agendamento/chat/`; `AgendamentoChat.tsx` ficará com até 300 linhas.
- A memória será isolada em funções com adaptador opcional de Storage, sempre protegida contra exceções.

## Validação
- Testes de interpretação com os casos da conversa padrão, memória, rascunho, correção dependente, preferências e contraste dos 13 temas.
- Verificação visual e funcional em 360×640, 390 px e 1280 px, incluindo teclado e armazenamento indisponível.
- Typecheck, lint, testes e build completos.
- Relatório final com arquivos, limitações encontradas e confirmação de que nada foi publicado.
