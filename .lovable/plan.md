# Recibo da comanda (ticket) com código de localização — avaliação

Somente avaliação; nada será implementado nesta etapa.

## O que já existe
- **Comanda**: tabela `comandas` com `numero` sequencial por negócio, `status`, total, cliente, profissional e agendamento. Itens em `comanda_itens` com preços do catálogo.
- **Pagamento**: tabela `pagamentos` (forma, valor, `status`, confirmado_em/por, estornado_em), separada da comanda. Gravação só por RPC segura (`confirmar_pagamento_comanda_segura`, `estornar_pagamento_seguro`).
- **Pix hoje**: chave fixa do negócio (`configuracoes_financeiras.pix_chave/pix_tipo/pix_whatsapp`). Fluxo em `FechamentoComanda`: "Aguardando Pix" (status `aguardando_confirmacao_pix`) → mostra e copia a chave → profissional toca "Pix recebido" (confirmação manual). Não há Pix Copia e Cola nem QR gerado, e nenhuma confirmação automática pelo banco.
- **Compartilhar**: já existe texto de comprovante por WhatsApp (link `wa.me`) e, no estúdio de divulgação, desenho de imagem em canvas (`desenharArte`) + `canvasParaArquivo` + Web Share.
- **Caixa**: `getCaixa`, `getAguardandoPagamento` e `estornarPagamento` já listam e controlam pagamentos do dia.

## Proposta de UX
1. Ao concluir o pagamento (qualquer forma, com destaque no Pix) a etapa final mostra o **Recibo** em formato ticket: nome/logo do negócio, código, data e hora no fuso do negócio, itens, desconto, total, forma, selo de estado.
2. **Código legível** separado do status: formato `CT-7K4M-2Q` (sem letras ambíguas O/0/I/1), único por negócio. O número `#123` continua existindo.
3. **Busca**: campo "Buscar recibo" no Caixa (`/barbeiro/caixa`), aceitando código, `#número` ou nome do cliente; lista de cartões clicáveis.
4. **Detalhes**: folha (Sheet) com o ticket completo e ações: Compartilhar imagem, Copiar código, Estornar (com permissão, fluxo atual).
5. **Compartilhar**: gera imagem PNG do ticket (canvas, mesmo padrão do estúdio) e abre o compartilhamento do celular; sem suporte, baixa a imagem.
6. **Pix no ticket**: área "Pagar com Pix" só quando Pendente — chave (já existe) e espaço reservado para Copia e Cola/QR quando houver gerador.
7. **Estados** com ícone + texto + cor: Pendente, Pago, Cancelado (estornado). Status vem do pagamento; o código vem da comanda e nunca muda.

## Detalhes técnicos
- **Banco (aditivo)**: coluna `comandas.codigo text` única por `(tenant_id, codigo)`, gerada por gatilho na criação + preenchimento das comandas antigas. Sem alterar `numero` nem status.
- **Servidor**: em `financeiro.functions.ts`, `buscarComandas({ termo })` e `getReciboComanda({ comandaId })`, ambos com `requireSupabaseAuth` + permissão financeira existente, filtrando por negócio.
- **Estado do recibo** (função pura testável em `src/lib/recibo.ts`): deriva Pendente/Pago/Cancelado de `comandas.status` + `pagamentos.status/estornado_em`.
- **Componentes novos**: `ReciboTicket` (visual único, usado na tela e na imagem), `desenharRecibo` em canvas reaproveitando a base de `divulgacao/arte.ts`, `BuscaDeRecibos` no Caixa.
- **Afetados**: `FechamentoComanda.tsx` (etapa final mostra o ticket; o arquivo já tem 631 linhas, então o ticket entra como componente separado), `barbeiro.caixa.tsx`, `financeiro.functions.ts`.
- **Pix Copia e Cola (opcional, fase 2)**: gerar BR Code estático com a chave + valor + código (padrão EMV, função pura, sem integração bancária).

## Riscos
- **Duplicidade**: já há texto de comprovante e a arte do estúdio; o recibo deve virar a fonte única e substituir o texto atual, não coexistir.
- **Pix manual**: "Pago" no Pix significa "confirmado pelo profissional", não pelo banco. O ticket deve dizer "Pagamento registrado por <nome>", e Pix só vira automático com um provedor (ex.: Asaas) em fase futura.
- **Privacidade**: imagem compartilhada sem telefone do cliente, sem chave Pix após pago e só primeiro nome; busca restrita à equipe do próprio negócio com permissão financeira.
- **Imagem**: canvas em celulares antigos (fontes não carregadas, logo de outro domínio bloqueando exportação) — esperar fontes, usar logo do próprio armazenamento e cair para "Baixar"/texto se falhar.
- **Código**: risco de colisão mínimo com 8 caracteres; o banco garante unicidade e o gatilho tenta de novo.

## Pendência anterior
- E-mail na ficha do cliente segue aguardando, depois desta avaliação.
