# Auditoria visual global — Fígaro → Cortaí

**Data:** 27/10/2026  
**Referência autoritativa:** APK Fígaro já analisado e especificações em docs/referencia-figaro/apk/.  
**Objetivo do dono:** nenhuma tela interna deve continuar visualmente herdando a antiga aplicação web do Cortaí.

## Princípio de implementação

O APK define a composição e a hierarquia, não só a paleta. A marca Cortaí, os dados, permissões, regras de negócio, integrações e ações reais continuam do Cortaí. A aplicação visual é mobile-first, validada primeiro em 390 px e conferida em 360 px; desktop é adaptação. Não se aplica um tema artificial às páginas públicas com personalização ativa.

## Problemas concretos identificados nesta tranche

1. **Moldura interna de página:** Screen colocava a ação de voltar e o título no mesmo alinhamento, desenhava um divisor inferior e usava o fundo antigo no cabeçalho. Agora separa a barra de ação de 44 dp da hierarquia de título/subtítulo, usa o token de fundo Figaro e não desenha o divisor legado.
2. **Rodapé institucional automático:** o componente inseria a assinatura Alvo Digital/Copyright em todas as telas internas, inclusive no celular. Isso fazia as áreas operacionais parecerem páginas web; passou a ser opt-in explícito, apenas em telas largas.
3. **Estado vazio:** EmptyState era uma faixa com bordas horizontais. Agora é uma superfície arredondada e neutra do padrão Figaro.
4. **Profissionais:** os registros eram linhas separadas por borda e fundo antigo, com botão btn-tertiary artesanal. Passaram a cartões oficiais Card, com espaço de 8 dp e ação usando o primitivo Button.
5. **Serviços:** o intervalo entre cartões foi reduzido para o espaço de 8 dp do padrão de lista e o ícone deixou de usar o acento coral como cor operacional; agora usa os tokens azuis do Figaro.

## Regra para todas as páginas

- Toda rota interna será comparada ao módulo equivalente descrito em docs/referencia-figaro/apk/2–11.
- Hierarquia padrão: barra superior com ação redonda; título e texto auxiliar abaixo; grupos de cartões sem divisórias decorativas; estados vazios/erro/carregamento explícitos; ação principal claramente reconhecível.
- Cada controle usa o primitivo oficial correspondente. Proibido copiar classes antigas como btn-tertiary, rounded-xl border border-line, faixas border-y ou rodapés comerciais automáticos.
- As animações seguem src/lib/movimento-figaro.ts e src/lib/motion.ts, respeitando redução de movimento.
- A Agenda fica fora desta mudança global por decisão explícita do dono; mudanças visuais nela exigem pedido específico. A página pública do negócio mantém os temas escolhidos pelo estabelecimento.

## Limite honesto do estado atual

Esta entrega corrige a base compartilhada e exemplos concretos de duas áreas; **não declara concluída a auditoria de todas as rotas**. A lista de módulos restantes deve ser verificada e corrigida em lotes, sem mexer em telas/arquivos com reserva ativa. O teste de componente protege a hierarquia da moldura, o comportamento do rodapé e o estado vazio. A fidelidade final ainda precisa ser conferida na prévia em celular, modo claro/escuro e redução de movimento.
