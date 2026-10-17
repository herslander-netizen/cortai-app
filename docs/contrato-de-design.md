# Contrato de design

- Cores: só tokens (ink, ink2, ink3, paper, mute, mute2, line, line2, gold, rosa, sage, brick, status-*). "gold" é o acento ciano/azul da marca; o nome é legado, não é dourado e não deve ser renomeado. Proibido hex e cores nativas do Tailwind (cyan-400, white, red-500...). Exceções: lib/cor-marca.ts (personalização do cliente), logos e o verde do WhatsApp.
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
