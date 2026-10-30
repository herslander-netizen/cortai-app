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
| Lettering "flow" (F fluido + ponto rosa) | `MarcaFlow` em `src/components/marca/MarcaFlow.tsx` (`clara` = para fundo escuro, `escura` = para fundo claro, `automatica` = segue o tema) |
| Símbolo F + ponto | `SimboloFlow` (mesmo arquivo) |
| Ícone do app | `IconeFlow` / `iconeFlowUrl` (`/icone-flow-512.png`) |
| Arquivos vetoriais | `public/marca/flow/flow-logotipo-clara.svg`, `flow-logotipo-escura.svg`, `flow-simbolo.svg`, `flow-simbolo-escuro.svg`, `flow-icone.svg` |
| PNG derivados | `public/marca/flow/*-256.png`, `flow-logotipo-escura-560.png` (ticket), `flow-capa-neutra.png`, `flow-chat-fundo.png` |
| PWA e navegador | `public/icone-flow-192.png`, `icone-flow-512.png`, `icone-flow-maskable-512.png`, `apple-touch-icon-flow.png`, `favicon-flow-256.png`, `favicon.ico`, `capa-social-flow.jpg` |

**Origem dos vetores:** o SVG foi **reconstruído a partir da prancha do manual** (o PDF não traz os vetores
originais). Formas fiéis à prancha, mas **os arquivos-mestre do designer continuam pendentes**. Quando
chegarem, basta trocar os SVG em `public/marca/flow/` e os traçados `F_CURVA`/`F_HASTE` de `MarcaFlow.tsx`.

Regras: não trocar o lettering por texto, não esticar, não recolorir, sem efeitos. Gradiente
(#CBC5F3 → #F2F1FD) só no lettering claro e no símbolo.

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
