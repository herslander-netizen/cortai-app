# Pesquisa e plano de melhoria do Caixa do Cortaí
**Data:** 26/10/2026 · **Área:** Caixa do dia, fechamento de comanda e financeiro.

## Sumário executivo

O Cortaí já possui base financeira integrada: comandas, pagamentos, movimentos append-only, sessão de caixa, estorno supervisionado, comissões, fiado, ganhos extras e resumo por forma de recebimento. A oportunidade maior não é reescrever o caixa, mas tornar a contagem física correta e a conferência mais transparente.

**Achado crítico confirmado no código:** o formulário pergunta “Valor contado ao fechar”, ou seja, dinheiro físico na gaveta; porém a rotina de fechamento somava todos os movimentos da sessão, inclusive Pix e cartão, ao calcular o saldo esperado. Isso mistura dinheiro físico com recebimentos digitais e pode produzir uma diferença falsa. O cálculo agora separa as formas de pagamento e mantém os movimentos antigos sem forma classificada como dinheiro quando forem saídas, para não esconder retiradas previamente lançadas.

**Melhoria nesta etapa:** registrar a forma de pagamento nas saídas, fazer sangria ser sempre dinheiro, mostrar o valor físico esperado enquanto o caixa está aberto e exibir a diferença do último fechamento do dia. Sem migração e sem gravação de dados no banco.

## 1. O que os concorrentes fazem

### Trinks
A documentação oficial diferencia **Controle de Caixa** (abertura e acompanhamento operacional) de **Financeiro–Caixa** (relatório histórico). Informa fundo inicial, recebimentos em dinheiro, troco, despesas pagas pelo caixa, sangrias, saldo físico, valor contado e diferença. As vendas que não foram pagas em dinheiro são discriminadas separadamente por forma de pagamento. Fontes: [Entendendo o controle de caixa](https://ajuda.trinks.com/entendendo-o-controle-de-caixa), [módulo financeiro](https://ajuda.trinks.com/como-utilizar-o-modulo-financeiro-da-trinks).

### Reservei
Promove abertura/fechamento, resumo de dinheiro/Pix/crédito/débito, cadastro da taxa de cartão e valor líquido previsto após a taxa, fechamento automático configurável, despesas categorizadas e fiado com vencimento/lembrete. Fonte: [Controle de caixa](https://reservei.app.br/controle-de-caixa).

### Barbeiro.app
A documentação é explícita: **somente dinheiro vai para a gaveta física**; Pix e cartão entram no faturamento, não no valor físico esperado. O resumo mostra fundo inicial, vendas em dinheiro, movimentos e total físico esperado; separa “a receber” do dinheiro disponível e destaca diferença na conferência. Também oferece histórico de comandas e correção rastreada de pagamento quando a forma foi registrada errada. Fontes: [Abrir e fechar caixa](https://docs.barbeiro.app/business-admin/cash-register/open-cash-register), [histórico de comandas](https://docs.barbeiro.app/business-admin/cash-register/comandas-history), [corrigir pagamento](https://docs.barbeiro.app/business-admin/cash-register/correct-payment).

### AppBarber / AppBeleza
Permite informar forma de pagamento para entradas/saídas, distinguir suprimento de receita, registrar sangria e carregar troco para o caixa seguinte. As contas a receber são baixadas quando o dinheiro efetivamente chega, para evitar duplicidade entre financeiro e caixa. Fontes: [Como funciona o caixa](https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360002607332-Como-funciona-o-Caixa), [contas a receber](https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360025674671-Como-funcionam-as-Contas-a-Receber).

### Referência de gestão financeira
O Sebrae descreve o fluxo de caixa como registro de todos os recebimentos, pagamentos e despesas; ele ajuda a entender o saldo disponível e planejar capital de giro. Isso é complementar à contagem física da gaveta — não deve ser confundido com ela. Fonte: [Fluxo de caixa para MEI](https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/fluxo-de-caixa-para-mei-aprenda-a-controlar-as-financas%2C3930103bc7d1b610VgnVCM1000004c00210aRCRD).

## 2. Auditoria do Cortaí

| Área | Estado encontrado | Recomendação |
|---|---|---|
| Comanda/pagamento/caixa | **Base sólida existente**, integrada e com registros financeiros append-only | Reutilizar; não criar uma segunda fonte de verdade |
| Abertura/saldo inicial | Existe sessão aberta por negócio e saldo inicial | Deixar clara a diferença entre movimento líquido e dinheiro físico |
| Entradas por Pix/dinheiro/cartão | Aparecem no resumo | Não somar recebimentos digitais à contagem da gaveta |
| Saídas/despesas/sangria | Existiam, mas o formulário não pedia forma de pagamento nem persistia esse campo | **Corrigido nesta etapa**; sangria fica restrita a dinheiro |
| Diferença do fechamento | Calculada e armazenada, porém com cálculo incluindo Pix/cartão e sem resumo claro para o usuário | **Corrigido nesta etapa**; comparar valor contado com dinheiro esperado |
| Valor físico esperado durante o dia | Não aparecia como total próprio | **Adicionado nesta etapa** |
| Último fechamento | Não era exibido após fechar/recarregar a tela | **Adicionado nesta etapa** para o último fechamento do dia; valor esperado é recalculado a partir dos movimentos da sessão |
| Fiado | Lista pendências e quita por função transacional | Acrescentar idade da dívida/vencimento e histórico de recebimentos em etapa futura |
| Taxa de cartão | Não vi configuração de adquirente/taxa no módulo do caixa consultado | Adicionar apenas quando houver definição da taxa e fonte de liquidação; separar receita bruta, custo de adquirência e líquido esperado |
| Categorias de despesas | A descrição e tipo existem; a categoria é genérica | Evoluir para categorias úteis sem criar formulários longos no celular |
| Histórico por período | Caixa do dia lista movimentos de hoje; resumo financeiro tem Hoje/Semana/Mês | Criar histórico de sessões fechadas e relatório por período após a correção operacional |
| Corrigir forma de pagamento | Não encontrei fluxo de correção auditada na rota atual | Planejar ação que gere lançamentos corretivos, nunca edite/apague o histórico financeiro |
| Fechamento automático / lembretes | Não confirmado no fluxo atual do caixa | Deixar para depois do histórico e regras de expediente; fechamento automático não deve encobrir diferença |
| Suprimento/transferência entre gaveta e banco | Não há distinção explícita clara no formulário atual | Definir uma transferência interna que não conte como receita nem despesa antes de implementar |

## 3. O que foi implementado nesta etapa

1. **Cálculo físico correto:** saldo inicial + entradas em dinheiro − saídas em dinheiro. Pix e cartão ficam fora da gaveta, mas continuam no resumo financeiro do dia.
2. **Compatibilidade histórica:** saídas antigas sem forma de pagamento são consideradas dinheiro para que lançamentos existentes não desapareçam silenciosamente do cálculo.
3. **Forma de pagamento das saídas:** a tela passa a registrar dinheiro/Pix/cartão; sangria só pode ser em dinheiro também no servidor.
4. **Conferência durante o dia:** a tela mostra o saldo físico esperado com o caixa aberto.
5. **Fechamento recuperável:** após fechar ou recarregar, a tela mostra o último fechamento de hoje com valor esperado, valor contado e sobra/falta. A diferença é recalculada a partir dos movimentos existentes; nenhum histórico é reescrito.

Sem alteração de esquema: a coluna `forma_pagamento` já existe em `caixa_movimentos`. Não há migração nesta entrega.

## 4. Roadmap recomendado

### P1 — Histórico e revisão de sessões
Filtros por data/período, detalhe de cada fechamento, autor, saldo inicial, total esperado, contado e diferença. Sessões fechadas devem ser somente leitura, sem perder os vínculos de cada lançamento.

### P1 — Categorias de despesa
Categorias simples como material/estoque, aluguel, energia/água, manutenção, taxas e outras; permitir “outra” com descrição. Evitar uma lista enorme obrigatória.

### P1 — A receber / fiado
Mostrar dias em aberto, saldo original e saldo restante, recebimentos parciais, vencimento configurável e situação. O recebimento deve continuar lançando caixa apenas na data em que o dinheiro realmente chega, sem contar o fiado como entrada recebida.

### P2 — Taxas de adquirente e conciliação
Configurar adquirente e taxa por débito/crédito/parcelas; mostrar valor bruto, taxa e líquido estimado. A conciliação real só deve marcar valores como confirmados com fonte confiável (extrato/API/webhook da instituição), nunca a partir de um recibo ou clique no front-end.

### P2 — Corrigir pagamento com auditoria
Permitir corrigir dinheiro/Pix/cartão errado apenas por ação autorizada, com motivo obrigatório, referência ao lançamento anterior e lançamentos compensatórios. Nunca alterar ou apagar a linha original.

### P2 — Transferência interna e suprimento
Distinguir uma entrada de troco, uma sangria e uma despesa verdadeira. Transferência de gaveta para conta bancária não é receita nem despesa; deve mover saldos sem inflar faturamento.

### P3 — Fechamento automático e alertas
Só depois de histórico, estados e exceções confiáveis. Alertar caixa aberto no dia seguinte, comandas aguardando pagamento e diferenças acima de um limite configurado; automação nunca deve encobrir diferença ou fechar uma sessão enquanto há ações pendentes.

## 5. Regras financeiras obrigatórias

- **Gaveta física ≠ faturamento:** dinheiro contado inclui só saldo inicial e movimentos físicos; Pix/cartão ficam nos seus próprios totais.
- **Fiado ≠ recebimento:** a venda pode existir no faturamento, mas o dinheiro só entra no caixa quando for recebido.
- **Sangria ≠ despesa:** uma é retirada física; a outra é um pagamento classificado pelo motivo e forma.
- **Taxa do cartão ≠ redução do preço vendido:** manter venda bruta, custo da taxa e repasse líquido em campos/indicadores separados.
- **Histórico imutável:** estorno/ajuste são novos lançamentos com motivo e autor.
- **Sem dupla contagem:** recebimento de fiado, pacotes, créditos e pagamentos online deve entrar no caixa uma única vez no momento correto.
- **Isolamento e acesso:** respeitar tenant, permissão de recebimento/estorno e autoria; não expor dados financeiros de outro negócio.
- **Datas:** usar o fuso do estabelecimento, e não o relógio do navegador, para determinar o dia do caixa.

## Fontes públicas consultadas
- Trinks: https://ajuda.trinks.com/entendendo-o-controle-de-caixa · https://ajuda.trinks.com/como-utilizar-o-modulo-financeiro-da-trinks
- Reservei: https://reservei.app.br/controle-de-caixa
- Barbeiro.app: https://docs.barbeiro.app/business-admin/cash-register/open-cash-register · https://docs.barbeiro.app/business-admin/cash-register/comandas-history · https://docs.barbeiro.app/business-admin/cash-register/correct-payment
- AppBarber/AppBeleza: https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360002607332-Como-funciona-o-Caixa · https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360025674671-Como-funcionam-as-Contas-a-Receber
- Sebrae: https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/fluxo-de-caixa-para-mei-aprenda-a-controlar-as-financas%2C3930103bc7d1b610VgnVCM1000004c00210aRCRD

## Arquivos do Cortaí inspecionados
`src/routes/barbeiro.caixa.tsx`, `src/lib/financeiro.functions.ts`, `src/components/financeiro/FechamentoComanda.tsx`, `src/components/financeiro/RegistrarGanhoExtra.tsx`, `src/components/comanda/AGENTS.md`, `supabase/migrations/20260920043308_e498f04e-cb4a-4f1c-a93c-c6f5340e3f50.sql` e migrações de estorno/controle financeiro.
