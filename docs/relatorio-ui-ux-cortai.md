# Evolução UI/UX do Cortaí

## Diagnóstico e prioridades

| Prioridade | Evidência no código | Ação |
| --- | --- | --- |
| Alta | `ListaAgenda` marcava o item `<li>` inteiro como botão, embora seus filhos incluíssem botões de ação. Isso criava controles interativos aninhados e deixava a semântica de teclado ambígua. | Corrigido com botão semântico para o resumo e ações como controles irmãos. |
| Média | Os campos do catálogo tinham 40 px e o botão de remover tinha 44 px, abaixo do alvo mínimo de 48 px especificado em `docs/contrato-de-design.md`. | Ajustado para controles de ao menos 48 px e aplicado o token `field-control`. |
| Média | Compartilhar não fazia nada quando a API nativa não estava disponível, e falhas ao copiar não davam feedback. | Compartilhar agora usa a cópia como alternativa e as falhas são comunicadas pela faixa de estado existente. |
| A verificar visualmente | A agenda tem linha do tempo, lista, foco mobile, navegação de datas, estados e ações próprias. | Mantidos. Esta execução não conseguiu fazer inspeção visual responsiva no navegador. |

## Telas examinadas

- Agenda operacional: `AgendaOperacional`, `AgendaTimeline`, `AgendaFocoMobile` e `ListaAgenda`.
- Editor da página pública: rota `/barbeiro/marca`, `SecaoTema` e `PreviaDaExperiencia`. Os seletores já expõem estado pressionado, e a prévia já alterna celular/computador.
- Catálogo: `EditorDeServicos`, incluindo serviços, preço, duração, categorias, equipe e recursos existentes de foto e sugestões.
- Agendamento público: `AgendamentoChat` e etapas de serviço, profissional e data. Os cartões exibem preço/duração e os dias sem opções são desabilitados.

No editor da página pública, os estados de salvamento, publicação e erro já usam uma faixa acessível, e o celular já recebe uma folha de prévia. No agendamento, revisão das escolhas, entradas de dados, horário e botões já têm hierarquia e alvos de toque adequados; não alterei esses elementos após a inspeção.

## Limitações da auditoria

Os arquivos `auditoria-visual-figaroo.md` e `docs/referencia-ux-figaroo-cortai.md` não existem neste checkout. A auditoria disponível em `docs/auditoria-2026-10-09.md` trata de segurança e não examinou as telas. Portanto, nenhuma conclusão visual foi atribuída ao Figaroo. A inspeção de código não substitui a validação visual nos tamanhos de 320, 360, 390, 430, 768, 1024 e 1440 px.

## Validação

- `tsc --noEmit`: passou.
- ESLint nos quatro arquivos TypeScript alterados: passou.
- `git diff --check`: passou.
- Vitest não iniciou: o plugin Vite do projeto rejeitou o caminho absoluto de `src/routes` durante a validação de configuração. Os testes não foram executados.
- Instalação das dependências terminou com aviso de scripts `esbuild` ignorados pelo pnpm; dependências foram instaladas. Nenhum lockfile foi criado.

## Escopo

As mudanças são de interface e acessibilidade. Não alteram reservas, preços, regras de disponibilidade, persistência, contratos de API ou integrações.
