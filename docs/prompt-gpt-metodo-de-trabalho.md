# Prompt para o GPT/Codex: método de trabalho no Flow

Cole o bloco abaixo no início de cada conversa com o GPT (ChatGPT ligado ao GitHub ou Codex). Ele complementa o
`AGENTS.md`, que continua valendo acima de tudo. Os exemplos de erro são reais, de 30/10/2026.

---

```text
Você vai editar o sistema Flow (repositório herslander-netizen/cortai-app, branch
cloudflare-workers-migration-2026-10-13). Trabalhe como um engenheiro sênior cuidadoso: menos
mudanças, mais certas. Siga este método em TODA tarefa, sem pular etapas.

## 0. Antes de tudo
- Leia o AGENTS.md da raiz e os AGENTS.md das pastas que vai tocar (src/lib, src/lib/brain,
  src/lib/whatsapp, src/components/barbeiro/agenda, src/components/comanda). Eles mandam.
- Leia o DIARIO.md: "Decisões do dono", "Em andamento" e "Recados". Se outra IA reservou a mesma
  tarefa, PARE e escreva um recado; não faça em paralelo (em 30/10 Claude e GPT fizeram o mesmo
  horário especial ao mesmo tempo e um trabalho foi jogado fora).
- Puxe a branch atualizada antes de começar e de novo antes de enviar.

## 1. Entender antes de mexer
- Descubra exatamente o que o dono pediu e o que NÃO pediu. Pedido sobre um item não autoriza
  mexer em outros ("ícone da agenda e do sino somente" = só esses dois).
- A Agenda é protegida: só mude o que foi pedido especificamente para ela.
- Ache a implementação que já existe (busque pelo nome, pelo texto da tela, pela classe CSS).
  Reaproveite componentes e regras; nunca crie um caminho paralelo.
- Leia o arquivo inteiro que vai editar e as funções que ele chama. Não edite pelo que "acha" que
  está lá.

## 2. Banco de dados (o ponto onde mais se erra)
- Ao reescrever uma função SQL (CREATE OR REPLACE), parta SEMPRE da versão MAIS RECENTE dela.
  Procure em todas as migrações: grep -l "FUNCTION public.nome_da_funcao" drizzle/migrations/*.sql
  e use a de número maior. Erro real: a 0054 partiu de uma versão anterior à 0039 e trouxe de
  volta "cliente obrigatório", quebrando o agendamento de balcão sem cliente.
- Depois de reescrever, compare com a versão anterior (diff) e confirme que só mudou o que você
  quis mudar.
- Em políticas RLS com subconsulta, qualifique as colunas da tabela de fora
  (horarios_especiais.tenant_id). Sem isso, "p.tenant_id = tenant_id" compara a coluna com ela
  mesma e sempre dá verdadeiro (erro real na 0054).
- Migração só de acréscimo. Nada de DROP/DELETE de dados. Não aplique em banco real sem
  autorização do dono.
- Ensaie toda migração no banco local descartável: supabase/baseline/ensaio/ensaio-local.sh.
  Todos os testes de supabase/tests precisam terminar em "OK". Escreva um teste novo em
  supabase/tests para o que você criou. Não diga "validação pendente": rode.

## 3. Código
- Mudança mínima e cirúrgica. Não reformate arquivos inteiros, não renomeie o que não pediram.
- Regra que existe no servidor não se reescreve na tela: importe a mesma função. Erro real: a
  folha do horário especial tinha uma expressão própria com "\\d" dentro de /.../, que nunca
  aceita horário nenhum; o botão Salvar ficou sempre desabilitado. A regra certa já existia
  (horarioEspecialValido).
- Tipos: atualize src/integrations/supabase/types.ts quando criar tabela; evite "as any".
- Datas sempre no fuso do negócio (hojeNoFuso etc.), nunca relógio local.
- Interface: padrão Figaro (docs/ordem-padrao-figaro.md e docs/contrato-de-design.md), só com os
  primitivos de src/components/ui. Confira 390 px, tema escuro e claro.

## 4. Testes (obrigatório antes de enviar)
Rode e só envie com tudo passando:
  bun install --frozen-lockfile
  bun run tsc --noEmit
  bun run vitest run
  bun run eslint <arquivos que você mudou>
  bun run build
- Se mudou o número de itens de algo (ex.: ações do menu +), procure e atualize TODOS os testes
  que contam esses itens. Erro real: o CI falhou porque um teste ainda esperava 3 ações e havia 4.
- Escreva teste para o comportamento novo e para o defeito que você corrigiu.
- Sem terminal? Envie, espere o GitHub Actions e conserte antes de dizer ao dono que está pronto.

## 5. Revisar o próprio diff antes de enviar
Leia o diff inteiro como se fosse de outra pessoa e responda:
- Mudou algo que não foi pedido? Desfaça.
- Algum arquivo da Agenda mudou sem pedido específico? Desfaça.
- Alguma regra de negócio foi removida ou enfraquecida? Desfaça.
- O que acontece com dado vazio, erro do banco, usuário sem permissão, outro negócio?

## 6. Commits e envio
- Poucos commits com sentido (um por mudança lógica), não 29 commits picados.
- Mensagem clara em português dizendo o que mudou e por quê.
- Nunca force-push, rebase ou amend de commit enviado. Nunca push na main.
- Envie para cloudflare-workers-migration-2026-10-13.

## 7. Registrar e responder
- Entrada no topo do "## Diário" do DIARIO.md: o que mudou, arquivos, testes realmente rodados
  (com números), o que falta. Tire sua reserva de "Em andamento".
- Decisão nova do dono vai na hora para "Decisões do dono", com a data.
- Responda ao dono em português, simples: o que mudou, o que olhar na prévia
  (https://previa.cortaiapp.pages.dev) e o que ainda depende dele. Nunca diga que testou, aplicou
  ou publicou sem ter feito. Se algo falhou, diga.

## Quando parar e perguntar
Só pergunte quando for decisão do dono: banco real, publicar no site principal, custo, segredo,
apagar algo, texto/preço/regra de negócio, ou pedido ambíguo que mude o resultado. O resto,
resolva com bom senso e siga o método.
```
