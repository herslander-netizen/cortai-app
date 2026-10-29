# Figaro — especificação tirada do APK (18/10/2026)

O dono enviou o `Figaroo.apk` completo (5 partes, 88 MB, pacote `com.figaroo.android`, Jetpack
Compose). O Claude juntou as partes, descompilou com o jadx (código aberto) e leu o código das telas.
Estes arquivos são a **descrição** do que está no código (valores, textos, regras), não o código: o
APK e o código descompilado **não** vão para o repositório. Nenhuma chave ou segredo do APK foi
copiado.

| Arquivo | Conteúdo |
|---|---|
| `1-design-system.md` | Cores (claro/escuro), fontes, tamanhos, arredondamentos, espaçamentos, movimento |
| `2-agenda.md` | Tela da Agenda: barra de cima, semana/mês, linha do tempo, cartões, gestos, modo de edição, lista |
| `3-fluxos-do-atendimento.md` | Ficha, Reagendar, escolher cliente, novo agendamento, reserva, bloqueio |
| `4-pagina-publica.md` | Personalizar Página, Layout & Tema, editores de seção |
| `5-navegacao-e-transicoes.md` | Os três movimentos de troca de tela e o mapa das 94 telas do app (22/10) |
| `6-animacoes.md` | Catálogo de todas as animações achadas no código e nos vídeos do APK (22/10) |
| `7-modulos.md` | Onboarding, entrada, clientes, equipe, serviços, combos, localidades, pacotes, cobrança, vendas, campanhas, avaliações, notificações, conta, negócio e assinatura (22/10) |
| `9-auditoria-apk-atualizado-2026-10-23.md` | Identificação do APK de 23/10 (hash, versão, módulos) e revisão estática básica (GPT) |
| `10-diferencas-apk-23-10-2026.md` | O que o APK de 23/10 muda em relação a esta especificação: o que continua igual e o que apareceu (Claude) |
| `12-material-do-dono-2026-10-29.md` | Levantamento colado pelo dono em 29/10 (abertura, entrada/login, movimento, tokens, módulos, Agenda por dentro): relato não conferido no código, com a conferência rápida no topo |
| `13-paletas-relato-do-dono-2026-10-29.md` | Paletas de cores coladas pelo dono em 29/10: relato, com a conferência no topo (o que já está no Cortaí e o que diverge do código) |

Cada afirmação vem marcada como **[código]** (visto no código, com o arquivo) ou **[inferência]**;
o que não foi achado está como **sem evidência**. O APK traz os textos só em inglês (o pacote de
idioma `config.pt` não veio); as traduções estão marcadas como sugestão.

Quando o vídeo e o código divergirem, vale o que o dono decidir; até lá, o código é a referência
para valores exatos e o vídeo para o comportamento visto em uso.

Em 22/10/2026 o dono reenviou o APK completo (5 partes, 88 MB). A nova leitura acrescentou os arquivos
5, 6 e 7, os textos do `resources.arsc` (que na primeira leitura não tinham sido usados) e os cinco
vídeos de demonstração que vêm dentro do APK (`res/raw/landing_peek_*.mp4`). Os vídeos também não vão
para o repositório; os documentos descrevem o que eles mostram.
- `11-configuracoes.md`: páginas de configuração do Figaro (conta, informações básicas, agendamento, notificações, pagamento), comparação com o Cortaí e o que foi refeito em 24/10.
