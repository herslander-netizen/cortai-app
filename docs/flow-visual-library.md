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


## Integração no cliente e no editor

- Site Completo, Raízes e página tradicional usam imagem ilustrativa por segmento apenas quando não existe capa própria; erro cai no fallback neutro.
- Imagens padrão usam alt vazio, sem afirmar que são fotos do ambiente do estabelecimento. Não há portfólios ou avaliações sintéticos.
- Hero do Site e Raízes recebe fade-up de 8px/220ms; página tradicional recebe reveal das seções. Todos os efeitos respeitam movimento reduzido.
- Biblioteca Flow aparece dentro do editor real de Hero e Galeria, com filtro, busca e prévia. Aplicar copia ao Storage do próprio negócio via enviarFoto; salvar rascunho e publicar continuam funções oficiais.
- A escolha no editor não é automática, não sobrescreve fotos próprias, e os presets não são impostos a contas existentes.


## Experiência de atendimento Chat para o cliente
- O plano de fundo no modo Capa utiliza imagem do próprio negócio quando existe; sem ela, usa sugestão do segmento e cai no fundo Flow em erro. Os modos Padrão e Liso mantêm seu comportamento anterior.
- A prévia Chat do editor recebe o mesmo segmento da página, preservando compatibilidade visual. Passos, mensagens, confirmação, agenda e informações de cliente não foram alterados.


## Catálogo de prompts para a próxima fase

O arquivo src/lib/flow-visual-prompts.ts prepara 14 especificações distintas para cada um dos sete segmentos oficiais (98 especificações no total): 2 hero, 6 galeria, 3 serviço, 2 apoio e 1 fundo, com composição, proporção, instruções positivas e negativas. São **prompts e slots, não imagens geradas, hospedadas ou disponíveis para seleção**. A importação de futuras imagens exige revisão humana de licenças, conteúdo e direitos e cadastro no catálogo, sem publicação automática. A correspondência a subsegmentos futuros deve reutilizar o segmento oficial até existir identificador reconhecido na plataforma.


**Revisão de tema claro:** como o `:root.light` redefine as variáveis de cor, o Chat com superfície Padrão usa localmente os valores equivalentes aos papéis escuros oficiais do Figaro (background, onSurface, containers, ação azul), para manter o Chat realmente escuro em aparelhos com modo claro. Essa regra não altera `src/styles.css` e não afeta superfícies personalizadas.


## Inicialização sem migração

Uma página ainda sem configuração (nula/ausente) recebe o preset oficial do seu segmento no editor e nas leituras públicas. Uma configuração gravada, mesmo parcial ou legada, mantém a normalização anterior e nunca sofre substituição automática de tema, texto, layout ou chat. As fotos do negócio mantêm prioridade. Nada é escrito no banco por esse resolvedor; publicação e rascunhos permanecem nas ações existentes.


## Prévia antes de personalizar ou trocar segmento

A escolha do tipo de negócio em Opções da Conta mostra a paleta e a imagem indicativa antes da confirmação; não altera rascunhos ou fotos. No editor já existente de Layout & Tema, o cartão Visual recomendado permite aplicar apenas cores e fontes **no estado local do rascunho**, por clique explícito. A imagem apresentada não é inserida automaticamente como foto real e o fluxo de salvar/publicar permanece separado.
