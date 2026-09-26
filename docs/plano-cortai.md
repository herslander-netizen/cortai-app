# Plano completo do Cortaí — andamento

Legenda: [x] feito · [~] parcial · [ ] não feito. Uma etapa por vez; parar ao fim de cada uma.

## Etapa 1 — Correções da auditoria
- [x] Trava de horário sobreposto no banco
- [~] Bot avisa quando o horário é pego no meio da conversa e oferece outros (tratado nas ações do assistente; conferir no motor do WhatsApp)
- [x] Webhooks: rejeição cedo sem assinatura/token, limite rígido 10/min e folgado 1200/min
- [x] Meta: cada entrega gravada uma vez (caixa de entrada durável)
- [~] Evolution/serviço genérico: mensagem de entrada não duplica (trava no registro), mas não há caixa de entrada por entrega como a Meta
- [~] Lembrete sai uma vez só: confere antes de enviar, mas não reserva antes (dois disparos simultâneos podem duplicar)
- [ ] Confirmar se o serviço de WhatsApp genérico está em uso (perguntar antes de mexer)
- [x] Fuso da barbearia em telas, lembretes e WhatsApp
- [ ] Fuso nos e-mails (conferir)
- [x] Telefone: com e sem o 9 são o mesmo cliente; busca direta por variantes
- [ ] Telefones salvos convertidos para padrão único 55+DDD+número (mostrar contagem e duplicados antes)
- [ ] Índice de telefone para busca de cliente (conferir)
- [x] Permissões no banco (RLS), atualização na hora, tela clara para desvinculado
- [x] Recuperação de senha neutra, logo legível, metatags padronizadas

## Etapa 2 — Auditoria do dinheiro
- [x] Relatório entregue (14 itens)
- [x] Corrigidos: fiado com limite e só dono, fidelidade só no pagamento, comissão líquida, baixa de fiado registrada, estorno supervisionado, preço alterado exige permissão
- [ ] Validades/rollover (sem créditos com validade ainda)
- [ ] Caução (aguardando regras)
- [ ] Aging 30/60/90 do fiado

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
- [~] Textos padrão prontos, ainda não ligados ao motor
- [ ] Situações novas (atraso, elogio, objeto esquecido, eventos, terceiros)
- [ ] Novos avisos pelos canais gratuitos
- [ ] Zero configuração, seção "Conversa" com Avançado fechado
- [ ] FAQ que se preenche sozinho
- [ ] Cartões de decisão por push; resumo do dia

## Etapa 5 — Testes finais
- [ ] 21 testes + roteiro para celular
