# Marca Flow — implementação e inventário (29/10/2026)

Referência: **Manual da Marca Flow v1.0 (out/2026)**, enviado pelo dono. Substitui a identidade Cortaí de 27/10.

## 1. O que é o Flow

- **Flow**: plataforma e experiência. **Flow IA**: assistente e automações (antiga "CortAI"). **Flow Chat**:
  agendamento conversacional (antigo "Cortaí Chat"). **Flow Agenda**: agenda. **Flow Pay**: só se o produto
  financeiro for lançado (não aparece em nenhuma tela).
- Assinatura: **"Seu negócio no ritmo certo."**
- Linguagem neutra: negócio, profissional, cliente, atendimento. Barbearia é um segmento possível, nunca o padrão.

## 2. Marca (componentes e arquivos)

| Uso | Onde |
| --- | --- |
| Lettering oficial "Flow." | `MarcaFlow` em `src/components/marca/MarcaFlow.tsx`; preto em fundos claros, branco em fundos escuros e ponto rosa preservado |
| Assinatura completa com slogan | `MarcaFlowCompleta` (mesmo arquivo), usada na entrada/login |
| Símbolo F + ponto | `SimboloFlow` (mesmo arquivo); símbolo compacto do app, independente do lettering |
| Ícone do app | `IconeFlow` / `iconeFlowUrl` (`/icone-flow-v2-512.png`) |
| Arquivos vetoriais oficiais | `flow-wordmark-oficial.svg`, `flow-lockup-oficial-escura.svg`, `flow-lockup-oficial-clara.svg`, `flow-logotipo-escura.svg`, `flow-logotipo-clara.svg` em `public/marca/flow/` |
| PNG derivados | `public/marca/flow/*-256.png`, `flow-logotipo-escura-560.png` (ticket), `flow-capa-neutra.png`, `flow-chat-fundo.png` |
| PWA e navegador | `public/icone-flow-192.png`, `icone-flow-512.png`, `icone-flow-maskable-512.png`, `apple-touch-icon-flow.png`, `favicon-flow-256.png`, `favicon.ico`, `capa-social-flow.jpg` |

**Origem do vetor oficial:** traçado diretamente da imagem oficial enviada e confirmada pelo dono em 02/11/2026.
O arquivo `flow-wordmark-oficial.svg` contém os contornos do lettering e do ponto; `flow-lockup-oficial-escura.svg`
e `flow-lockup-oficial-clara.svg` preservam também o slogan vetorizado. As versões compactas
`flow-logotipo-escura.svg` e `flow-logotipo-clara.svg` usam o mesmo desenho sem o slogan.

Regras: não substituir o lettering por fonte, não redesenhar, não esticar e não aplicar filtros sobre o ponto.
Em fundo claro, usar lettering preto (#15161B); em fundo escuro, usar branco (#FFFFFF). O ponto rosa oficial
(#FC51A6) permanece igual nas duas versões. A assinatura completa mantém o texto "Seu negócio no ritmo certo."
como parte do vetor; não repetir o slogan fora do lockup quando essa versão for usada.

## 3. Cores, fontes e layout: sem mudança

Decisão do dono (29/10): **só o logo muda**. Cores, fontes e layout continuam exatamente os de antes da migração
(paleta Figaro/Cortaí de 27/10). A paleta do manual (#0F0F14, #1A1B24, #6B5F8F, #A8C7FA, #BB86FC, #F48FB1,
#9C425A) e a Inter **não** foram aplicadas. O logo novo ocupa a mesma caixa do anterior (centralizado), e as cores do
próprio logo (gradiente lavanda e ponto rosa) ficam só no desenho da marca.

## 4. Inventário do que ainda diz "cortai" (classificado)

| Classe | Exemplos | Decisão |
| --- | --- | --- |
| **Interno (código)** | nomes de componentes e arquivos (`ShowroomCortai`, `AssistenteCortai`, `CortaiDoNegocio`, `FabCortai`), classes CSS `cortai-*`, rotas `/barbeiro/cortai*`, `package.json` só no nome | Mantido. Renomear não muda nada para o usuário e arrisca regressão |
| **Persistido** | chaves `cortai:*`/`cortai-*` no localStorage, colunas `*_cortai`/`cortai_ativa`, eventos `cortai.automacao_*`, migrações já aplicadas | Mantido. Trocar apagaria preferências e quebraria dados |
| **Externo** | IDs de botões do WhatsApp (`CORTAI_CONFIRMAR` etc.) já usados em modelos aprovados na Meta; variáveis e segredos `CORTAI_*`; projeto Cloudflare `cortaiapp`; Worker `cortai-reconstruction-test-2026`; Supabase `cortai-prod`; repositório `cortai-app` | Mantido. Mudar exige ação do dono fora do código |
| **Domínio** | `cortai.dev` (canônicas, ICS, VAPID `mailto:contato@cortai.dev`, "Agende em cortai.dev/b/…"), `cortaiapp.pages.dev` | Mantido. **Não existe domínio Flow**; não inventar. Trocar quando o dono decidir |
| **Histórico** | `docs/historico/`, `docs/referencia-figaro/`, auditorias datadas, entradas antigas do `DIARIO.md` | Mantido como registro |
| **Assets antigos** | `public/marca/cortai-*`, `public/*cortai*`, `src/assets/cortai-*` | Sem uso (só `cortai-barbershop-cover.jpg`, uma foto sem marca usada no segmento barbearia). Apagar só com autorização |

Textos visíveis em `src/`: **nenhuma ocorrência de "Cortaí"/"CortAI" sobrou** fora dos casos acima.

## 5. Pendências que dependem do dono

1. **Migração `0051_marca_flow_textos.sql`** (**aplicada em 30/10** com autorização (só a descrição do plano Conecta tinha o nome antigo)): troca "CortAI/Cortaí" por "Flow IA/Flow"
   nos textos guardados no banco (descrição dos planos, negócio de demonstração, boas-vindas da IA, rascunho e
   publicado da home). Precisa de autorização para aplicar no `cortai-prod`.
2. **Modelos do WhatsApp na Meta** que citam "Cortaí": precisam de novos modelos aprovados (os IDs dos botões continuam).
3. **Domínio Flow**: definir; depois trocar canônicas, links curtos e textos de divulgação.
4. **Modelos de e-mail do Supabase Auth** (confirmação, recuperação): editar no painel do Supabase.
5. **Vetores-mestre do logo** do designer.
6. **Assets antigos sem uso**: apagar só se o dono autorizar.

## Capas de redes e imagens padrão (dono, 31/10/2026)

Kit oficial em `public/marca/flow/capas/` (WebP). **Prioridade: as escuras**; as claras são variação para fundos claros.

| Arquivo | Formato | Uso |
|---|---|---|
| `flow-escura-quadrada.webp` | 1:1 (1254 px) | Perfil e posts quadrados |
| `flow-escura-paisagem.webp` | 1484 × 1060 | Banners e capas horizontais; origem da imagem de compartilhamento |
| `flow-escura-9x16.webp` | 9:16 (941 × 1672) | Stories e telas verticais |
| `flow-escura-story.webp` | 841 × 1870 | Stories altos |
| `flow-clara-quadrada.webp`, `flow-clara-paisagem.webp`, `flow-clara-retrato.webp`, `flow-clara-story.webp` | idem | Variações claras |

Onde o Flow usa por padrão (o que o usuário não personalizou):
- **Imagem de compartilhamento** (link do Flow, login, apresentação e reserva da página pública sem capa própria): `public/capa-social-flow-v3.jpg`, 1200 × 630, recortada da paisagem escura. Nome novo para as redes não mostrarem a antiga em cache.
- **Não usadas, de propósito** ("a não ser que fique feio"): a capa padrão da página do negócio continua o fundo neutro (`flow-capa-neutra.png`), porque o nome do negócio fica por cima e brigaria com o logo; o fundo do chat continua sem logo, porque as mensagens passariam por cima. Ícone do aplicativo e da Agenda: sem mudança.
- Uma das imagens recebidas era um print da tela do celular e foi descartada.
