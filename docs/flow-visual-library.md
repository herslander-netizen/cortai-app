# Flow Visual Library — lote 1 (09/11/2026)

## Descoberta e limites
- Identificadores oficiais: sete segmentos de src/lib/segmentos.ts. "Outro" possui fallback neutro; categorias como tatuagem, fotografia e massoterapia ainda não têm cadastro próprio. Não inventar IDs paralelos.
- Três experiências preservadas: página tradicional (PaginaPublica), Site Completo/Raízes, e Chat (motor e etapas de agendamento intocados).
- Fotos atuais em public/exemplos/ e public/temas/ são sintéticas e documentadas em docs/creditos-de-imagens.md. Nenhuma foto nova foi criada, importada, publicada ou enviada ao Supabase. A compatibilidade de direitos do output de IA deve ser conferida com os Termos de Uso e revisão de conteúdo antes do lançamento comercial. Essas cenas jamais representam prova de serviços executados pelo estabelecimento.
- O banco atual assina URLs de armazenamento de tenant-logos e controla rascunho/publicado. Biblioteca do negócio precisa ser copiada por fluxo autorizado do cliente para pasta do próprio tenant, nunca gravar um /temas/ como path de Storage.
- Não atualizar o tema automaticamente de um cliente existente. A prévia de preset é pura, sem salvamento.
- A página sem capa própria pode usar imagem ilustrativa categorizada quando houver; em qualquer erro de imagem, conservar fallback visual já existente.
- Meta futura: 14 imagens * 7 segmentos (98 slots; hoje 16 imagens reais JÁ existentes, com cobertura incompleta e possível reutilização de outras categorias). Ainda faltam imagens para segmentos específicos e todos os slots definidos na missão.

## Evidências da referência
- Figaroo: docs/referencia-figaro/apk/4-pagina-publica.md, 6-animacoes.md e docs/auditoria-estrutura-pagina-figaroo-flow-2026-11-08.md. Hero com fundo fotográfico, título, CTA; seções de serviços e galeria são observados em vídeos. Valores CSS exatos, gestos não registrados e equivalência no navegador não são comprovados; novas transições serão implementação original.
- Página do cliente: não alterar guardas, passos ou disponibilidade de reserva sem homologação real.

## Arquitetura do lote
- flow-visual-library.ts: catálogo estático inicial de metadados de origem/uso, busca e recomendações. Não importa bytes no bundle JavaScript.
- flow-visual-presets.ts: sete presets usando temas e fontes existentes. Presets propostos são independentes do layout do cliente, e preview não persiste.
- O editor pode utilizar a biblioteca somente por escolha explícita: faz upload da foto para o armazenamento do tenant pelo caminho oficial, como as imagens próprias. Rascunho/publicação permanecem no sistema original.
- Futuro: importação administrativa e catálogo persistido com leitura pública/alteração restrita, a partir de migração aditiva revisada e nunca aplicada sem autorização.

## Checkpoints pendentes
- Comparação visual 320/360/390/430px e desktop, tema claro/escuro, Android intermediário.
- Direitos e revisão comercial de cada mídia, assets de segmentos faltantes, miniaturas distintas e responsividade AVIF/WebP.
- Integração automática de onboarding **somente para novas páginas** e confirmação antes da troca de segmento.
- Galeria temática de apoio com aviso de conteúdo ilustrativo sem fingir portfólio; imagens de serviços por seção.
- Testes autenticados de rascunho, descarte, restauração, publicação, contato, navegação e agendamento.
