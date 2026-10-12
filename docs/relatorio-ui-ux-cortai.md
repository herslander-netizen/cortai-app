# Evolução UI/UX do Cortaí

## Diagnóstico e prioridades

| Prioridade              | Evidência no código                                                                                                                                                                         | Ação                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Alta                    | `ListaAgenda` marcava o item `<li>` inteiro como botão, embora seus filhos incluíssem botões de ação. Isso criava controles interativos aninhados e deixava a semântica de teclado ambígua. | Corrigido com botão semântico para o resumo e ações como controles irmãos.                                                              |
| Média                   | Os campos do catálogo tinham 40 px e o botão de remover tinha 44 px, abaixo do alvo mínimo de 48 px especificado em `docs/contrato-de-design.md`.                                           | Ajustado para controles de ao menos 48 px e aplicado o token `field-control`.                                                           |
| Média                   | Compartilhar não fazia nada quando a API nativa não estava disponível, e falhas ao copiar não davam feedback.                                                                               | Compartilhar agora usa a cópia como alternativa e as falhas são comunicadas pela faixa de estado existente.                             |
| Média                   | O catálogo misturava botões nativos e estilos legados, e os erros/sugestões da configuração assistida não eram anunciados semanticamente.                                                   | Ações agora usam `Button`; remoção pede confirmação, a descrição tem rótulo e feedback usa `status`/`alert`.                            |
| Média                   | As sugestões rápidas ocupavam várias linhas no celular; o botão de salvar combinava a variante fantasma com um estilo de ação principal.                                                    | Sugestões agora formam uma faixa horizontal rolável no celular e o salvamento usa a variante principal compartilhada.                   |
| Alta                    | Na folha de agendamento manual, a ação de confirmar flutuava sobre a grade de horários e de pagamento durante a rolagem.                                                                  | A confirmação agora fica num rodapé próprio; o conteúdo rola acima dela, e o rodapé acompanha a abertura do teclado virtual.             |
| Média                   | No editor da página pública, o rótulo do link personalizado envolvia também um botão e opções de foto/cor não tinham nome ou estado anunciado adequadamente.                                | Rótulo agora aponta só para o campo; ação de foto tem nome acessível; cores expõem `aria-pressed` e controles principais atendem 48 px. |
| A verificar visualmente | A agenda tem linha do tempo, lista, foco mobile, navegação de datas, estados e ações próprias.                                                                                              | Mantidos. Esta execução não conseguiu fazer inspeção visual responsiva no navegador.                                                    |

## Telas examinadas

- Agenda operacional: `AgendaOperacional`, `AgendaTimeline`, `AgendaFocoMobile` e `ListaAgenda`.
- Editor da página pública: rota `/barbeiro/marca`, `SecaoTema` e `PreviaDaExperiencia`. Os seletores já expõem estado pressionado, e a prévia já alterna celular/computador.
- Catálogo: `EditorDeServicos`, incluindo serviços, preço, duração, categorias, equipe e recursos existentes de foto e sugestões. Capturas fornecidas pelo usuário mostraram as sugestões ocupando várias linhas e a lista rolável no celular.
- Agendamento público: `AgendamentoChat` e etapas de serviço, profissional e data. Os cartões exibem preço/duração e os dias sem opções são desabilitados.
- Agendamento manual: capturas fornecidas pelo usuário mostraram a ação fixa cobrindo opções de horário na folha de formulário. A área de conteúdo e a confirmação foram separadas em rolagem e rodapé.

No editor da página pública, os estados de salvamento, publicação e erro já usam uma faixa acessível, e o celular já recebe uma folha de prévia. Foram corrigidos o rótulo mal associado no endereço personalizado e os nomes/estados acessíveis dos controles de foto e cor. No fluxo público, revisão das escolhas, entradas de dados, horário e navegação por etapas já têm hierarquia e alvos de toque adequados; não alterei as regras nem esses elementos após a inspeção.

## Limitações da auditoria

Os arquivos `auditoria-visual-figaroo.md` e `docs/referencia-ux-figaroo-cortai.md` não existem neste checkout. A auditoria disponível em `docs/auditoria-2026-10-09.md` trata de segurança e não examinou as telas. Portanto, nenhuma conclusão visual foi atribuída ao Figaroo. A inspeção de código não substitui a validação visual nos tamanhos de 320, 360, 390, 430, 768, 1024 e 1440 px.

## Validação

- `tsc --noEmit`: passou.
- ESLint nos arquivos TypeScript alterados: passou.
- `git diff --check`: passou.
- Vitest com configuração temporária isolada e pool `vmThreads`: a suíte completa passou anteriormente em 27 arquivos e 156 testes; após as capturas, passaram os 4 testes focados do editor de serviços e o teste focado do rodapé do formulário. A configuração padrão segue bloqueada pela validação de caminho do plugin Vite do projeto.
- Instalação das dependências terminou com aviso de scripts `esbuild` ignorados pelo pnpm; dependências foram instaladas. Nenhum lockfile foi criado.

## Escopo

As mudanças são de interface e acessibilidade. Não alteram reservas, preços, regras de disponibilidade, persistência, contratos de API ou integrações.
