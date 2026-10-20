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

Cada afirmação vem marcada como **[código]** (visto no código, com o arquivo) ou **[inferência]**;
o que não foi achado está como **sem evidência**. O APK traz os textos só em inglês (o pacote de
idioma `config.pt` não veio); as traduções estão marcadas como sugestão.

Quando o vídeo e o código divergirem, vale o que o dono decidir; até lá, o código é a referência
para valores exatos e o vídeo para o comportamento visto em uso.
