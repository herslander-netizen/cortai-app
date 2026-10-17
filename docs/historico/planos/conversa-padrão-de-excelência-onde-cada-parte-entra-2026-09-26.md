# Conversa Padrão de Excelência — onde cada parte entra

O documento já foi salvo em `docs/conversa-padrao.md`. Nada do bot foi alterado. Abaixo, cada parte e onde ela entra no que já existe. O motor de regras já existe (determinístico, sem IA paga), então a conversa vira **regras e textos do motor**, não instruções de IA.

## Mapa

| Parte do documento | Onde entra hoje | O que muda |
|---|---|---|
| 1. Princípios | Motor (`motor.server.ts`) e respostas | Aplicados como regras: 3 horários por vez, resumo completo antes de confirmar, "o de sempre", "Vou confirmar com a equipe" quando falta dado, "atendente" em qualquer ponto, fora do horário continua automático |
| 2. Vocabulário global | `vocabulario.ts` (palavras, aliases, números) | Só **acrescentar** termos que faltam. Nenhum termo existente sai |
| 3. Datas e horários | `dataCitada` / `periodoCitado` (já no fuso da barbearia) | Conferir os períodos do documento (manhã/tarde/noite) e ajustar só onde divergir |
| 4. Situações (Saudação, Serviços, Local, Profissionais, Pagamento, Agendar, O de sempre, Agenda cheia, Outra pessoa, Remarcar, Cancelar, Atraso, Chegada, Elogio, Reclamação, Fidelidade, Valor a pagar, Pix, Produtos, Imagem, Mensagens picadas, Não entendeu, Humano, Parar, Fora do escopo, Terceiros, Objeto esquecido, Eventos) | Intenções (`intencoes.ts`) + estados (`estado.ts`) + textos do motor | As que já existem recebem o texto padrão. As que faltam viram intenções novas no mesmo motor, sem fluxo paralelo |
| Dados (serviços, preços, profissionais, horários, endereço, Pix, regras) | Banco, lidos pelo motor | Sempre por variável (`{{nome}}`, `{{servico}}`...). Nada fixo no código |
| Textos editáveis + ligar/desligar cada situação | `config_atendimento_ia` (já tem tom, boas-vindas, fora do horário, confirmar/remarcar/cancelar, lembretes, recuperação) | Adicionar **um** campo de textos por situação (com o padrão do documento quando vazio) e um de situações ligadas/desligadas. Sem tabela nova |
| FAQ | `informacoes_da_barbearia` (já existe) | Reaproveitar como FAQ editável; o bot responde a partir dele |
| 5. Notificações padrão | Agendador atual (`notificacoes.server.ts` + `lembretes.server.ts`) | Trocar os textos pelos do documento. Confirmação, lembrete, cancelamento, remarcação, vaga da lista e retorno **já existem**. Novos no mesmo agendador: horário próximo (1h, desligado), pós-atendimento (2h), falta, valor a pagar (7 dias), aniversário (desligado) |
| 6. Configurações padrão | Valores iniciais de `config_atendimento_ia` e onboarding | Tom descontraído, 3 horários, tolerância 10 min, antecedência 30 min, e o restante, aplicados a barbearias novas; as atuais recebem só o que estiver vazio |
| Tela de edição | Configuração do atendimento do WhatsApp (painel atual) | Nova seção "Conversa" na mesma tela: lista de situações com chave liga/desliga e texto editável, e o FAQ |
| Plano | `recurso_do_tenant_ativo` | WhatsApp a partir do Pro; fidelidade só para quem tem o recurso. Essencial não vê a seção |
| Canais | `gateway.capacidades()` | Mesma conversa; botões/listas no oficial, opções numeradas nos demais |
| Templates da Meta | Novo documento `docs/templates-meta.md` | Lista pronta para aprovação, com categoria: utilidade (confirmação, lembrete, horário próximo, cancelamento, remarcação, vaga, falta, valor a pagar) e marketing (pós-atendimento, retorno, aniversário) |
| 7. Conversas de teste | Testes automatizados do motor (Vitest, já existem) | As 8 conversas viram testes que simulam as mensagens, sem enviar nada real. Mostro o resultado de cada uma |

## Ordem de execução

1. Vocabulário e textos padrão das situações que já existem.
2. Campos de textos/situações em `config_atendimento_ia` (uma migração, sem tabela nova) + seção "Conversa" no painel.
3. Situações novas no motor.
4. Notificações novas no agendador atual.
5. `docs/templates-meta.md`.
6. As 8 conversas de teste, com o relatório do resultado.

## Não muda

Estrutura do motor, webhooks, deduplicação, trava de horário, fuso, telefone normalizado, número compartilhado, notificações ligadas à conversa, RLS e permissões. Sem IA paga.
