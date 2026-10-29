# Plano completo do Flow — andamento

Legenda: [x] feito · [~] parcial · [ ] não feito. Uma etapa por vez; parar ao fim de cada uma.

## Etapa 1 — Correções da auditoria
- [x] Trava de horário sobreposto no banco
- [x] Bot avisa quando o horário é pego no meio da conversa e oferece outros
- [x] Webhooks: rejeição cedo sem assinatura/token, limite rígido 10/min e folgado 1200/min
- [x] Meta: cada entrega gravada uma vez (caixa de entrada durável)
- [~] Evolution/serviço genérico: mensagem de entrada não duplica (trava no registro), mas não há caixa de entrada por entrega como a Meta
- [x] Lembrete sai uma vez só: reserva antes de enviar (inclusive nova tentativa)
- [x] Serviço genérico não está em uso — não mexer
- [x] Fuso da barbearia em telas, lembretes e WhatsApp
- [x] E-mails: só login e senha, sem horários de agenda
- [x] Telefone: com e sem o 9 são o mesmo cliente; busca direta por variantes
- [x] Telefones convertidos para 55+DDD+número e ajuste automático nos novos
- [x] Índice de telefone por barbearia já existe
- [x] Permissões no banco (RLS), atualização na hora, tela clara para desvinculado
- [x] Recuperação de senha neutra, logo legível, metatags padronizadas

## Etapa 2 — Auditoria do dinheiro
- [x] Relatório entregue (14 itens)
- [x] Corrigidos: fiado com limite e só dono, fidelidade só no pagamento, comissão líquida, baixa de fiado registrada, estorno supervisionado, preço alterado exige permissão
- [ ] Validades/rollover (sem créditos com validade ainda)
- [ ] Caução (aguardando regras)
- [~] Faixas de idade do fiado em 0–30/31–60/61–90/91+ dias desde o lançamento; implementação na branch, aguardando CI e conferência visual (não indica atraso contratual sem vencimento registrado)
- [~] Comparação de receita e saídas com períodos equivalentes até a data atual, respeitando o fuso do negócio; aguardando CI e conferência visual
- [~] Categorização de despesas e resumo das principais categorias no painel; usa o campo existente, sem migração; aguardando CI e conferência visual

## Etapa 3 — Canais, conversas e avisos sem custo
- [~] Número compartilhado (link/código, histórico, menu numerado, troca)
- [~] Resposta ligada ao aviso por ID
- [ ] Remover templates pagos; canal oficial só dentro da janela de 24h
- [ ] Push como primeiro canal; QR code com intervalo e limite diário
- [ ] Link "Adicionar à agenda" e links prontos de confirmar/remarcar/cancelar
- [ ] Áudio: pedir para escrever; IA e transcrição desligadas com interruptor
- [ ] Equipe assume: automação para em todos os canais
- [ ] Cancelar/remarcar refaz os lembretes

## Etapa 4 — Conversa padrão e barbeiro sem perder tempo
- [x] Textos padrão ligados ao motor (saudação nova/conhecida, resumo de confirmação, agenda cheia, falar com a equipe, não entendi, localização); texto da barbearia tem prioridade e situação desligada volta ao texto do motor
- [ ] Situações novas (atraso, elogio, objeto esquecido, eventos, terceiros)
- [ ] Novos avisos pelos canais gratuitos
- [ ] Zero configuração, seção "Conversa" com Avançado fechado
- [ ] FAQ que se preenche sozinho
- [ ] Cartões de decisão por push; resumo do dia

## Etapa 5 — Testes finais
- [ ] 21 testes + roteiro para celular
