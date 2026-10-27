# Auditoria minuciosa da CortAI com referência ao APK Grok Bot / SandMobile

**Data:** 27/10/2026  
**Branch analisada:** `cloudflare-workers-migration-2026-10-13`  
**Escopo:** inspeção estática do APK fornecido, arquitetura atual da CortAI, segurança de ações, contexto, voz, avaliação de qualidade e plano de evolução.  
**Limites:** não foi feita engenharia reversa de serviços remotos nem teste interativo do APK em aparelho; presença de strings no bundle não prova que um recurso esteja habilitado, funcional ou disponível à conta que usa o app.

## 1. Identificação correta do APK

O nome do arquivo recebido é `Grok Bot.apk`. Os metadados internos extraídos de `assets/app.config` e `assets/app.manifest` indicam:

- Nome interno Expo: `SandMobile`; slug `sand-mobile`; versão `1.17.0`; Android versionCode `1109`.
- Pacote Android: `ai.x.grok.bot`.
- Nome de apresentação no manifesto iOS: `[dev] Grok Bot`.
- Esquemas de deep link incluem `grokbot` e `grokbotinternal`; links de agente/plugin referenciam `x.ai/bot/agent/` e `x.ai/bot/plugin/`.
- Atualizações OTA configuradas para `api2.cursor.sh/updates/sand-mobile/api/manifest`. Isso revela infraestrutura/identidade interna chamada SandMobile e uma URL de atualização sob `cursor.sh`, mas não basta, isoladamente, para concluir que o aplicativo seja o Cursor para iOS nem que seja uma distribuição pública da xAI.
- O bundle React Native está em `assets/index.android.bundle` (~23,2 MB); o APK inteiro tem ~65 MB e cinco arquivos DEX.

**Conclusão segura:** o pacote se identifica como Grok Bot para Android e, simultaneamente, contém metadados internos de SandMobile e infraestrutura Cursor. É uma build com sinais de ambiente de desenvolvimento (`[dev] Grok Bot`); sua origem/distribuição exata e o estado dos recursos no servidor não podem ser provados só pelo binário. Não assumir que o APK represente fielmente o app público final.

## 2. Recursos sugeridos pelo código do APK

A inspeção estática do bundle identificou famílias de símbolos/strings associadas a:

- Conversas, threads, tarefas e estados de agentes: criação de task thread, agente em execução, estado de trabalho, continuação/resposta e falha de conclusão.
- Ferramentas e extensões: MCP, ferramentas oferecidas, apps/resultado de ferramenta, integrações e permissões de uso.
- Conteúdo: anexos, arquivos, imagens, captura de tela, documentos e seleção de mídia.
- Voz: transcrição/entrada por voz, gravação, waveform e referências a chamadas de voz.
- Ambiente de trabalho: browser embutido/controle remoto, branches, git/PR, logs e revisão de alterações.
- Execução e acompanhamento: notificações, estados de conclusão/erro, feedback de agente e continuidade de tarefa.
- Conectores: referências a e-mail/calendário e integrações externas, além de permissões Android para áudio, calendário, contatos, mídia e localização.

**Confiança:** alta para afirmar que existem referências de implementação desses domínios no bundle; média/baixa para inferir o comportamento exato das telas ou dos serviços. Este relatório não afirma que todos esses recursos estejam ativos, liberados ou utilizáveis nessa build. O APK não deve ser copiado para o repositório do produto.

### Referência externa para os conceitos, não para validar cada string do APK

A documentação oficial do Cursor descreve agentes em nuvem capazes de trabalhar em repositório isolado, executar testes e devolver artefatos para revisão; MCP conecta ferramentas e fontes externas, com aprovações para uso de ferramentas. Esses princípios de trabalho com agente são referências úteis de arquitetura, mas não são prova da implementação do APK em análise:

- https://cursor.com/docs/cloud-agent/mobile
- https://prod.cursor.com/help/ai-features/background-agents
- https://prod.cursor.com/docs/mcp
- https://cursor.com/docs/cloud-agent/automations

## 3. Estado atual da CortAI encontrado no repositório

### 3.1 Núcleo e fluxo

A CortAI já tem um núcleo compartilhado em `src/lib/brain` usado pelo painel, WhatsApp e site. O ciclo principal é: verificar bloqueios e contexto → reconhecer uma confirmação de pendência, quando existir → chamar o provedor configurado → executar leituras de domínio ou preparar uma escrita → conferir e solicitar confirmação → executar a escrita somente na etapa permitida → devolver resultado sustentado pelo backend.

O modelo não é o banco, a regra de agenda ou a autoridade sobre o sucesso. O backend oficial continua responsável por permissões e gravações. O gateway é configurado por variáveis de ambiente no servidor, e o modo por regras pode atuar no painel sem chamada a modelo externo.

### 3.2 Catálogo de ações no cérebro

O catálogo atual tem 23 chaves principais, incluindo a sentinela interna `ids` e ações para:

- Serviços, profissionais, expediente e informações do negócio.
- Disponibilidade, busca de cliente por telefone/nome, próximos agendamentos e detalhes de agendamento.
- Indicadores resumidos do dia e, nesta rodada, uma ferramenta de leitura do caixa diário (entradas, saídas e líquido registrados).
- Cadastro/atualização de clientes e notas/preferências.
- Criar, cancelar e remarcar agendamentos.
- Minha agenda, fila de espera, aviso de atraso e encaminhamento para humano.

É uma base operacional real; não é apenas um chat. Porém, o catálogo não cobre toda a superfície de produto/financeiro do Cortaí. É necessário mapear as ações de domínio já existentes antes de adicionar novas ferramentas para evitar duplicação.

### 3.3 Barreiras e controles já encontrados

- Contexto de negócio e canal definidos no servidor, não pelo modelo.
- Filtragem por papel/permissão e isolamento de consultas pelo `tenantId`.
- Disponibilidade oficial como fonte de horários que podem ser oferecidos.
- Escritas preparadas para confirmação, salvo exceção estreita de execução direta.
- Conferência visível para certas escritas do painel.
- Idempotência e verificação posterior de agendamento, com tentativa de evitar duplicatas.
- Barreiras determinísticas contra afirmação de sucesso sem execução e contra determinados vazamentos.
- Cotas/pausa por uso e logs operacionais de IA.
- Observabilidade concebida para não enviar texto da conversa por padrão.
- Suíte Promptfoo com asserts determinísticos para isolamento, permissões, honestidade, chamadas de ferramenta e falhas, além de testes específicos para voz/operações.

Esses mecanismos devem ser preservados e ampliados; não substituídos por instruções de prompt ou por um modelo considerado “mais inteligente”.

## 4. Correção preventiva implementada nesta rodada

### 4.1 Confirmação específica não pode aprovar uma ação diferente

Antes, a mesma expressão `confirmacaoInequivoca` considerava “pode marcar”, “pode cancelar” e “pode remarcar” confirmações genéricas. Como o agente verifica uma pendência antes de processar um novo pedido, uma frase que nomeava outra operação poderia ser interpretada como confirmação da pendência existente.

Alteração feita:
- As confirmações genéricas, como “sim”, “ok” e “pode”, continuam válidas para a pergunta explícita de confirmação.
- “Pode marcar” só corresponde a `criar_agendamento`.
- “Pode cancelar” só corresponde a `cancelar_agendamento`.
- “Pode remarcar” só corresponde a `reagendar_agendamento`.
- Sem ação pendente fornecida, uma confirmação com operação explícita não aprova nada.

Arquivos: `src/lib/brain/guardas.ts`, `src/lib/brain/agente.server.ts` e `src/lib/brain/guardas.test.ts`.

### 4.2 Pendência com data futura

A validação anterior aceitava qualquer timestamp finito desde que `agora - timestamp <= 15 minutos`; para uma data futura, a diferença seria negativa e também satisfaria a condição. Agora a data precisa ser menor ou igual ao instante atual e ter até 15 minutos de idade.

Testes adicionados/corrigidos para confirmação por tipo de ação, frase sem tipo de ação, data futura, data inválida e limite de expiração.

### 4.3 A pergunta financeira aponta para a fonte certa

A frase rápida “Quanto entrou hoje?” antes não estava ligada a uma ferramenta financeira: `consultar_movimento` devolve contagens de agendamentos por situação. Neste lote foi adicionada `consultar_caixa_hoje` como leitura, reutilizando o modelo de dados financeiro existente e sem criar tabela ou migração:

- consulta apenas movimentos de caixa do `tenantId` do contexto do servidor;
- usa limites de início/fim do dia civil no fuso do negócio;
- calcula entradas, saídas e saldo líquido dos movimentos, além das entradas por forma de pagamento;
- exige `visualizar_financeiro` no painel e a regra de papel impede profissionais; clientes e site não recebem a ferramenta;
- não grava nem altera dados; não afirma lucro, faturamento contábil nem pagamento individual de comanda;
- o modo básico classifica pedidos concretos de caixa separadamente dos indicadores de agenda e diz explicitamente quando não possui a ferramenta/permissão;
- as instruções do agente esclarecem a diferença também no atendimento do dono por WhatsApp.

Arquivos adicionais: `src/lib/brain/acoes.server.ts`, `src/lib/brain/papeis.test.ts`, `src/lib/brain/modo-basico-nlu.ts`, `src/lib/brain/modo-basico-nlu.test.ts`, `src/lib/brain/modo-basico.ts` e `src/lib/brain/modo-basico.test.ts`. A consulta reproduz os lançamentos do caixa, não uma apuração de lucro.

**Estado de validação:** os commits foram enviados para a branch de trabalho e a validação GitHub Actions está sendo executada. Não declarar teste/build/prévia aprovados até observar conclusão verde do workflow.

## 5. Lacunas e riscos prioritários

### P0 — Segurança e verdade operacional

1. **A confirmação pertence à operação exata.** Correção acima; ampliar casos a cancelar/remarcar/cadastrar/editar e testar conversas com assunto trocado, mensagens concorrentes, repetição e timeout.
2. **Nunca dizer que executou sem prova do backend.** Manter texto de sucesso baseado em retorno verificado; não permitir que o modelo fabrique confirmação.
3. **Isolamento por negócio e papel em todas as ferramentas.** Cada nova ferramenta deve ter testes negativos para tenant errado, papel errado, profissional diferente e contexto ausente.
4. **Falha parcial e incerteza após timeout.** Se uma gravação pode ter ocorrido e o cliente HTTP expirou, consultar o estado antes de repetir; nunca assumir “falhou” ou “concluiu” sem prova.

### P1 — Compreensão, contexto e consistência

1. **Dois caminhos de cadastro:** `assistente.functions.ts` envia certos pedidos estruturados de cadastro de serviços/horários para `src/lib/ia/assistente.server.ts`, enquanto pedidos operacionais usam `src/lib/brain/agente.server.ts`. É um caminho legado/estruturado intencional; auditar diferenças de autorização, erro, telemetria, prompt e confirmação e convergir gradualmente, sem quebrar cadastros em lote.
2. **Memória contextual limitada:** o agente envia até 16 turnos recentes ao modelo; o painel carrega até 60 mensagens para a conversa, mas isso não é memória semântica durável. Separar histórico conversacional de fatos estáveis do negócio e preferências consentidas.
3. **Sugestões devem corresponder às capacidades reais:** o descompasso foi corrigido neste lote. O atalho “Quanto entrou hoje?” agora usa `consultar_caixa_hoje`, que lê movimentos da tabela oficial `caixa_movimentos` dentro dos limites do dia no fuso do negócio, respeita `visualizar_financeiro` no painel e devolve entradas, saídas e líquido por movimentos registrados. `consultar_movimento` continua significando contagem de agendamentos por situação e nunca deve ser usada como faturamento. O resultado do caixa não é lucro contábil. A suíte automatizada ainda precisa confirmar a alteração.
4. **Perguntas de esclarecimento:** identificar campos realmente ausentes; não voltar a pedir dados já informados. Quando houver homônimos, oferecer opções explicitamente e não adivinhar.
5. **Desvio de intenção com pendência:** testar quando uma pessoa começa um agendamento e em seguida pede cancelamento, troca de cliente, horário ou serviço. A pendência deve ser mantida, substituída de forma segura ou recusada com texto claro — nunca executada por inferência.

### P1 — Ferramentas e capacidades

1. Inventariar operações existentes de domínio para serviços, expediente, caixa/financeiro, custos, fidelidade e comunicação; criar ferramentas apenas sobre fontes oficiais já existentes.
2. Dar à CortAI acesso de leitura primeiro; escritas novas precisam de regra de permissão, validação de domínio, confirmação, idempotência e verificações.
3. Fornecer resultados estruturados para a interface mobile (cartões de horários, comparação, resumo do dia) em vez de forçar tudo como parágrafo livre.
4. Criar uma lista explícita de capacidades por canal/papel para o modelo não prometer ações que aquele canal não oferece.
5. Anexos/imagens/documentos podem ser uma evolução posterior — por exemplo, extrair uma lista de serviços para rascunho de cadastro — mas nunca efetuar importação em lote sem prévia, validação e confirmação.

### P2 — Voz, experiência e continuidade

1. O fluxo atual de voz é ditado/comando: reconhecimento pelo navegador ou gravação enviada ao servidor para transcrição; não é uma conversa de voz contínua em tempo real. Priorizar comandos curtos, transcrição revisável, cancelar gravação e tratamento consistente de permissões/erros antes de considerar voz conversacional.
2. Manter estados claros: ouvindo, transcrevendo, entendendo, conferindo, aguardando confirmação, executando, concluído e falhou. Nunca manter o usuário em “processando” sem timeout e ação para tentar de novo.
3. Fazer a interface em primeiro lugar para 360/390 px, com alvo de toque confortável, teclado que não encubra a mensagem e folha que não bloqueie a Agenda. Respeitar o contrato Figaro e a regra de Agenda protegida.
4. Adicionar feedback para cada ação preparada/executada, sem usar animação como substituto de evidência de execução.

### P2 — Qualidade mensurável e custo

1. Executar as suítes Promptfoo determinísticas e o controle negativo; comparar modelos com exatamente os mesmos casos.
2. Adicionar casos para português informal, erro de transcrição, pronomes/contexto (“esse cliente”, “o segundo horário”), intenção trocada, indisponibilidade, resposta parcial, falha de ferramenta, duplicata e concorrência.
3. Medir conclusão correta, ação errada, confirmação indevida, horários inventados, repetição, pedido de esclarecimento desnecessário, latência e tokens por tarefa.
4. Versionar prompt e registrar metadados de execução sem enviar conteúdo pessoal por padrão. Captura de texto deve continuar explicitamente opt-in e mascarada.
5. Só escolher provedor/modelo após teste de qualidade, latência e custo; fallback técnico não deve esconder erro de credencial, cota ou bloqueio.

## 6. Arquitetura-alvo recomendada para a CortAI

Manter um cérebro canônico e separar suas responsabilidades:

1. **Interface conversacional mobile:** texto, ditado, histórico, cartões estruturados e estado operacional.
2. **Orquestrador:** interpreta a intenção, escolhe ferramentas e pede esclarecimento quando faltam dados. O modelo não possui credenciais nem autoridade de negócio.
3. **Registro de capacidades:** ferramenta disponível por canal/papel, schema, risco (leitura/escrita/controle), permissão exigida, requisitos de confirmação e política de idempotência.
4. **Camada de domínio:** consultas e mutações oficiais reutilizadas pelo app; validações no servidor/banco continuam mandatórias.
5. **Gerenciador de pendências:** uma pendência ativa com identidade imutável, tipo de ação, resumo, criação/expiração, origem e chave idempotente; confirmar, recusar, substituir ou expirar por regras determinísticas.
6. **Memória contextual:** histórico curto para linguagem, fatos do negócio consultados sob demanda e preferências explícitas armazenadas separadamente. Nunca tratar o texto do usuário ou conteúdo externo como instrução de sistema.
7. **Observabilidade e avaliação:** eventos sem PII por padrão, IDs pseudonimizados, versionamento de prompt e suíte de regressão que bloqueie alterações com falhas críticas.

## 7. Plano de execução recomendado

**Fase 1 — Segurança (em validação):** confirmar a aprovação dos testes da correção; acrescentar testes de intenções concorrentes e estados de pendência; validar idempotência e recusa; fazer revisão do log sem dados pessoais.

**Fase 2 — Verdade das capacidades:** a diferença entre contagem de agendamentos e caixa registrado foi corrigida no código e coberta por testes; confirmar que a suíte fica verde. Depois, mapear as demais sugestões do chat contra as ferramentas reais e revisar permissões por canal/papel.

**Fase 3 — Contexto e linguagem:** testes de referências a turnos anteriores, campos já fornecidos, datas relativas no fuso do negócio, homônimos e correção de transcrição. Melhorar instruções do agente e modo básico sem criar regras paralelas.

**Fase 4 — Ferramentas úteis:** ampliar o catálogo por módulos conforme os domínios oficiais do Cortaí, primeiro leitura e depois escrita controlada. Priorizar relatório do dia, pesquisa de clientes, fila e cadastro guiado quando a fonte de dados já estiver disponível.

**Fase 5 — Voz e UI:** reforçar revisão da transcrição, estados/timeout, retorno visual de ferramenta e cartões de resultado com padrão Figaro.

**Fase 6 — Escolha do modelo:** comparar dois ou mais provedores usando Promptfoo, custos reais, latência e qualidade em português. Só então definir padrão e fallback por canal.

## 8. Critérios de aceite antes de declarar a CortAI melhorada

- Nenhuma ação executada com confirmação de outra operação.
- Nenhuma pendência futura/expirada aceita.
- Nenhuma gravação dupla por repetição, timeout ou clique duplo.
- Nenhuma informação de outro tenant, papel ou profissional retornada.
- Nenhum horário oferecido sem consulta oficial de disponibilidade.
- Nenhuma resposta de sucesso sem confirmação do domínio.
- Nenhuma sugestão promete uma ferramenta ausente ou confunde agenda com financeiro.
- Testes determinísticos, controle negativo, TypeScript, suíte de testes e build verdes.
- Prévia validada pelo workflow; produção e banco real permanecem intocados até autorização.

## 9. Arquivos-chave para a próxima rodada

- `src/lib/brain/agente.server.ts` — orquestração, instruções e ciclo de ferramentas.
- `src/lib/brain/acoes.server.ts` — catálogo e regras de capacidade por canal/papel.
- `src/lib/brain/guardas.ts` — confirmação, recusa e honestidade da resposta.
- `src/lib/brain/conferencia.ts` e `execucao-direta.ts` — pré-condições e política de execução.
- `src/lib/brain/gateway.server.ts` e `gateway-compativel.server.ts` — modelo, timeout, fallback e transformação de chamadas.
- `src/lib/brain/observabilidade.server.ts` e `uso.server.ts` — diagnóstico, custo e privacidade.
- `src/lib/assistente.functions.ts` e `src/lib/ia/assistente.server.ts` — caminho estruturado de cadastro a revisar contra o cérebro canônico.
- `src/components/ia/AssistenteCortai.tsx` e `useGravadorDeVoz.ts` — experiência mobile/voz.
- `promptfoo/` — base de avaliação já existente.

**Conclusão:** não é necessário trocar a CortAI por outro agente. A base atual já tem várias proteções e operações reais. Neste lote foram corrigidas a confirmação específica da ação pendente e a validade temporal da pendência, e foi ligada a pergunta “Quanto entrou hoje?” a uma leitura autorizada dos movimentos reais do caixa. O restante da evolução deve seguir com contexto, ferramentas, voz e avaliações automáticas. O relatório não declara validação aprovada até o GitHub Actions terminar verde.
