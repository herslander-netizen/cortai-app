# Seção 51 — Ajustes obrigatórios do WhatsApp

As regras ficam salvas como permanentes. Conferência rápida do que já existe e do que falta:

| Regra | Hoje | Ação |
|---|---|---|
| Deduplicação, motor, agendador de lembretes | Existem | Manter; nada paralelo |
| Trava de horário no banco | Existe (C1) | Bot passa a oferecer 3 horários livres quando o banco recusar |
| Fuso da barbearia | Corrigido (A1) | Revisar "amanhã" no motor e na janela dos lembretes |
| "barbeiro" como gatilho humano | Não é gatilho (só lista profissionais) | Adicionar teste que garante isso |
| Telefone com/sem 9 | Só remove não-dígitos | Criar normalização única |
| Número compartilhado | Barbearia vem só da conexão | Identificar por código, histórico ou pergunta |
| Janela de 24h | Não verificada | Fora da janela, só template aprovado |
| WhatsApp só no Pro | Recurso existe na matriz | Garantir que Essencial não liga o bot (sem bloquear operação) |

## O que muda

1. **Telefone normalizado** — uma função única: só dígitos, com DDI 55, e o 9 do celular tratado como opcional na comparação. Usada ao achar conversa, cliente e lembretes.
2. **Número compartilhado** — quando a conexão é o número central do Cortaí:
   - código ou link de entrada ("oi, vim pelo link da barbearia-x") define a barbearia;
   - sem código, usa a última barbearia em que o telefone foi atendido;
   - se o telefone é cliente de mais de uma barbearia, pergunta com opções numeradas;
   - a escolha fica guardada na conversa. Conversa passa a ser por barbearia + telefone (já é).
3. **Janela de 24h** — antes de qualquer envio iniciado pela barbearia (lembrete, pós-atendimento, retorno), confere a última mensagem recebida do cliente. Fora de 24h no canal oficial: só template aprovado; sem template, o envio é registrado como pulado, sem erro. Evolution não tem essa regra.
4. **Mesma interface** — Meta e Evolution já passam pelo mesmo gateway; o gateway passa a informar se aceita botões e se exige template, e o texto numerado é usado quando não aceita.
5. **Horário recusado** — quando o banco recusa, o bot responde "Esse horário acabou de ser reservado" e já oferece os próximos livres, no fuso da barbearia.
6. **Plano** — atendimento automático e lembretes só rodam em Pro/Studio. No Essencial, o bot não responde e a tela mostra um aviso discreto; agenda, comanda e pagamento nunca são bloqueados.

## Detalhes técnicos
- Nova `src/lib/telefone.ts` (`normalizarTelefone`, `variantesDoTelefone`), aplicada em `fluxo.server.ts`, `lembretes.server.ts`, `notificacoes.server.ts`, busca de clientes.
- Número central: marca na `conexoes_whatsapp` (coluna `compartilhada boolean default false`) — única migração; resolução em `fluxo.server.ts` antes de `conversaDoTelefone`, sem mexer na lógica central do motor.
- Janela: consulta `mensagens_whatsapp` (direção entrada, última) em `enviarPelaBarbearia` quando `porIa`/automação; `gateway.server.ts` ganha `capacidades()` por canal.
- Recusa de horário: tratar "horario ja ocupado" em `ia/acoes.server.ts` e devolver sugestões via busca de horários já existente.
- Plano: checar `recurso_do_tenant_ativo(tenant,'cortai_whatsapp')` em `processarMensagemRecebida` e em `processarAutomacoesDeWhatsapp`.
- Testes Vitest: normalização com/sem 9, "quero marcar com o barbeiro João" não vira humano, "amanhã" às 23h de São Paulo.
