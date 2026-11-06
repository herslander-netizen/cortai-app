# Auditoria UX — páginas externas (cliente e configuração) — 06/11/2026

Pedido do dono: "melhorar o fluxo de configurações das páginas externas, tanto para os clientes atendidos quanto para o
estabelecimento que configura". Olhar de UX/UI sênior, com capturas da prévia (`/teste01`, `/bella-rosa-demo`,
`/agendar/teste01`) a 390 px e leitura do código do editor.

**Limite desta auditoria:** o editor do negócio foi auditado **pelo código**, sem login (não há conta de teste com senha
disponível nesta sessão), e a página pública e o agendamento pelas capturas da prévia publicada. Itens marcados
*hipótese* precisam ser confirmados na tela.

## 1. Corrigido nesta entrega

| # | Onde | Problema | Correção |
|---|---|---|---|
| C1 | Agendamento público (`agendar.$slug.tsx`), prévia do editor (`PreviaDireta.tsx`) | **Tesoura em todos os serviços**, inclusive em negócio de estética (regra: sem símbolo de segmento) | Ícone neutro `HandHelping` |
| C2 | Área do cliente (`app.tsx`) | Aba "Início" com tesoura | Ícone `House` |
| C3 | Status do cliente (`StatusAgendamento.tsx`) | "Na cadeira" com tesoura (termo de segmento para o cliente final) | "Em atendimento" com ícone neutro |
| C4 | Página pública, modelo básico (`PaginaPublica.tsx`) | Serviço sem ação: para agendar aquele serviço o cliente precisava subir até o botão e escolher de novo | O cartão inteiro leva ao agendamento **com o serviço já escolhido** (`?servico=`), com seta e rótulo acessível; sem agenda online continua só informativo. Igual ao que os modelos Site completo e Raízes já faziam |
| B1 | Personalizar Página (`barbeiro.marca.index.tsx`) | Cartão "Layout e tema" com branco e cores soltas; **o nome do tema usava texto claro sobre fundo branco e sumia no tema escuro** | Só tokens (`--figaro-surface-container-low`, `on-surface`, `on-surface-variant`, `outline-variant`) |
| B2 | Personalizar Página | "Publicar" trocava o texto por "Publicando…" (contrário ao padrão do botão) | `loading` do `Button`, texto fixo |
| B3 | Personalizar Página | Título "Personalizar página" e "Personalizar Página" misturados | Um título só |

Guardas: `src/components/marca/paginas-externas.test.ts`.

## 2. Próxima rodada (priorizado por impacto)

### Cliente
1. **Agendamento em uma tela de 1.050 linhas** (`agendar.$slug.tsx`). Dividir em etapas visuais (serviço → profissional →
   dia e horário → dados → confirmação) com componentes e um hook `useAgendamentoPublico`; hoje qualquer ajuste visual é
   arriscado. Sem mudar regra: a validação continua no servidor.
2. **Etapa visível**: a referência mostra o passo a passo (dia → horário → profissional → dados → confirmado). O agendamento
   do Flow mostra só a lista de serviços e um botão desligado "Escolha um serviço"; sugerir indicador de etapa e resumo fixo
   no rodapé ("Sex, 14/11 · 09:15 com Ana") como na entrada nova.
3. **Capa vazia parece cinza chapado** na página pública (Teste01 sem capa). O código já usa a capa neutra
   (`flow-capa-neutra.png`), mas com o véu do tema claro ela vira um cinza sem vida. Proposta: usar as capas da marca de
   `public/marca/flow/capas/` (escuras primeiro), como pede o checklist, e avisar o dono no editor que falta capa.
4. **Rodapé "© 2026 Herslander"** na página pública (*hipótese*: vem de configuração do admin, não achei no código):
   conferir se deveria ser o nome do negócio.
5. **Tela de confirmação**: terminar com o mesmo "Agendamento confirmado" de tela cheia da entrada (check grande, resumo,
   "Adicionar à agenda" e "Voltar à página").

### Negócio (configuração)
6. **Ações importantes escondidas**: "Editar Link" só existe no menu ⋮ e abre um acordeão "Outras configurações" no fim da
   tela; "Página fora do ar" pede para usar o ⋮. Proposta: um cartão "Sua página" no topo (link, status online, copiar,
   QR, compartilhar), no modelo `FolhaPadrao`, e o ⋮ só com "Colocar offline".
7. **Barra fixa com quatro ações** (Ver prévia, Descartar, Salvar rascunho, Publicar). Proposta: "Publicar" como pílula
   única; "Ver prévia" como ícone no topo; "Salvar rascunho" automático (o rascunho já existe); "Descartar" no ⋮.
8. **Checklist de página pronta**: `LacunasDaPagina` já lista o que falta; transformar em progresso ("3 de 5: falta capa
   e horário") no topo, com cada item levando à seção certa.
9. **Prévia no celular** abre em folha de altura total; trocar por prévia lado a lado em modo paisagem/computador e, no
   celular, o mesmo celular da entrada (moldura) para o dono ver como o cliente vê.

### Divergência para o dono decidir
10. O aviso "Alterações não publicadas" expande e recolhe animando a altura (feito de propósito para seguir a referência
    Figaro, com teste em `navegacao-movel.test.ts`), mas a regra de movimento do projeto pede só transform/opacity. Não
    mexi; dizer qual vale.

## 3. Como testar o que foi corrigido (prévia)

- Abrir `https://previa.cortaiapp.pages.dev/teste01`, tocar num serviço: deve abrir o agendamento com ele escolhido.
- Em `/agendar/teste01`: nenhum ícone de tesoura nos serviços.
- No painel, **Sua Página → Personalizar Página** no tema escuro: o nome do tema aparece no cartão "Layout e tema";
  "Publicar" mostra o carregando no próprio botão.
