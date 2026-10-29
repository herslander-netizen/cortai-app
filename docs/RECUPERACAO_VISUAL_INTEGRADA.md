# Recuperação visual integrada — Flow

## Objetivo
Usar a versão anterior do Flow como referência de estrutura e comportamento para cartões, telas, menus, gavetas e agenda, integrando os recursos atuais sem misturar padrões visuais.

## Regras obrigatórias
- Preservar a identidade visual oficial atual: logotipo, tokens de cor, tipografia e linguagem da marca.
- Recuperar da versão de referência a composição e hierarquia dos cartões e páginas, os padrões de navegação e a interação de abrir/expandir/arrastar/fechar.
- Manter os recursos atuais, os dados, autenticação, permissões, integrações e regras de negócio.
- Não substituir telas inteiras sem mapear dependências e estados atuais.
- Não criar componentes paralelos quando já existir um componente oficial reutilizável.
- Usar tokens existentes em `src/lib/motion.ts`; evitar transições CSS e Framer Motion concorrentes no mesmo elemento.
- Em gestos da agenda, manter o movimento diretamente ligado ao dedo e evitar atualizações React a cada quadro.
- Respeitar `prefers-reduced-motion`.
- Cumprir `docs/contrato-de-design.md`: somente tokens de cor, Button/Sheet/Dialog/Screen existentes, alvos de toque mínimos de 48px e validação em 390px e 1280px.

## Sequência de execução
1. Comparar os componentes da versão antiga com `AgendaOperacional`, `AgendaTimeline`, `SemanaDoTopo`, `PreviaDiaVizinho`, `ManagementDrawer` e os componentes oficiais de cartão, folha e menu.
2. Recuperar a estrutura visual antiga por componente, adaptando os dados e ações atuais em vez de remover funcionalidades.
3. Unificar estilos duplicados e resolver conflitos de animação no mesmo elemento.
4. Testar troca rápida de dia, rolagem vertical, arrasto horizontal, arrasto de cartão, expansão e fechamento de gavetas e estado após atualização.
5. Rodar testes, TypeScript, lint e build; corrigir falhas antes de aprovar.

## Escopo e segurança
- Trabalhar somente na branch `cloudflare-workers-migration-2026-10-13`.
- Não alterar `main`, não publicar em produção e não executar migrações de banco para mudanças visuais.
- Não declarar a recuperação completa até comparar as telas e concluir validação visual e funcional.

## Primeiro ajuste aplicado
Os tokens de duração de transições padrão foram suavizados para dar mais tempo de percepção aos movimentos de página e cartões. Isso é somente a primeira etapa; não substitui a recuperação visual dos componentes.
