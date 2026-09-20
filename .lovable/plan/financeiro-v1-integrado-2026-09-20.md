# Financeiro V1 integrado

## Resultado

Transformar a comanda na origem única do fechamento: o barbeiro inicia pelo atendimento, ajusta serviços e produtos, recebe, confirma e termina sem abrir outra área. Caixa, comissão e fiado serão derivados dessa mesma operação, preservando o histórico.

## O que já existe e será reaproveitado

- Agenda, clientes, profissionais, serviços e status de atendimento.
- Produtos, estoque e baixa de quantidade.
- Vendas e itens existentes, preservados para compatibilidade e histórico.
- Carteira/movimentos de fiado, permissões por papel e auditoria da barbearia.
- Telas atuais de Início, Agenda, Produtos, Financeiro e Caixa; Caixa hoje não possui operação própria.

## Implementação

### 1. Fonte financeira única

- Criar comandas ligadas ao tenant, agendamento, cliente e profissional, com número curto sequencial por barbearia e estados: aberta, em atendimento, aguardando pagamento, aguardando confirmação Pix, paga, fiado, cancelada e estornada.
- Criar itens imutáveis após pagamento, cada um ligado ao serviço ou produto original e contendo quantidade, preço praticado, percentual e valor de comissão.
- Criar pagamentos, lançamentos de caixa, comissões, dívidas de fiado, sessões de caixa e pagamentos de comissão.
- Manter registros financeiros append-only: correções serão novos registros de estorno ou ajuste com autor, motivo, data e referência ao original.
- Preservar `vendas` e `venda_itens`; novas vendas do atendimento passam pela comanda e os relatórios deixam de somar fontes paralelas.

### 2. Regras e segurança

- Criar configuração geral de comissão por barbearia, inicialmente 50% para serviços e 10% para produtos, com substituição opcional em cada serviço/produto.
- Calcular comissão item a item sobre o valor do item após rateio do desconto, nunca sobre o total global.
- Reutilizar permissões de atendimento, venda, pagamento e leitura financeira; adicionar apenas permissões específicas para desconto, caixa, estorno, configuração/pagamento de comissão e visão de todas as comissões.
- Barbeiro poderá ver apenas sua comissão quando não tiver permissão de visão geral.
- Aplicar isolamento por barbearia, validação de permissão no servidor e no banco, RLS, grants e auditoria para toda ação sensível.
- Fazer fechamento, baixa de estoque, pagamento, caixa, comissão, fiado e conclusão do atendimento em transações idempotentes no banco.

### 3. Fechamento mobile

- Substituir “Finalizar atendimento” por uma experiência única de fechamento, acessível também pelo item da Agenda.
- Abrir a comanda já preenchida com cliente, profissional e serviço agendado.
- Permitir adicionar/remover serviços e produtos, mudar quantidade/preço autorizado e aplicar desconto autorizado.
- Mostrar subtotal, desconto, total e comissão discriminada por item.
- Oferecer Pix, Dinheiro, Cartão e Fiado em controles grandes e claros.
- Em Pix, exibir somente a chave manual cadastrada, copiar chave e abrir o WhatsApp configurado com mensagem contextual; sem QR, banco, gateway ou confirmação automática.
- Pix fica aguardando confirmação até ação explícita; dinheiro/cartão confirmam dentro do mesmo fechamento; fiado cria dívida sem entrada no caixa.

### 4. Configurações financeiras

- Adicionar configuração de Pix: ativação, chave, tipo e WhatsApp de comprovantes.
- Adicionar percentuais gerais de comissão e substituições nos cadastros de serviço/produto.
- Exibir dependências honestas: Pix indisponível sem ativação/chave; desconto e regras avançadas somente para quem tiver permissão.

### 5. Caixa e rastreabilidade

- Implementar Caixa do dia com abertura, saldo inicial, entradas, saídas, despesas, sangrias, totais por forma, bruto, líquido e fiado pendente.
- Cada linha mostrará valor, forma, cliente, itens, profissional, data/hora e número da comanda.
- Detalhe da movimentação abrirá a origem completa e seus vínculos; nenhuma movimentação poderá ser apagada.
- Fechamento de caixa registrará valores informados, diferenças, responsável e horário sem alterar lançamentos anteriores.

### 6. Comissões e fiado

- Criar Financeiro → Comissões com filtros por hoje, semana, mês, período, profissional e status.
- Consolidar atendimentos, serviços, produtos, comissão gerada, paga e pendente por profissional.
- Registrar pagamento de comissão sem apagar o lançamento original.
- Mostrar fiados pendentes; ao quitar, criar pagamento e entrada de caixa vinculados à dívida e comanda originais.

### 7. Compatibilidade

- Atualizar Início e Financeiro para ler a nova fonte única sem contar duas vezes os dados antigos.
- Manter venda avulsa existente funcionando; quando não houver atendimento, ela abrirá/fechará uma comanda avulsa por trás da mesma operação.
- Não alterar WhatsApp, CortAI, autenticação, loja pública, PWA ou outras áreas sem relação direta.

## Validação

- Testar agendamento → atendimento → comanda → pagamento → caixa → comissão.
- Validar Corte R$ 40 com 50% + Pomada R$ 35 com 10% = subtotal R$ 75 e comissão R$ 23,50.
- Validar Pix manual, copiar chave, link de WhatsApp, espera e confirmação.
- Validar fiado sem entrada, quitação posterior com entrada e vínculo original.
- Validar desconto permitido/bloqueado, estoque concorrente, duplo clique/idempotência, estorno, abertura/fechamento e visibilidade por papel.
- Executar testes focados, typecheck, build e verificação visual em celular e desktop.

## Fora desta versão

QR Code Pix, API bancária, gateway, webhook financeiro, conciliação automática, emissão fiscal, contabilidade e redesign geral.