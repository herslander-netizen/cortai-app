# Administração enxuta e apresentação interna do Cortaí

## Objetivo

Simplificar o que dono e equipe veem no uso diário, sem remover recursos, rotas, permissões ou dados. Criar também uma experiência interna de apresentação, protegida e separada da Home pública.

## Auditoria aplicada

- A navegação operacional está duplicada entre o menu da logo e a tela **Mais**, com nomes e agrupamentos diferentes.
- Itens frequentes e configurações permanentes estão misturados com recursos comerciais, ajuda, preferências e áreas raras.
- A administração da plataforma já separa visão geral, negócios e monetização; controles de conteúdo, aparência, planos e perfil podem continuar preservados em **Sistema**, sem destaque no dia a dia.
- A rota pública `/apresentacao` já é a Home institucional e será preservada sem alterações de finalidade.

## Implementação

### 1. Navegação e configurações operacionais

- Usar uma única fonte de agrupamento para o menu da logo e a tela **Mais**.
- Organizar apenas os itens permitidos ao usuário nos grupos:
  - **Negócio:** dados, localização, marca e página pública.
  - **Agenda:** horários, serviços e fila.
  - **Atendimento:** clientes, atendimentos, avaliações e fidelidade quando disponíveis.
  - **Equipe:** profissionais, equipe e permissões.
  - **Financeiro:** caixa, relatórios, comissões, produtos e estoque conforme permissões.
  - **Secretária e link:** Secretária Cortaí, página pública e recursos de relacionamento existentes.
  - **Sistema:** conta, plano, preferências, ajuda e opções raras.
- Remover da navegação visível duplicações como Agenda + Novo agendamento, Equipe + Permissões e Página pública + Marca quando levam ao mesmo fluxo; manter todas as rotas acessíveis internamente.
- Preservar filtros de permissão, plano, tenant e segmentação existentes.

### 2. Apresentação interna protegida

- Criar `/admin/apresentacao`, protegida pelo acesso administrativo já existente e ausente de todos os menus normais.
- Não alterar `/apresentacao`, que continua sendo a página institucional pública.
- Construir uma experiência de apresentação em tela cheia com sete cenas curtas: Cortaí, Agenda, Modo Foco, Clientes, Caixa e Comanda, Secretária Cortaí, Automações/CortAI e convite final para testar.
- Reutilizar logo oficial, Manrope, tokens marinho/royal/ciano/rosa e imagens reais já existentes. Não usar métricas, depoimentos ou promessas inventadas.
- Usar composições visuais que representem o produto sem incorporar as telas operacionais ativas ou criar dados paralelos.

### 3. Navegação e saída

- Mostrar **Sair da apresentação** em todas as cenas.
- Ao abrir, preservar a página administrativa anterior; ao sair, retornar exatamente a ela, com fallback seguro para `/admin`.
- Suportar botão Voltar do navegador, setas do teclado e gesto horizontal no celular.
- Exibir progresso discreto e URL da cena atual para manter recarregamento e compartilhamento interno coerentes.

## Detalhes técnicos

- Reaproveitar a guarda `exigirPapel("admin")`; nenhuma alteração de banco ou migração.
- Centralizar a taxonomia da navegação em `src/lib/navegacao-barbeiro.ts` e consumi-la nos dois menus existentes.
- Criar componentes próprios apenas para a experiência de apresentação; não duplicar lógica de Agenda, clientes ou financeiro.
- Definir estilos e cores somente com tokens semânticos em `src/styles.css`.
- Manter metadados `noindex, nofollow` na apresentação interna.

## Validação

- Conferir visualmente em 390px e 1280px, incluindo saída, voltar, teclado e swipe.
- Validar permissões e ausência da apresentação nos menus normais.
- Rodar TypeScript, lint dirigido, testes relevantes e build.
- Não publicar.