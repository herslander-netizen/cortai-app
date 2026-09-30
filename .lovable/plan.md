# Lista de espera operacional com oferta automática de vaga

## O que já existe (reaproveitado)
- Tabela `fila_de_espera` (cliente, serviço, profissional, janela/dia, posição, status, avisado_em).
- Cliente entra pela tela `/app/espera` e pelo agendamento público quando o recurso `fila_espera` está ativo.
- Tela do barbeiro `/barbeiro/fila` (avisar, tirar da fila, recuperado no mês).
- `avisarListaDeEspera` já é chamado no cancelamento e envia pelo WhatsApp da barbearia (motor de notificações oficial, com consentimento e dedupe).
- Motor de slots `disponibilidade.ts` + `regrasDaBarbearia` já usa `duracao_min` do serviço e o passo do tenant.

## Lacunas encontradas
- Aviso atual só considera profissional; ignora serviço/duração, dia e período preferidos.
- Não há oferta com prazo, recusa, próxima pessoa nem histórico.
- Barbeiro não edita, reordena nem converte em agendamento.
- Agenda não mostra que a vaga veio da lista.
- Cliente em agenda cheia nem sempre vê o convite para entrar na lista.

## O que será feito
1. **Banco (mínimo, sem apagar nada)**
   - Nova tabela `ofertas_da_fila`: fila, agendamento liberado, profissional, serviço, início/fim, status (`enviada`, `aceita`, `recusada`, `expirada`, `falhou`), expira_em, canal, token seguro. Grants + RLS por membro do tenant.
   - Coluna `agendamentos.origem_fila_id` (opcional) para marcar vagas preenchidas pela lista.
   - RPC `aceitar_oferta_da_fila(token)` atômica: bloqueia a oferta, confere validade, cria o agendamento pelo `criar_agendamento` oficial (trava `agendamentos_sem_sobreposicao` protege dupla reserva) e marca a fila como atendida.
2. **Detecção automática**: ao cancelar (barbeiro, cliente, WhatsApp), procurar candidatos compatíveis: mesmo tenant, serviço cuja duração cabe no buraco real (motor oficial), profissional compatível, dia e período preferidos. Cria oferta para o primeiro por posição.
3. **Notificação**: mensagem pela Secretária Cortaí existente com serviço, profissional, data/hora no fuso do tenant e link "Quero este horário" (+ botão no WhatsApp). Sem WhatsApp conectado: oferta fica registrada e aparece para o barbeiro avisar manualmente.
4. **Expiração/recusa**: prazo padrão de 15 min; varredura no cron de lembretes já existente passa ao próximo elegível; recusa pelo link ou WhatsApp faz o mesmo.
5. **Painel do barbeiro** (`/barbeiro/fila`): "3 clientes aguardando", serviço, período, posição, status da oferta, subir/descer, editar preferência, remover (com desfazer já existente), "Agendar" que abre o agendamento manual oficial já preenchido, histórico de ofertas.
6. **Cliente**: quando o dia/serviço não tem horário, mensagem "Agenda cheia? Entre na lista de espera e avisaremos quando surgir uma vaga." no Tradicional e no Cortaí Chat; página de aceitar oferta com status claro.
7. **Agenda**: selo discreto "Da lista de espera" no cartão do atendimento.
8. **Duração/slots**: auditar Tradicional, Chat, WhatsApp e agendamento manual para confirmar uso de `duracao_min` por serviço e passo do tenant; corrigir qualquer ponto que ainda assuma duração fixa.

## Fora do escopo
- Reserva automática sem confirmação.
- Nova integração de mensagens.

## Validação
- Testes do motor de compatibilidade (duração, período, profissional), expiração/próximo e corrida de aceite dupla.
- Fluxo real com a conta barbeiro.teste: entrar na lista, cancelar, ver oferta, aceitar, agendamento aparece com selo; segunda aceitação falha.
- 390px e 1280px, TypeScript, lint, testes, build. Sem publicar.

## Pendência possível
- Envio real depende de WhatsApp conectado no negócio; sem isso, a oferta é criada e o barbeiro recebe o aviso interno.
