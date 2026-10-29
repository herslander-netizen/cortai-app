# Flow IA executora por voz (painel)

Estado em 2026-10-11, branch `ccr-1c1f9637-ur1ccn`. Nada foi publicado.

A equipe autenticada fala ou escreve “Flow IA, marque um horário para Leandro amanhã às 15h para corte” no chat do painel. A voz é gravada no navegador, transcrita **no servidor** e entra no **mesmo cérebro** do texto.

## 1. Auditoria: o que já existia (e foi reaproveitado)

| Operação | Ação do catálogo (`brain/acoes.server.ts`) | Domínio (`ia/acoes.server.ts`) | Observação |
|---|---|---|---|
| Criar agendamento | `criar_agendamento` (escrita, perm. `agendamento_manual`) | `criarAgendamento` → valida cliente/profissional/serviço **do negócio**, `validarAgendamento` (regras + conflito do cliente) e a RPC `criar_agendamento` com `_validar_regras` (a sobreposição é travada no banco) | **É a ação segura. Não há segunda implementação.** |
| Remarcar | `reagendar_agendamento` (escrita) | `remarcarAgendamento` (cria o novo antes de cancelar o antigo) | Continua com confirmação. |
| Cancelar | `cancelar_agendamento` (escrita) | `cancelarAgendamento` (+ prazo de cancelamento para cliente) | Continua com confirmação. |
| Cadastrar/atualizar cliente, nota | `criar_cliente`, `atualizar_dados_cliente`, `registrar_nota` | `registrarCliente`… | Continuam com confirmação. |
| Disponibilidade | `consultar_disponibilidade` | `consultarDisponibilidade` (motor oficial) | Devolve `livres: [{profissionalId, inicio}]`. |
| Achar cliente | `buscar_cliente` | — | **Só por telefone.** Faltava buscar por **nome** (a pessoa fala nomes). |
| Agenda do dia, fila | `minha_agenda`, `consultar_fila` | — | Hoje só para equipe **no WhatsApp**; não existem no painel. |

Lacunas encontradas e tratadas: (1) busca de cliente por nome; (2) o `criar_agendamento` **não era idempotente** — repetir o pedido esbarraria na regra “o cliente já tem um horário nesse dia” (erro enganoso) ou, numa corrida, na trava do banco; (3) o sucesso era o retorno do domínio, **sem reler** o registro; (4) o resumo de confirmação não dizia **para quem** era o horário; (5) não existia captura de áudio no painel (só o WhatsApp transcreve, e só no servidor).

## 1.1 Como abrir (atalhos na Agenda)

Três jeitos, todos levam à **mesma** conversa da Flow IA (uma superfície ativa por vez):

1. **Segurar o "+"** da Agenda (~0,5 s): vibra, a folha da Flow IA abre **já ouvindo** e o teclado não pula na frente. Toque curto continua abrindo o menu de sempre. Mexer o dedo (rolagem), soltar antes do tempo ou o navegador cancelar o toque desfazem o gesto; o clique que o navegador dispara ao soltar é engolido (senão abriria o menu junto). Com o menu aberto o "+" é o "X" e segurar não faz nada de especial. Código: `barbeiro/agenda/useToqueLongo.ts`.
2. **"Agendar por voz" no menu do "+"**: item no leque, colado ao "Agendar horário". É também o caminho para teclado e leitor de tela (segurar é só um atalho; o "+" ganha a descrição "Segure para agendar por voz"). Fica desabilitado sem internet (o comando depende do servidor).
3. **Botão de microfone dentro do chat** (e o botão flutuante da Flow IA como antes).

Os itens 1 e 2 só existem se o navegador grava áudio; senão a Agenda fica exatamente como era.
Decisão de desenho: segurar **abre e começa a ouvir** (toque no quadrado para enviar), em vez de "segurar enquanto fala e soltar para enviar". A alternativa (push-to-talk) é simples de trocar, mas exige manter o dedo parado durante a fala inteira; avise se preferir.

## 1.2 Dois clientes com o mesmo nome (pop-up de opções)

Se a busca por nome devolve **mais de um** cliente, a Flow IA não chuta e **nada é agendado**. A conversa mostra um cartão fixo acima do campo de escrita, “Qual cliente? Toque no certo”, com um botão por cliente (nome + final do telefone). Ao tocar:

- a tela envia o **ID** do cliente (não só o nome); o servidor confere que ele é **deste negócio**, não está arquivado e que a pessoa pode ver clientes (`visualizar_clientes`); se não, recusa;
- a política de execução direta passa a tratar esse cliente como **resolvido**; a Flow IA continua o pedido original (serviço, dia e hora que já estavam na conversa), consulta a disponibilidade e agenda;
- ao modelo vai **só o ID validado, nunca o nome** (nome de cliente é dado de terceiros e poderia carregar instrução maliciosa);
- se o envio falhar (rede), o cartão volta e a pessoa toca de novo, sem redigitar; “×” fecha o cartão sem enviar; o cartão só aparece enquanto a última mensagem é a pergunta da Flow IA.

**Regra de nome e sobrenome**: já vale sem obrigar ninguém a dizer o sobrenome. Se a pessoa fala “Leandro Silva” e só existe um, executa; se falar só “Leandro” e houver dois, aparece o cartão; se houver só um “Leandro” cadastrado, executa direto (a busca única é a prova exigida). Exigir sobrenome SEMPRE, mesmo com um só candidato, é uma mudança de uma linha em `execucao-direta.ts`, mas acrescenta atrito em toda marcação por voz — não ativei; é decisão sua.

## 1.3 Conferência visível (o que foi verificado e se pode gravar)

Antes de qualquer escrita preparada no painel, a Flow IA monta uma **lista de verificações que a pessoa vê**, com um veredito calculado por **regra** (não por opinião do modelo):

| Verificação | De onde vem |
|---|---|
| Cliente (nome e final do telefone), Serviço (duração, preço), Profissional, Dia e hora | Leitura no banco, **dentro do negócio** (cliente/serviço/profissional ativos) |
| **Regras da agenda** | A **mesma** `validarAgendamento` que o domínio usa ao gravar: expediente, antecedência, janela de dias, profissional × serviço, choque de horários, outro horário do cliente no dia |
| Permissão | `acaoPermitida` (as permissões das telas) |
| Cliente identificado / Serviço no catálogo / Horário da agenda oficial | Provas do turno: veio de uma consulta oficial? (a busca por nome teve resultado único?) |

Veredito: **pronto** (tudo conferido) → pode gravar; **atenção** (algo a olhar, ex.: cliente não confirmado por busca, horário já registrado) → mostra a lista e o botão vira “Confirmar mesmo assim”; **bloqueado** (cliente/serviço inexistente, horário ocupado ou fora do expediente, permissão) → **não se cria confirmação**, nada é gravado, a lista mostra o problema em vermelho e a Flow IA explica e oferece alternativas.

Onde aparece: no cartão “Confere?” (com os botões), e dentro da resposta quando já foi gravado (“Tudo conferido”) ou foi bloqueado. A conferência **só lê** (teste garante que não grava nada) e usa a regra oficial, então não pode divergir do que o sistema faria ao gravar. Execução direta passa a exigir veredito **pronto**. Se a conferência falhar por erro técnico, vira “atenção” (cai na confirmação), nunca derruba o pedido. Interruptor: `CORTAI_CONFERENCIA=false` volta ao fluxo anterior. Só no painel; WhatsApp não muda.

## 2. Fluxo (do pedido ao resultado)

1. **Captura**: botão de microfone no chat (`AssistenteCortai.tsx` + `useGravadorDeVoz.ts`). Só aparece se o navegador tem `getUserMedia` e `MediaRecorder`; senão a pessoa escreve. Até 60 s; toque no quadrado para enviar; cancelar disponível; fechar o chat solta o microfone.
2. **Transcrição**: o navegador manda o áudio (base64) para `transcreverComandoDeVozDoPainel` (`voz.functions.ts`): exige sessão e vínculo ativo; valida tipo e tamanho (≤ 4 MB); limite de 60 transcrições/hora por pessoa; usa a chave que **só existe no servidor**; o áudio não é gravado nem logado.
3. **Cérebro**: o texto transcrito aparece como mensagem da pessoa e segue por `perguntarAoCortai` → `pensarCortai`, com o contexto autenticado (negócio, papel, profissional e permissões resolvidos no servidor — nunca vindos do navegador).
4. **Intenção e ferramentas**: o modelo só escolhe ações do catálogo. Roteiro (instruído no prompt do painel): `buscar_cliente_por_nome` → `listar_servicos` → datas relativas (“amanhã”) pela data do servidor → `consultar_disponibilidade` → `criar_agendamento`.
5. **Pergunta só o necessário**: mais de um “Leandro” → pergunta qual (nome + final do telefone); nenhum → oferece cadastrar; falta serviço/hora → pergunta isso; horário ocupado → oferece horários reais.
6. **Validação no backend**: cliente/serviço/profissional do negócio, regras da agenda, conflito, permissões e papel — as mesmas do caminho confirmado.
7. **Execução direta ou confirmação**: ver seção 3.
8. **Gravação verificada**: depois do domínio, o registro é **relido** (mesmo negócio, cliente, serviço, profissional e horário). Divergência = erro.
9. **Resposta**: em execução direta, o texto vem do **sistema** (“Pronto ✅ Concluído: Agendar Corte … para Leandro Silva.”), nunca do modelo. A Agenda aberta é atualizada (ela já assina mudanças em tempo real; o chat também invalida o cache).
10. **Falha**: nada é afirmado. O modelo recebe o motivo real (“Esse horário acabou de ser reservado”), oferece alternativas, e a barreira de saída impede “agendei” sem execução.

## 3. ⚠️ Mudança de regra: execução direta (precisa da sua ciência)

Até aqui valia “**toda** escrita vira pendente e só executa após o SIM” (`brain/AGENTS.md`, `CLAUDE.md`). Você pediu execução sem confirmação redundante quando os dados forem claros. Implementei como **exceção estreita e auditável** (`brain/execucao-direta.ts`), não como o novo padrão:

- Só `criar_agendamento` é “dispensável” (`POLITICA_DE_CONFIRMACAO`). Cancelar, remarcar, cadastrar e anotar **seguem exigindo SIM**.
- Só no **painel**, com **dono ou profissional** autenticado. WhatsApp, site e cliente nunca executam direto.
- **Por voz, NÃO executa direto (padrão).** A transcrição pode errar um nome ou uma hora, então a Flow IA mostra **“Entendi assim: Agendar Corte com Rafa em segunda, 12/10, 15:00 para Leandro Silva. Posso confirmar?”** e um cartão com **Confirmar** / **Não** (um toque, sem digitar “sim”). O texto da conferência é montado pelo **sistema** com os nomes validados no banco — o modelo não consegue parafrasear errado a data, a hora ou o cliente. Texto digitado continua direto. Para a voz também executar direto: `CORTAI_EXECUCAO_DIRETA_VOZ=true`.
- Só se **cada referência foi provada por uma consulta oficial neste mesmo turno**: o cliente apareceu como resultado **único** da busca por nome; o serviço está em `listar_servicos`; o horário (instante exato, profissional e serviço) veio de `consultar_disponibilidade`. O modelo **não consegue** chutar id nem horário.
- Cliente homônimo (busca com 2+ resultados) **nunca** resolve: cai na confirmação.
- Faltou qualquer prova → o fluxo antigo (resumo + “Posso confirmar?”). Nada executa sem o SIM.
- **Interruptor**: `CORTAI_EXECUCAO_DIRETA=false` desliga tudo e volta ao comportamento anterior, sem deploy de código.
- O que a política **não** garante: que a transcrição acertou a **intenção**. Se o áudio “15h” virasse “5h”, o horário seria outro (e ainda assim livre e válido). Por isso o resultado é sempre dito com dia, hora, serviço e cliente, e a pessoa vê o comando transcrito na conversa. Cancelar continua exigindo SIM.

Não há configuração por negócio (exigiria migração). Se quiser “execução direta ligada/desligada por negócio”, o caminho é uma coluna em `config_atendimento_ia` — decisão sua.

## 4. Duplicidade: reenvio de mensagem, de áudio e timeout

Três camadas, da mais forte para a mais fraca:

1. **Semântica (a que importa)** — `agendarComSeguranca`: antes de gravar, procura o **mesmo** agendamento ativo (negócio + cliente + serviço + profissional + horário); se existir, devolve “já estava registrado, não criei outro”. Se a gravação falhar por corrida, procura de novo: encontrou o idêntico → sucesso idempotente. Cobre áudio reenviado, “sim” repetido, nova tentativa após timeout e duas chamadas simultâneas. **Cancelado não conta** (dá para agendar de novo).
2. **Por requisição** — `idempotencia-de-pedido.ts`: o navegador gera um `idDaMensagem` por envio e o reutiliza se a primeira tentativa falhou/estourou o tempo. O servidor devolve a mesma resposta se já respondeu, avisa “ainda processando” se há outra em andamento, e reprocessa (sem duplicar a fala) se a tentativa anterior morreu. Evita chamar o modelo duas vezes.
3. **Ação pendente** (já existia + correção da fase anterior): a reivindicação condicional impede dois “sim” de executarem a mesma pendente.

Limite honesto da camada 2: sem índice único no banco, a disputa “quem inseriu primeiro” não é 100% atômica. Por isso a camada 1 não depende dela. Se quiser blindar também a camada 2, a migração mínima (aditiva) seria um índice único parcial em `mensagens_de_ia (conversa_id, (acao->>'idDaMensagem')) WHERE autor = 'barbeiro'`. **Não apliquei nenhuma migração.**

## 5. Segurança preservada

- Catálogo, permissões e isolamento: `acaoPermitida` (painel exige as permissões das telas), toda consulta com `tenant_id`. `buscar_cliente_por_nome` é só do painel/equipe; **cliente e site nunca a recebem** (teste dedicado) — ela listaria outros clientes.
- Privacidade: a busca devolve ao modelo só id, nome e **final** do telefone.
- Chaves só no servidor; o navegador nunca vê a chave de transcrição.
- Prompt injection: comando que embute “cancele tudo” não amplia a ação (cancelar nunca é direto); barreiras de entrada e saída existentes.
- Observabilidade: novo estado `acao_executada_direta` e `origem` (texto/voz); continua sem texto de conversa por padrão.

## 6. Como estender (consultar agenda, achar cliente, observação, remarcar)

Cada operação futura é uma entrada em `ACOES` com sua `permissoes` e `risco`. Para executar sem SIM, ela precisa (a) entrar em `POLITICA_DE_CONFIRMACAO` e (b) ganhar uma regra de prova em `decidirExecucao`. Mapa:

| Comando | Já existe | Falta |
|---|---|---|
| “Localizar clientes” | `buscar_cliente_por_nome` (leitura) | — |
| “Verificar horários” | `consultar_disponibilidade` | — |
| “Agenda de hoje” | `minha_agenda` (hoje só WhatsApp-equipe) | liberar no painel com permissão de ver agenda |
| “Registrar observação” | `registrar_nota` (escrita, SIM) | regra de prova + decidir se dispensa SIM |
| “Remarcar” | `reagendar_agendamento` (escrita, SIM) | idempotência semântica análoga + decidir política |

## 7. Arquivos

Novos: `brain/execucao-direta.ts`, `brain/busca-cliente.ts`, `brain/idempotencia-de-pedido.ts`, `voz.server.ts`, `voz.functions.ts`, `components/ia/useGravadorDeVoz.ts`, `promptfoo/testes/voz.yaml` e testes. Alterados: `brain/acoes.server.ts`, `brain/agente.server.ts`, `brain/guardas.ts`, `brain/observabilidade.server.ts`, `assistente.functions.ts`, `AssistenteCortai.tsx`, `whatsapp/transcricao.server.ts` (só o nome/extensão do arquivo enviado). Sem migração, sem dependência nova.

## 8. Testes (dados fictícios; nenhum agendamento real)

Ver o relatório no fim da sessão para os números. Cobertura: política (20), catálogo/idempotência/permissões/isolamento sobre banco simulado (21), agente com modelo roteirizado (15), idempotência de requisição (8), transcrição no servidor (11), gravador no navegador com `MediaRecorder` simulado (12) e **12 cenários Promptfoo** de voz rodando o cérebro real com mundo fictício.

## 9. O que NÃO foi validado

- Microfone real em navegador real (Chrome/Safari/Firefox/iOS): só com `getUserMedia`/`MediaRecorder` simulados. `getUserMedia` exige **HTTPS** (produção ok). Safari grava `audio/mp4`: confirmar que o provedor de transcrição o aceita.
- Transcrição de áudio real em português (nomes próprios!) e latência.
- Qualidade do modelo real no roteiro (rode `npm run avaliar` com chave; com o modelo simulado só o encanamento é validado).
- Filtros de caminho JSON (`acao->>idDaMensagem`) e a RPC `criar_agendamento` contra o **banco real** (o MCP do Supabase não conectou).
- Experiência visual (não abri o app no navegador).
