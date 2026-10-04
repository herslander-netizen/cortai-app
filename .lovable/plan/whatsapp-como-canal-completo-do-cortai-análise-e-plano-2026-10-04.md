# WhatsApp como canal completo do CortAI — análise e plano

Nada foi alterado. Este documento é a análise pedida, para você aprovar antes de qualquer mudança.

## 1. O que já existe (e será reaproveitado)

- **Um cérebro só** em `src/lib/brain/`: gateway da IA, catálogo de ações reais (serviços, profissionais, disponibilidade, clientes, agendar/remarcar/cancelar, nota, encaminhar para humano), confirmação obrigatória antes de qualquer escrita, auditoria e limites de uso.
- **WhatsApp já chama esse cérebro**: `fluxo.server.ts → responderComCerebro → pensarCortai`, com o histórico da própria conversa, a pausa por falta de crédito e o modo humano.
- **Número compartilhado**: o número oficial atende vários negócios e pergunta ao cliente qual deles quer (`multi-barbearia.ts` + `whatsapp_contexto_numero`).
- **Avisos ao cliente**: `notificacoes.server.ts`, `lembretes.server.ts`, `modelos.ts` (formato dentro/fora da janela de 24h), `confirmacao.server.ts`.

Conclusão: não é preciso criar nenhuma IA, tabela de conversa ou agenda nova. A mudança é de **contexto (quem fala)**, **permissões** e **textos/regras que limitam o canal**.

## 2. Regras que limitam o canal (encontradas)

| Onde | O que diz hoje | Proposta |
|---|---|---|
| Instruções permanentes do projeto (texto de "WhatsApp — Secretária Cortaí") | WhatsApp não é canal de atendimento; CortAI não atende por padrão; mensagem livre deve ir para o site | **Só você pode editar.** Substituir pela nova definição deste documento |
| `brain/agente.server.ts` (canal site) | "Você não agenda por aqui: oriente a pessoa a escolher na tela" | Mantido no site (o site tem tela própria); fora do escopo do WhatsApp |
| `whatsapp/notificacoes.server.ts` | Avisos terminam com "Para agendar ou gerenciar seu horário, use o Cortaí: link" | Trocar por "Responda aqui para remarcar ou cancelar"; o link fica como opção secundária |
| `whatsapp/lembretes.server.ts` (comentário) | Lembretes "nunca abrem conversa livre" | Resposta ao lembrete passa a cair no mesmo cérebro |
| `whatsapp/aviso-equipe.server.ts` | Equipe nunca recebe aviso por WhatsApp | Liberar como opção da equipe (ver conflito 3) |
| `whatsapp/atendimento.server.ts` | Respostas fixas antigas (legado) | Seguem só como reserva quando a IA está pausada |

Segurança, confirmação, isolamento entre negócios e "nunca confirmar pagamento" **continuam iguais**.

## 3. Arquitetura proposta

```text
Mensagem no WhatsApp
   -> identifica o negócio (número próprio ou escolha no número compartilhado)
   -> identifica QUEM fala pelo telefone:
        membro da equipe ativo desse negócio  -> PROFISSIONAL ou DONO
        qualquer outro                          -> CLIENTE
   -> cérebro CortAI único (mesmas ações, permissões por papel)
   -> resposta na mesma conversa (avisos, ações e resultados no mesmo histórico)
```

### Permissões por papel
- **Cliente**: igual a hoje — só vê e altera o que é do próprio telefone.
- **Profissional**: própria agenda (hoje/próximo/último), quem está na fila, avisar atraso ao próximo cliente, pedir encaixe — sempre com confirmação e usando as mesmas regras e permissões já existentes no painel. Sem valores financeiros.
- **Dono**: agenda do negócio inteiro e movimento do dia (ação já existente `consultar_movimento`), respeitando as permissões já cadastradas na equipe.

### Novas ações no catálogo (pequenas, sobre o motor atual)
- `minha_agenda` (profissional: hoje/próximo/último atendimento)
- `consultar_fila` (lista de espera do dia)
- `avisar_atraso` (registra o atraso e manda aviso ao próximo cliente pelo fluxo de avisos que já existe; escrita, pede confirmação)
- Encaixe usa o `criar_agendamento` existente com a regra de encaixe atual (só membros).

### Avisos para a equipe pelo WhatsApp
Novos avisos (novo atendimento, cancelamento, remarcação, atraso) gravados primeiro no sininho, como hoje, e então enviados também por WhatsApp a quem ativou essa opção. A resposta do profissional ao aviso volta ao mesmo cérebro.

## 4. Conflitos e decisões necessárias

1. **Instruções permanentes do projeto** contradizem o pedido. Você precisa atualizar esse texto nas configurações; eu atualizo os arquivos de regras do código (AGENTS.md) e a memória.
2. **Identificar a equipe pelo telefone**: hoje o telefone da equipe só existe no perfil da conta (`perfis.telefone`), sem verificação. Proposta: usar esse telefone, válido só se a pessoa estiver ativa na equipe daquele negócio. Risco: quem cadastrar o telefone de outra pessoa ganharia acesso — por isso, mitigação proposta é confirmar o número uma vez (código enviado pelo próprio WhatsApp) antes de liberar o papel de equipe.
3. **Regra da Meta (24 h)**: avisos iniciados pelo negócio fora da janela de 24 h só podem sair com modelo aprovado de utilidade, e cada um tem custo. Para a equipe será preciso cadastrar e aprovar modelos novos na Meta (não posso inventar). Até lá, o aviso só sai pelo WhatsApp se a janela estiver aberta; senão fica no sininho/push.
4. **Número compartilhado**: um profissional que trabalha em dois negócios no mesmo número vê o menu de escolha, como o cliente.
5. **Custo**: o limite diário atual (400 respostas por negócio) passa a contar também mensagens da equipe; proponho limite separado para a equipe (ex.: 200/dia), sem travar o painel.

## 5. Arquivos a alterar

- `src/lib/brain/acoes.server.ts` — papel no contexto (`cliente | profissional | dono`), 3 ações novas, filtro de ações por papel.
- `src/lib/brain/agente.server.ts` — instruções por papel no canal WhatsApp.
- `src/lib/brain/uso.server.ts` — limite separado para equipe.
- `src/lib/whatsapp/fluxo.server.ts` — identificar papel antes de chamar o cérebro.
- Novo `src/lib/whatsapp/identidade.server.ts` — telefone → papel + negócio (+ verificação do número).
- `src/lib/whatsapp/notificacoes.server.ts`, `lembretes.server.ts` — textos convidando a responder na conversa.
- `src/lib/whatsapp/aviso-equipe.server.ts` — envio opcional à equipe pela mesma regra de formato (`decidirFormato`).
- Tela de preferências de avisos da equipe (opção "receber pelo WhatsApp" + confirmar número).
- Migração aditiva mínima: data de verificação do telefone da equipe e preferência de canal (nada removido).
- `AGENTS.md` (raiz, brain, whatsapp) e memória: nova definição do canal.
- Testes: identificação de papel, permissões por papel, isolamento entre negócios, confirmação antes de escrita.

## 6. Ordem de implementação

1. Regras e textos (remover limitações, sem mudar comportamento de segurança).
2. Identificação de papel + verificação do número da equipe.
3. Ações do profissional/dono e permissões.
4. Avisos para a equipe pelo WhatsApp (dependem dos modelos aprovados na Meta para fora da janela).
5. Testes, verificação em 390px/1280px, build. Sem publicar.

## Critérios de aceitação
- Cliente agenda, remarca e cancela conversando, com horários reais e confirmação.
- Profissional pergunta "quem é meu próximo cliente?" e recebe só a própria agenda.
- Telefone desconhecido nunca recebe dados da equipe; nenhum dado cruza negócios.
- Pagamento continua confirmado só pela equipe.
- Falha do WhatsApp nunca trava agenda, comanda ou financeiro.
