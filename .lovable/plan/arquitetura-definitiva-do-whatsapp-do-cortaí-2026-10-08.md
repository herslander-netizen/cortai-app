# Arquitetura definitiva do WhatsApp do Cortaí

Plano consolidado. Nada é alterado neste turno. Estado verificado: 4 conexões (2 Meta compartilhadas de atendimento, Aurora/Evolution `cortai` atendimento conectada, Aurora notificações própria em `qr_pronto`); nenhuma linha Central criada; Central desligada para todos.

## 1. Modelo definitivo

```text
Estabelecimento (tenant)
  └─ 1 conexão WhatsApp principal (número da empresa, QR)
        ├─ Entrada: clientes e profissionais escrevem para a empresa
        ├─ Saída cliente: respostas, confirmações, lembretes, avisos
        └─ Saída profissional: avisos para telefones VERIFICADOS da equipe
  └─ Central de Notificações = interruptores e regras (não é número)
        ├─ notificacoes_whatsapp_ativas (liga/desliga geral)
        └─ regras por tipo de aviso (já existem em config_atendimento_ia)
```

- Nome do módulo: **WhatsApp**. "Secretária" sai da interface e dos textos.
- Uma conexão por estabelecimento. Sem segundo número de notificações, sem número da plataforma enviando por estabelecimento.
- Um só motor: webhook → `fluxo.server.ts` → avisos numerados / cérebro → envio.

## 2. Fluxos completos

**Estabelecimento/Admin**: dono abre Painel → WhatsApp → lê QR → status Conectado. Liga/desliga notificações e escolhe tipos de aviso. Admin vê a mesma conexão de qualquer estabelecimento (status, número, QR, reconectar, desconectar, interruptores), sempre isolado por estabelecimento.

**Cliente**: escreve para o número da empresa. Aviso aberto + número → ação determinística (1 Confirmar, 2 Remarcar, 3 Cancelar; vários avisos → "qual horário?"). Texto livre → cérebro (só propõe; executa após confirmação). Áudio → pedido para escrever. Sucesso só por texto fixo após o resultado real.

**Profissional**: evento real (novo, cancelado, remarcado, chegou) → catálogo decide canais por pessoa. Sininho sempre; push se inscrito; WhatsApp só se o profissional verificou o telefone ("CODIGO 123456") e ligou WhatsApp nas preferências — enviado pelo **mesmo número da empresa**. Respostas do profissional reconhecidas pelo telefone verificado, com permissões de `acaoPermitida` (só a própria agenda). Fora da janela de 24h, fica em sininho/push (sem modelo pago para equipe).

## 3. Arquitetura atual vs alvo

| Tema | Hoje | Alvo |
|---|---|---|
| Conexões por negócio | até 2 (`tipo` atendimento/notificacoes) | 1 principal; `tipo=notificacoes` vira legado só leitura |
| Central | número da plataforma (`escopo='central'`) com rollout | interruptor/regras; número da plataforma congelado (desligado, sem tela) |
| Roteamento | `escolherConexaoDeNotificacao` com própria/central/legado | conexão única serve tudo; notificações desligadas → nada sai |
| Profissional | push + WhatsApp via conexão de notificações | push + WhatsApp via conexão principal |
| Admin | tela só da Central da plataforma | tela por estabelecimento |
| Termo | "Secretária" em 20 arquivos | "WhatsApp" / "CortAI" |

Já correto e mantido: webhook com segredo, dedupe, números fixos, texto fixo de sucesso, áudio pede texto, monitor 15 min com reconexão limitada, identidade por telefone verificado, catálogo de avisos.

## 4. Matriz de eventos/destinatários

| Evento | Cliente | Profissional | Dono |
|---|---|---|---|
| Agendamento criado | WhatsApp | sininho, push, WhatsApp* | sininho, push, WhatsApp* |
| Remarcado / Cancelado | WhatsApp | idem | idem |
| Confirmado pelo cliente | — | sininho | sininho |
| Cliente chegou | — | push, WhatsApp* (crítico) | push |
| Atraso avisado | WhatsApp | sininho | — |
| Lembrete / vaga / pós-atendimento | WhatsApp (consentimento p/ relacionamento) | — | — |
| Pix informado / falha de entrega | — | — | sininho, push |
| Conexão caiu / QR necessário | — | — | sininho, push; Admin vê |

\* WhatsApp para equipe só com telefone verificado + preferência ligada + janela de 24h.

## 5. Dados e estados

```text
tenant → conexoes_whatsapp (tenant_id, escopo='tenant', tipo='atendimento')
       → notificacoes (evento, destinatario, canais decididos)
       → envios_de_whatsapp (idempotência, ACAO:{id}, status)
       → mensagens_whatsapp / conversas_whatsapp (entrada)
       → resultado da ação → texto fixo
```

Estados da conexão: desconectado → qr_pronto → conectando → conectado → (erro/desconectado). Eventos atrasados ignorados; número nunca apagado. Reconexão: 15 min a 6 h, máximo 6 tentativas; QR nunca contornado, dono avisado. Falha de envio: registrada, aviso ao dono, operação segue.

Sem migration nova. `tipo`, `escopo` e a flag `notificacoes_central_habilitada` permanecem no banco (sem apagar), marcados como obsoletos em comentário numa etapa futura.

## 6. Telas

- **Painel → WhatsApp** (`/barbeiro/cortai`, título "WhatsApp"): um cartão da conexão (status, número, QR, reconectar, desconectar); interruptor "Enviar notificações"; tipos de aviso; responder automaticamente. Legado de notificações: aviso "número antigo de notificações não é mais usado" com opção desconectar.
- **Preferências do profissional**: verificar telefone e ligar WhatsApp/push (já existe; revisar texto).
- **Admin → WhatsApp** (`/admin/whatsapp`, reaproveitada): lista de estabelecimentos com status/número/última verificação; ao abrir, QR, reconectar, desconectar, interruptor de notificações. Apenas admin. Também adicionar o atalho na barra lateral do Admin.

## 7. Regras de segurança/IA

- Toda função Admin confere `has_role(admin)` no servidor; ações sobre conexão de um negócio sempre filtradas pelo `tenant_id` informado.
- Webhook exige segredo; `sessao_id` mapeia para uma só conexão/negócio.
- IA nunca executa nem afirma sucesso; número solto com aviso aberto nunca vai à IA.
- Dedupe por evento/pessoa, idempotência em envios e ações, retries limitados, auditoria em mudanças de conexão e interruptores.
- Falha do WhatsApp nunca bloqueia agenda.

## 8. Plano de implementação por etapas

1. **Roteamento único**: `conexaoDeEnvio("notificacoes")` passa a usar a conexão principal do negócio; se `notificacoes_whatsapp_ativas=false`, nada sai. Remove o caminho Central da plataforma do roteamento (flag continua falsa no banco). Ajustar `finalidade-conexao.ts`, `conexao-envio.server.ts`, `aviso-equipe-whatsapp.server.ts`.
2. **Legado**: conexão `tipo=notificacoes` ignorada no envio; tela permite desconectá-la. Aurora: a linha em `qr_pronto` fica sem uso.
3. **Tela do estabelecimento**: um cartão, título "WhatsApp", sem segundo cartão.
4. **Admin por estabelecimento**: reaproveitar `/admin/whatsapp` e funções existentes de conexão (`whatsapp.functions.ts`) via wrappers admin em `whatsapp-central.functions.ts`; atalho na barra lateral.
5. **Nomenclatura**: trocar "Secretária" nos 20 arquivos por "WhatsApp"/"CortAI" (só textos; nomes de arquivo internos podem ficar).
6. **Documentação**: atualizar `src/lib/whatsapp/AGENTS.md` (regras da Central e duas conexões substituídas).

## 9. Testes de aceitação

- Conexão única conectada: lembrete ao cliente e aviso ao profissional saem pelo mesmo número.
- Notificações desligadas: nenhum aviso sai; conversa com cliente continua.
- Conexão caída: aviso não sai, falha registrada, dono avisado, agenda funciona.
- Cliente responde "1" com um aviso → confirma; com dois → pergunta horário; texto fixo só após sucesso.
- Profissional sem telefone verificado não recebe WhatsApp; verificado e ligado recebe; resposta limitada à própria agenda.
- Áudio → pedido de texto.
- Usuário não admin barrado em todas as funções Admin; Admin do negócio A não altera B.
- Linha legada de notificações e flag Central não afetam envio.
- Ponta a ponta na Aurora: escanear, receber "Oi", criar agendamento, cliente e profissional avisados.

## 10. Riscos/conflitos

- **Conflito direto com a Central implementada hoje** (número da plataforma): a decisão 3 a substitui. Proposta: congelar, não apagar.
- Estabelecimentos nas conexões Meta compartilhadas: continuam pelo número compartilhado até conectarem o próprio; confirmar se isso ainda é desejado.
- Avisos à equipe fora de 24h não chegam por WhatsApp (só push/sininho).
- Profissional respondendo ao número da empresa precisa estar verificado, senão é tratado como cliente.

## 11. Critério de pronto

Uma conexão por estabelecimento atende clientes e profissionais; interruptor de notificações funciona; Admin gerencia cada estabelecimento isoladamente; nenhum texto "Secretária" visível; testes, typecheck e lint passando; teste ponta a ponta na Aurora aprovado; sem publicação até autorização.

## Não criar

Segundo número de notificações, número da plataforma enviando por estabelecimento, novo motor de conversa, novo agendador, transcrição de áudio, tabelas novas, migrations destrutivas, ação de pagamento pela IA.
