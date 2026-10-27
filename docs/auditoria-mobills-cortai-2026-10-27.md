# Auditoria Mobills → Cortaí — 27/10/2026

## Objetivo e método

Adaptar princípios úteis do Mobills para gestão de um estabelecimento, sem transformar o Cortaí em um organizador financeiro pessoal e sem duplicar módulos existentes.

A análise combinou:
- leitura estática dos nomes de tabelas/entidades presentes no APK Mobills enviado (incluindo `Despesa`, `Receita`, `DespesaFixa`, `ReceitaFixa`, `DespesaCartao`, `DespesaFixaCartao`, `Fatura`, `ControleRepeticaoDespesa`, `ControleRepeticaoReceita` e `OrcamentoPersonalizadoTipoDespesa`);
- conferência da documentação pública do Mobills sobre relatórios, categorias, planejamento e assistência por texto/áudio;
- inspeção das rotas e funções do Cortaí na branch `cloudflare-workers-migration-2026-10-13`.

O inventário estático não equivale a uma reprodução interativa de todas as telas do APK. Onde não há evidência suficiente, a implementação não presume comportamentos específicos.

## O que foi incorporado nesta etapa

### 1. Comparação financeira no período
- O painel financeiro mostra despesas e outras saídas registradas, além da variação percentual de receita e de saídas contra o período anterior.
- Dia compara com o dia anterior; semana compara os mesmos dias decorridos da semana anterior; mês compara o acumulado até o dia equivalente do mês anterior, respeitando meses mais curtos.
- Os intervalos seguem o fuso do estabelecimento e usam limite final exclusivo para evitar duplicar o instante de virada entre períodos.
- Um período anterior zerado não gera uma porcentagem inventada: a tela mostra “Sem base anterior”.

### 2. Categorias de despesa
- O registro de despesas do caixa passa a aceitar categorias existentes no domínio do negócio: aluguel, energia, água, internet/telefone, materiais, produtos/estoque, manutenção, comissões, taxas de cartão, marketing, impostos/taxas, limpeza e outros.
- O relatório agrupa as saídas pelas categorias já guardadas no campo `caixa_movimentos.categoria`; não foi criada uma segunda fonte de dados.
- Registros antigos continuam válidos e aparecem como despesas sem categoria ou outras saídas, quando utilizavam somente o tipo genérico.
- O painel apresenta as categorias de maior valor.
- As categorias são rótulos de classificação. Selecionar “taxas de cartão” não concilia a venda com o repasse da adquirente nem comprova que a taxa foi calculada corretamente.

### 3. Idade do fiado
- A lista do caixa mostra a idade de cada fiado e soma os saldos em faixas de 0–30, 31–60, 61–90 e 91+ dias.
- A idade é calculada no fuso do negócio, a partir da data de criação.
- **Idade não é atraso contratual.** A tabela de fiados atual não tem data de vencimento. O recurso não chama uma dívida de vencida nem calcula multa/juros.

### 4. Integridade e privacidade preservadas
- Todas as novas consultas financeiras continuam vinculadas ao tenant e à permissão `visualizar_financeiro`.
- Não foram criadas tabelas nem migrações nesta etapa.
- Não foram escritas informações em banco, nem alterados a Agenda, a branch `main`, o DNS ou o site principal.
- As taxas e os valores apresentados continuam limitados ao que está realmente registrado no Cortaí.

## Matriz de paridade e decisões

| Recurso identificado no Mobills | Situação no Cortaí | Decisão |
|---|---|---|
| Dashboard de receitas e despesas | O Cortaí já tinha painel básico de receitas e Caixa do dia. O painel agora também compara períodos e resume saídas. | Incorporado, reutilizando o financeiro atual. |
| Categorias personalizadas de despesas | O caixa guardava categoria genérica para saídas/despesas. | Incorporado com categorias próprias no campo existente e total por categoria. |
| Relatórios por período | Já existia seleção Hoje/Semana/Mês, mas sem comparação consistente. | Incorporado com intervalos equivalentes até hoje e fuso do negócio. |
| Contas e movimentações | O Cortaí já tem comandas, pagamentos, vendas, caixa e histórico de fiado. | Reutilizar essas fontes; não criar livro-caixa paralelo. |
| Fiado com idade | O Cortaí já registra saldo, pagamentos parciais e data de criação. | Incorporado por idade desde o lançamento. |
| Fiado com vencimento real | Não há vencimento individual no esquema atual de `fiados`. | Próxima etapa de dados: data de vencimento, política de prazo, compatibilidade com fiados antigos, filtros e avisos. |
| Receitas/despesas fixas e recorrentes | O APK contém entidades de recorrência; o Cortaí ainda não tem um módulo completo de contas futuras recorrentes. | P1: planejar uma entidade com periodicidade, próxima ocorrência, estado ativo/pausado e chave de idempotência; não simular recorrência com lançamentos repetidos. |
| Cartões, faturas e parcelas | O Cortaí registra pagamentos por cartão, mas a forma de pagamento não é um livro completo de faturas ou recebíveis do adquirente. | P1: desenhar repasses, parcelas, taxas, vencimentos e conciliação; não inferir taxa a partir do valor da venda. |
| Orçamento por categoria | Não foi confirmado um módulo de orçamento mensal de despesas no Cortaí. | P1: orçamento por tenant, categoria e período; progresso com base em despesas registradas e avisos configuráveis. |
| Objetivos financeiros | Há metas operacionais em partes do produto, mas isso não confirma um módulo persistente de metas financeiras. | P2: meta de receita, margem/resultado estimado e reserva, sempre distinguindo faturamento de lucro. |
| Assistente por texto/áudio | O Cortaí tem CortAI, mas não deve registrar finanças com base em texto livre sem confirmação. | P2: a IA prepara um lançamento com categoria, valor e data para revisão; gravar exige confirmação e validação de permissão. |
| Alertas de vencimento | O Cortaí tem canais de notificações, mas não há base completa de contas recorrentes com vencimentos. | Depende do módulo de contas a pagar/receber e das preferências de notificação. |
| Exportação/importação e comprovantes | Não foi validada paridade completa nesta análise. | P2: exportar registros já autorizados e permitir anexos sem expor comprovantes por URL pública. |

## Regras financeiras que devem permanecer

1. Receita registrada, pagamento confirmado, saldo de caixa e lucro são conceitos distintos.
2. Sangria é uma transferência física do caixa, não uma despesa operacional; não deve ser somada novamente às despesas.
3. Uma correção financeira futura precisa preservar o valor anterior, novo valor, ator, horário e justificativa; histórico de pagamento não pode ser apagado silenciosamente.
4. O total de saída por categoria só deve incluir lançamentos classificados como saída ou despesa e respeitar o estabelecimento.
5. Taxa de cartão exige o valor bruto da venda, taxa aplicada, líquido esperado, data prevista de repasse e valor efetivamente recebido. Um rótulo de categoria sozinho não fornece conciliação.
6. Relatórios devem ser abertos até os lançamentos de origem, para o usuário conferir como cada total foi composto.

## Direção visual

Não é necessário um tema financeiro separado. A área usa a identidade global já decidida para o Cortaí: estrutura, hierarquia, cartões e movimento inspirados no Figaro; azul para ações operacionais; marinho e superfícies neutras; coral como acento de marca, sem copiar paleta ou componentes proprietários do Mobills. A experiência deve ser pensada primeiro para 390 px e conferida em 360 px, em modo claro e escuro, usando os primitivos do projeto.

## Referências

- APK Mobills fornecido na conversa — leitura estática de nomes de entidades/strings.
- [Todas as funcionalidades — Central de Ajuda Mobills](https://mobills.zendesk.com/hc/pt-br/categories/360004156193-Todas-as-funcionalidades) — transações fixas/repetidas, anexos, contas, cartões, relatórios, planejamento e objetivos.
- [Tudo sobre o Mobills PRO](https://mobills.zendesk.com/hc/pt-br/articles/39727734628251-Tudo-sobre-o-Mobills-PRO) — lançamentos por texto/áudio, categorização, consultas e lembretes via assistente.
- [Como analisar despesas/receitas por gráficos e relatórios](https://mobills.zendesk.com/hc/pt-br/articles/360049912794-Como-analisar-minhas-despesas-receitas-por-Gr%C3%A1ficos-e-Relat%C3%B3rios) — gráficos por categoria e tendências por semana, mês e ano.
- Código do Cortaí nesta branch: `src/routes/barbeiro.financeiro.tsx`, `src/routes/barbeiro.caixa.tsx`, `src/lib/gestao.functions.ts`, `src/lib/financeiro.functions.ts`, `src/lib/financeiro-analise.ts`.

## Validação

Testes unitários para intervalos, porcentagens, faixas de fiado e agrupamento de categorias foram adicionados. Build, TypeScript, Vitest e conferência visual no dispositivo devem ser considerados pendentes até haver resultado explícito do CI e validação mobile; a implementação não deve ser declarada pronta para lançamento antes disso.
