# Notificações ao cliente pelo WhatsApp — calendário e proteção do número

Decisão do dono (06/11/2026): lembrete de véspera às 15h para confirmar (como o AgendaClick), aviso no dia, lista de
espera, e o máximo de cuidado para o número do negócio não ser banido.

## O que sai e quando (fuso do negócio)

| Aviso | Quando | O que pede |
|---|---|---|
| Confirmação do agendamento | na hora em que o cliente marca | nada (dados do horário) |
| **Lembrete de véspera** (`lembrete_24h`) | dia anterior, **a partir das 15:00, até as 20:00**, espalhado pelas varreduras de 15 min | **SIM** para confirmar, **NÃO** para mudar (remarcar/cancelar) |
| "Está chegando" (`lembrete_2h`) | 2h antes, só entre 08:00 e 21:00 | nada |
| Vaga da lista de espera | quando a vaga abre (`ofertarVaga`), prazo das Regras da lista | aceitar |
| Retorno / pós-atendimento | só com consentimento de relacionamento | — |

Quem marcou há menos de 3 horas não recebe a véspera (a confirmação é recente). Atendimento marcado para hoje não tem
véspera; recebe só o "está chegando".

Código: `src/lib/whatsapp/calendario-de-lembretes.ts` (regras puras e testadas) e a varredura em
`notificacoes.server.ts` (`candidatosDaVespera`).

## Proteção contra banimento (todas valem juntas)

1. **Porteiro** (`porteiro.ts`): só telefone confirmado pela pessoa; SAIR, "número errado" e número recusado param
   tudo.
2. **Consentimento por finalidade** (`consentimento.server.ts`): lembrete operacional ≠ relacionamento; marketing só com
   opt-in.
3. **Horário de silêncio:** nada automático entre 21:00 e 08:00.
4. **Sem rajada:** véspera espalhada das 15h às 20h; ordem sorteada (nunca a ordem da agenda); no máximo 12 por negócio a
   cada varredura de 15 min; teto de 60 por hora por número (`ritmo.ts`); pausa variável entre envios.
5. **Textos que não são cópia exata:** a abertura do lembrete de véspera varia entre clientes (estável por agendamento).
6. **Conversa de verdade:** o cliente responde com SIM/NÃO e o atendimento continua na mesma conversa (sem link frio no
   primeiro contato); "digitando…" e leitura antes de responder.
7. **Falhas:** erro do WhatsApp passa por `erros-meta.ts` + `falhas-envio.server.ts`; retentativa limitada; envio preso não
   é reenviado às cegas; o dono é avisado.
8. **Só a conexão do próprio negócio** (`conexaoDeEnvio`): sem número reserva.

## Para o estabelecimento

- Ligar/desligar cada aviso em WhatsApp → Avisos.
- Pedir aos clientes que salvem o número do negócio (contato salvo reduz denúncia).
- Evitar mandar mensagens manuais em massa pelo mesmo número.
