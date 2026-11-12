# Flow — Campanhas promocionais e cupons (paridade Figaroo)

## Referência e objetivo

A seção 9 de `docs/referencia-figaro/apk/7-modulos.md` descreve no Figaroo:
lista de campanhas (ativas, pausadas, arquivadas); criação por etapas, com duração;
ficha com cupom, regras, histórico de resgates; edição e arquivamento confirmado;
bloqueio de criação enquanto o onboarding não estiver completo.

No Flow já existem **Divulgar nas redes**, **Crescimento** e **Indicações**.
Nenhum deles equivale a um livro confiável de resgates ou desconto no caixa.
Não trocar a página de divulgação por um módulo paralelo.

## Fase A — implementação segura e independente

Arquivos: `src/lib/campanhas-regras.ts`, `src/lib/campanhas-regras.test.ts`.

- Código de cupom ASCII, de 4 a 20 caracteres, em maiúsculas após remover apenas espaços externos; não aceitar caracteres ambíguos.
- Duração com instantes UTC: início inclusivo e fim exclusivo. Não derivar janelas do relógio do celular.
- Campanha pode estar ativa, pausada ou arquivada; mesmo ativa pode estar programada ou encerrada pela data.
- Desconto percentual inteiro de 1% a 100% ou valor fixo inteiro em centavos, sempre limitado ao total original. Compra mínima, serviços elegíveis e limites global/por cliente.
- Sem cliente identificado, contagens inválidas, regra inconsistente ou situação não elegível: negar, nunca aprovar silenciosamente.
- O cálculo **não grava**, **não confirma pagamento**, **não reserva desconto** e **não registra resgate**. É puro e deve ser chamado pelo backend futuro somente com estado verificado.

## Fase B — persistência e resgate (não incluída)

**Dependências e segurança obrigatórias para implementar antes de liberar cupons:**

1. Reservar uma migração aditiva em `drizzle/migrations` após liberação da reserva de `0059+` no `DIARIO.md`. Nenhuma migração desta fase foi criada ou aplicada.
2. `campanhas`: chave primária, tenant_id, nome, código normalizado, benefício, mínimo, serviços elegíveis do próprio tenant, datas, limites, status, autor e trilha de criação. Unicidade `(tenant_id, codigo)`, inclusive entre campanhas arquivadas (não reutilizar cupom histórico).
3. `campanha_resgates`: tenant_id, campanha_id, cliente_id, comanda_id, desconto_centavos, identificador de operação idempotente e timestamp. Unicidade por comanda/operação. Preservar histórico: estorno é evento compensatório, nunca apagar lançamentos.
4. RPC transacional com bloqueio de campanha e verificação de tenant/cliente/comanda, permissões e limites **dentro da mesma transação**. Nunca ler um contador na tela e depois simplesmente inserir o resgate: duas requisições concorrentes ultrapassariam o teto.
5. Aplicar desconto **uma única vez**, por meio do motor oficial de comanda, e registrar o uso apenas quando a operação financeira do servidor for concluída. Não permitir que um cupom confirme Pix ou marque comanda paga.
6. RLS para todos os dados de campanha, com consulta por tenant e autorização por papel. Acesso anônimo não pode ler tabelas brutas; eventual consulta pública deve ser via rota/RPC de leitura limitada, sem vazar dados de clientes.
7. Testes SQL e de integração: dois tenants; mesmo código em tenants diferentes; limite sob concorrência; dois toques na confirmação; reenvio idempotente; cliente sem cadastro; campanha pausada no instante final; desconto maior que subtotal; reembolso; comanda não paga; alteração da campanha após uma compra.
8. Somente após testes locais isolados, autorização específica para banco de prévia, teste autenticado em 390/360 px e conferência dos valores do caixa, liberar ativação. Produção e cobranças continuam intocadas.

## Fase C — experiência visual e comunicação (parcial: simulador pronto)

**Implementado e isolado no código:** a rota interna `/barbeiro/campanhas` abre o editor em quatro etapas usando `TelaDeFormulario` e os primitivos do Flow. A consulta `getContextoDeCampanhas` exige autenticação, vínculo do negócio e permissão de edição; os serviços são filtrados por tenant. Rascunhos usam moeda BRL estrita e datas convertidas no fuso do estabelecimento; a revisão informa que não há publicação. Ao concluir, o usuário pode copiar somente um resumo textual. Não existe campanha salva, indicação no menu, venda ou resgate: não confundir simulação com funcionalidade ativa.

**Ainda faltam:**

- Lista de campanhas em cartões no padrão Figaroo/Flow, com estados **Programada, Ativa, Pausada, Encerrada, Arquivada**.
- Criar em etapas: **Detalhes → Benefício/regras → Duração → Revisar**, com uma ação principal, validação na etapa e confirmação antes de publicar.
- Ficha: cupom copiável, regras claras, períodos, total de resgates **reais** e comparação com a lista de comprovantes.
- Pausar, reativar e arquivar com confirmação, sem exclusão de dados.
- Divulgação usa o módulo existente; adicionar somente link/código rastreável e consentimento de marketing. Não enviar mensagens automáticas a clientes sem autorização/opt-in.
- Páginas operacionais só depois da integração com o backend; não criar botão que prometa resgate enquanto o ledger estiver ausente.

## Limites desta entrega

A Fase A e o editor de prévia são **base testável de regras e UX**, não um sistema de campanhas já utilizável.
Não foi alterada nenhuma tela, regra da Agenda, fluxo de comanda, perfil do cliente,
integração de WhatsApp, migração, banco real ou publicação principal.
As decisões finais de combinação com descontos já existentes, elegibilidade de pacotes e
momento contábil do resgate devem ser revisadas junto à função de fechamento de comanda.
