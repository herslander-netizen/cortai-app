# Contrato de design

## Regra de recuperação do Figaro (decisão do dono, 2026-10-18)

O APK `Figaroo.apk` enviado pelo dono é a referência autoritativa da experiência original. **A prioridade é preservar o Figaro no Flow, não reinterpretá-lo como inspiração genérica.** Em toda tela/fluxo já existente no Figaro, preservar a composição, hierarquia, espaçamento, forma e comportamento dos cards, navegação, estados, passos, gestos, transições e animações que forem verificáveis na referência.

- Mudança permitida na base recuperada: substituir nome/logomarca antigos pela marca Flow atual e adaptar a interface às funções novas solicitadas pelo dono.
- Não fazer redesign paralelo, não “modernizar” por gosto próprio, não misturar os estilos que foram criados depois e não retirar comportamento original apenas para simplificar o código.
- As telas atuais do Flow e os fluxos novos continuam ligados ao backend, permissões, regras de negócio e fontes de dados existentes. Recuperar o visual **não** significa restaurar código nativo do APK, trocar a arquitetura web ou substituir regras atuais por simulações.
- A implementação é incremental: mapear a tela/fluxo correspondente, adaptar componentes atuais, preservar comportamento e testes, validar em 390 px e 1280 px. Não afirmar paridade completa sem conferência visual e funcional.
- Quando o APK não provar uma interação (por exemplo, por falta de vídeo/captura desse estado), marcar como pendente de evidência em vez de inventar a mecânica.

- Cores: só tokens (ink, ink2, ink3, paper, mute, mute2, line, line2, gold, rosa, sage, brick, status-*). `gold` é nome legado do token de acento; na paleta atual representa coral, nunca dourado nem ciano. O marinho e o azul de ação seguem a paleta Figaro; o coral é o sinal de marca usado com parcimônia. A marca Flow trocou só o logo (dono, 29/10): cores e fontes continuam as de antes. Proibido hex solto e cores nativas do Tailwind (cyan-400, white, red-500...). Exceções: `lib/cor-marca.ts` (personalização do cliente), logos e o verde do WhatsApp.
- Botões: sempre Button de ui/button. variant="primary" na ação principal (no máximo uma por tela), "outline" na secundária, "ghost" na terciária, "destructive" ao apagar. Proibido <button> cru fora de ui/ e proibido className="btn-primary|btn-secondary|btn-tertiary" dentro de Button. Chip, aba e item clicável usam Button variant="ghost" com aria-pressed ou aria-selected.
- Botão de ícone sempre com aria-label.
- Campos: field-label + field-control (+ field-hint / field-error). Proibido copiar strings de classe de input.
- Ação destrutiva: AlertDialog. Proibido window.confirm, alert e prompt.
- Feedback: aviso.* e comDesfazer (lib/avisos). Não chamar toast direto.
- Folhas e modais: Sheet ou Dialog de ui/. Proibido criar overlay ou folha própria em CSS.
- Telas de gestão começam por Screen. Reusar os componentes existentes de carregando, vazio e erro; não criar variações.
- Carregamento: usar somente os formatos de `Esqueleto.tsx`, iguais ao conteúdo; sem texto visível, giro central ou retorno ao esqueleto durante atualização com dados já exibidos.
- Alvo de toque mínimo de 48px, foco visível e texto mínimo de 12px.
- CSS: não criar classe nova em styles.css para uma tela; usar Tailwind com tokens. Proibido !important, body:has(...) e redefinir tokens fora dos escopos que já existem (.chat-sistema, .agendamento-marca, .client-brand).
- Tamanho: rota ou componente com mais de 300 linhas deve ser dividido (visual em componentes, lógica em hook use*).
- Mudança visual não altera regra de negócio, e o contrário também. Validar sempre em 390px e 1280px.
- Não criar arquivo de plano em `docs/` para ajuste pequeno.
- Se faltar um componente para o que a tela precisa, pare e me avise; não improvise na tela.
