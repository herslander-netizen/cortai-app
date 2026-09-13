# Editor da Home pública

## Onde isso vai ficar na navegação

A Home pública do Cortaí é uma página **da plataforma** (não de cada barbearia), então o editor pertence ao painel do dono da plataforma.

Hoje o admin tem: Visão geral | Barbearias | Monetização | Mais. Dentro de "Mais" já existe o grupo **Configurações** (Aparência e padrões, Recursos dos planos, Perfil).

Decisão: **não** criar item novo na barra principal. O editor entra em Mais → um novo grupo **Conteúdo público**, com dois itens:
- **Home** (novo editor)
- **Parceiros** (já existe, sai de "Operação da plataforma" para cá, pois é conteúdo público)

Assim o número de itens principais continua o mesmo e a hierarquia fica mais lógica.

Endereço: `/admin/home`.

## O que o administrador vai poder fazer

Uma tela única, organizada em abas, sempre com poucos campos visíveis por vez:

1. **Visão geral** — miniatura da Home, status (Publicada / Rascunho com alterações), data da última publicação, atalhos: Ver a Home, Publicar, Descartar rascunho, Restaurar uma versão anterior.
2. **Topo (Hero)** — texto pequeno acima do título, título, descrição, botão principal (texto + destino), botão secundário (texto + destino), imagem de fundo, enquadramento da foto, escurecimento da foto, alinhamento, ligar/desligar o selo.
3. **Seções** — lista de cards com nome, tipo, ligado/desligado e ordem (arrastar para reordenar). Cada card abre a edição do seu conteúdo (títulos, textos, itens, imagem). Tipos disponíveis: Topo, Benefícios, Texto + imagem, Celular/produto, Agenda, Clientes, Financeiro, Voltaí/Fidelidade, Loja, Chamada final, Parceiros, Rodapé. Duplicar disponível nos tipos de conteúdo livre; excluir só com confirmação e nunca no Topo/Rodapé.
4. **Imagens** — biblioteca simples com as fotos já usadas na Home, enviar nova, substituir, remover, definir o ponto de foco e proporção recomendada.
5. **Aparência** — presets (Cortaí Premium, Cinemático, Clean, Editorial), cor de destaque, estilo e arredondamento dos botões, intensidade de bordas/sombras, largura do conteúdo, espaçamento entre seções, tipografia (apenas as já suportadas), claro/escuro por seção.
6. **SEO e compartilhamento** — título, descrição, imagem de compartilhamento, endereço canônico, com explicações curtas em português.
7. **Publicação** — "Salvar rascunho" e "Publicar alterações" separados, resumo do que mudou antes de publicar, link para ver a Home antes de publicar.

Cada aba mostra o essencial; ajustes finos ficam atrás de "Configurações avançadas". Toda alteração visual tem prévia ao lado (desktop) ou acima (celular).

## Como a Home passa a funcionar

A Home continua exatamente a experiência cinematográfica atual (fotos grandes, alternância preto / off-white, mockup de celular, Voltaí, Agenda, Clientes, Financeiro, Loja, CTAs). O que muda: os textos, imagens, ordem, ativação e estilo dessas seções passam a vir da configuração publicada, com o conteúdo atual gravado como valor inicial — ninguém vê diferença no dia da entrega.

Se a configuração não carregar, a Home cai no conteúdo atual embutido no código. Nada de página genérica de blocos.

## Detalhes técnicos

**Banco (nova migração)**
- `home_publica` — linha única (`id boolean primary key default true`) com `rascunho jsonb`, `publicado jsonb`, `publicado_em`, `atualizado_em`, `atualizado_por`. Leitura pública apenas do `publicado` via função `home_publicada()` security definer (evita expor rascunho ao `anon`); escrita só para `admin` via `has_role`.
- `home_publica_versoes` — histórico de snapshots publicados (`snapshot jsonb`, `criado_em`, `criado_por`), para restaurar versão anterior. Mesmo padrão de `tenant_branding_versions`.
- GRANTs explícitos: `authenticated` + `service_role`; sem `anon` (a leitura pública sai da função security definer).
- Seed com o conteúdo atual da Home em `publicado` e `rascunho`.

**Imagens**: bucket público `home-publica` (via ferramenta de bucket), upload por server function com verificação de admin.

**Código**
- `src/lib/home-publica.ts` — tipos (`ConfigHome`, `SecaoHome`), preset padrão com o conteúdo atual, presets de aparência, validação Zod compartilhada.
- `src/lib/home.functions.ts` — `getHomePublicada` (pública, cacheável), `getHomeAdmin`, `salvarRascunhoHome`, `publicarHome`, `descartarRascunhoHome`, `restaurarVersaoHome`, `enviarImagemHome`; todas as de escrita com `requireSupabaseAuth` + checagem `has_role(admin)` no servidor.
- `src/routes/index.tsx` — passa a ler a configuração publicada no loader (`ensureQueryData`) e renderizar as seções a partir dela; os blocos visuais atuais viram componentes em `src/components/home/` (`SecaoHero`, `SecaoBeneficios`, `SecaoTextoImagem`, `SecaoProduto`, `SecaoRecursos`, `SecaoVoltai`, `SecaoCTA`, `SecaoRodape`) reaproveitando as classes `landing-*` já existentes. `head()` usa os campos de SEO.
- `src/routes/admin.home.tsx` — editor com abas, prévia e estados de salvamento, usando `AdminScreen`, `Field`, `SectionHeading`, `EmptyState`, `Button`, `Switch`, `Dialog`.
- `src/routes/admin.mais.tsx` e `src/routes/admin.tsx` — novo grupo "Conteúdo público".
- Reordenação por arrastar com `@dnd-kit/core` + `@dnd-kit/sortable` (instalar), com alternativa por botões "subir/descer" para toque.

**Validação final**: typecheck, build e conferência visual em 390px e 1280px, claro e escuro, da Home e do editor.
