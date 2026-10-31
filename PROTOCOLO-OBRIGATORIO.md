# Protocolo obrigatório de trabalho — Flow

**Leitura e cumprimento obrigatórios por Claude, GPT/Codex, Muse e qualquer pessoa que altere o repositório.**

Este documento transforma as regras do projeto em um roteiro verificável. Ele complementa — não substitui — o AGENTS.md da raiz, os AGENTS.md das áreas, o CONTEXTO.md, o método detalhado em docs/prompt-gpt-metodo-de-trabalho.md, o estado vivo em DIARIO.md e a infraestrutura em MUSE.md. Em caso de conflito, prevalecem as instruções de maior prioridade definidas no AGENTS.md e as decisões mais recentes do dono no diário.

## 0. Antes de começar — não editar sem concluir

- [ ] Confirmar que o repositório é herslander-netizen/cortai-app e a branch é cloudflare-workers-migration-2026-10-13.
- [ ] Atualizar a branch a partir da origem antes de começar; nunca trabalhar na main ou em outra branch.
- [ ] Ler integralmente o ORIENTACOES-GERAIS-IA.md (obrigatório antes de qualquer processo; inclui o checklist de página nova).
- [ ] Ler integralmente o AGENTS.md da raiz, o CONTEXTO.md, docs/prompt-gpt-metodo-de-trabalho.md e MUSE.md.
- [ ] Ler no DIARIO.md as seções **Decisões do dono**, **Próximas tarefas**, **Em andamento**, **Recados** e as entradas mais recentes de **Diário**. Responder ou marcar como lidos os recados endereçados à IA que está trabalhando.
- [ ] Ler o AGENTS.md de cada pasta que será alterada. Verificar também as regras específicas de src/lib, src/lib/brain, src/lib/whatsapp, src/components/barbeiro/agenda e src/components/comanda quando a tarefa alcançar essas áreas.
- [ ] Conferir reservas e recados. Se outra IA reservou a mesma tarefa, arquivo ou migração, **parar**: não trabalhar em paralelo; deixar recado no diário e aguardar/liberar outro escopo.
- [ ] Reservar a tarefa em **Em andamento** com responsável, data, escopo, arquivos e número da migração, se houver. Fazer um commit somente dessa linha de reserva antes de implementar.
- [ ] Escrever em uma frase o que foi pedido e o que está explicitamente fora do escopo.

**Se uma leitura, atualização, reserva ou autorização obrigatória não puder ser confirmada, não começar a edição.** Investigar em modo somente leitura e explicar o bloqueio.

## 1. Entender antes de mexer

- Localizar a implementação existente pelo nome, texto da tela, rota, símbolo ou classe CSS. Reutilizar componentes, fontes únicas de verdade e regras existentes; não criar caminhos paralelos.
- Ler por inteiro cada arquivo que será alterado e as funções, componentes e consultas que ele chama.
- Não ampliar o pedido. Um item solicitado não autoriza alterar seus vizinhos.
- A Agenda é protegida: qualquer mudança visual nela exige pedido específico do dono para a Agenda. Pedidos globais devem excluí-la e o diff deve confirmar isso.
- Para decisões de produto, texto, preço, regra de negócio ou ambiguidades que mudem o resultado, parar e perguntar ao dono.

## 2. Banco de dados — proteção obrigatória

- Antes de reescrever uma função SQL, localizar todas as definições em drizzle/migrations e partir da versão de maior número. Comparar o diff com a versão anterior.
- Qualificar colunas da tabela externa em subconsultas RLS; nunca deixar uma comparação ambígua como p.tenant_id = tenant_id.
- Migrações somente aditivas. Nunca usar DROP ou DELETE de dados.
- Nunca aplicar migração, executar escrita ou alterar qualquer banco real sem autorização explícita do dono.
- Ensaiar migrações no banco local descartável com supabase/baseline/ensaio/ensaio-local.sh; todos os testes de supabase/tests devem terminar em OK. Criar teste para o comportamento novo.
- Atualizar src/integrations/supabase/types.ts quando criar tabela/coluna. Evitar as any.

## 3. Código, datas e interface

- Fazer a menor alteração que resolva o pedido. Não reformate arquivos inteiros, não renomeie elementos fora do escopo e não enfraqueça regras.
- Reutilizar a regra já existente no servidor/lib; não reimplementar validação na tela.
- Datas e períodos sempre no fuso do negócio (hojeNoFuso, inicioDoDiaNoFuso etc.), nunca no relógio local do aparelho.
- Toda tela, página ou gaveta nova cumpre o **checklist de página nova** (ORIENTACOES-GERAIS-IA.md §4); gaveta nova usa o modelo ui/folha-padrao.tsx.
- Toda tela nova ou refeita segue o Figaro, docs/ordem-padrao-figaro.md, docs/contrato-de-design.md e os primitivos de src/components/ui.
- Mobile-first: conferir 390 px e, quando aplicável, 360 px; conferir tema escuro e claro. Na Agenda, respeitar também as regras próprias de paridade e proteção.
- Não tocar em evolution-crm, segredos, DNS ou produção fora das autorizações documentadas.

## 4. Antes de enviar — todos os gates

Executar e confirmar sucesso:

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run eslint <arquivos alterados>
bun run build
```

- Criar testes para o comportamento novo e para o defeito corrigido.
- Se a quantidade de ações, abas ou itens mudar, procurar e atualizar todos os testes que contam esses itens.
- Ler o diff inteiro como revisor independente. Desfazer tudo que não foi pedido.
- Confirmar que nenhum arquivo/regra da Agenda foi afetado sem autorização específica.
- Verificar dados vazios, falhas do banco, falta de permissão e isolamento entre negócios.
- Atualizar a branch novamente antes do envio e integrar somente mudanças compatíveis; nunca force-push, rebase ou amend de commit já enviado.
- Enviar somente para cloudflare-workers-migration-2026-10-13. A publicação da prévia depende do CI.
- No DIARIO.md: acrescentar entrada no topo de Diário, registrar arquivos e resultados reais dos testes, remover a reserva de Em andamento e atualizar Próximas tarefas. Atualizar MUSE.md se a infraestrutura mudou.
- Responder ao dono em português do Brasil, dizendo o que mudou, o que conferir em https://previa.cortaiapp.pages.dev e o que ainda depende dele. Nunca declarar teste, aplicação ou publicação sem evidência.

## 5. Quando parar e pedir autorização

Parar antes de executar qualquer ação que envolva:
- escrita/aplicação em banco real;
- publicação no site principal ou alteração de main;
- DNS, domínio ou infraestrutura com impacto externo;
- criar, trocar ou apagar segredos;
- custo ou contratação;
- apagar dados, arquivos ou funcionalidades;
- texto, preço, regra de negócio ou decisão de produto;
- ambiguidade material que possa mudar o resultado.

O que for reversível, limitado à branch e não alterar decisão do dono deve ser resolvido com bom senso, sem pedir confirmação a cada passo.

## 6. Limite da verificação automática

O GitHub Actions executa scripts/verificar-protocolo.sh antes da validação e do deploy da prévia. Esse controle confirma que os documentos obrigatórios existem, que os vínculos entre eles continuam presentes e que os pontos essenciais do protocolo não foram removidos silenciosamente.

**A automação não consegue provar que uma IA leu os documentos, respeitou uma reserva ou revisou corretamente o diff.** Cada agente continua responsável por cumprir e marcar o checklist acima. Se não puder comprovar uma etapa, deve parar e informar — nunca presumir que foi feita.
