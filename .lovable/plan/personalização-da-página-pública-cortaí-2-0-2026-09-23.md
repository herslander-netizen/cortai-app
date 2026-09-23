# Personalização da página pública — Cortaí 2.0

## Auditoria atual

- A página pública está em `/b/$slug` e hoje usa uma única leitura para marca, serviços, profissionais, produtos e fotos. O agendamento continua isolado em `/agendar/$slug` e não será alterado.
- O editor atual está em **Marca** e já oferece logo, capa, seis paletas, dados da barbearia, histórico de versões e controle de plano. Toda gravação é validada no servidor e restrita ao dono.
- A identidade vive hoje no cadastro da barbearia; não há layout, fontes, aparência, componentes configuráveis ou separação entre rascunho e página publicada.
- Serviços, profissionais, produtos, galeria, endereço, WhatsApp e Instagram já têm fontes reais. Horários serão reutilizados de `horarios_de_funcionamento`.
- Avaliações internas existem, mas não têm aprovação para publicação. A página poderá mostrar somente média e quantidade, sem nomes ou comentários, evitando expor clientes.
- Não existe feed do Instagram, cadastro de promoções nem conteúdo público de fidelidade. Nesta entrega, Instagram será um link real; promoções e fidelidade não serão simuladas.
- A versão instalada já está corretamente em **2.0.0** nos dois arquivos solicitados. Ela será mantida e o changelog/roadmap receberá esta evolução, sem novo salto de versão.

## Estrutura a construir

### 1. Configuração segura com rascunho e publicação

Criar uma tabela nova, isolada por barbearia, para guardar:

- configuração em rascunho;
- configuração publicada;
- quem alterou e datas de salvamento/publicação.

O conteúdo oficial já existente continuará no cadastro da barbearia. O rascunho guardará uma cópia temporária apenas do que precisa ser revisado antes da publicação; ao publicar, os campos oficiais serão atualizados junto da configuração visual.

Acesso:

- somente dono e administrador da plataforma podem ler, salvar e publicar;
- regras de acesso por barbearia e concessões explícitas serão aplicadas;
- a página pública receberá somente o bloco publicado e dados públicos seguros;
- o controle `branding_avancado` continuará validado no servidor;
- o histórico existente será preservado e passará a registrar também a configuração completa publicada.

### 2. Modelo único de personalização

Criar um esquema validado com:

- **tema:** Premium, Urbano, Clássico, Clean, Dark, Industrial, Street e Editorial;
- **layout:** Cinematográfico, Logo Central, Minimalista, Foto em Destaque e Editorial;
- **cores:** principal, secundária, botão, fundo, texto e destaque;
- **tipografia:** títulos e textos entre Inter, Poppins, Montserrat, Oswald, Roboto e serif elegante;
- **aparência:** bordas quadradas/suaves/modernas/arredondadas, densidade compacta/equilibrada/espaçosa e botões sólidos/contorno/minimalistas;
- **conteúdo:** frase principal, descrição, texto “Sobre” e texto do CTA com limite;
- **componentes:** apresentação, serviços, profissionais, galeria, avaliações agregadas, produtos, Instagram, localização, horários, WhatsApp e CTA final.

Logo, capa, nome, contatos e endereço continuarão sincronizados com os dados atuais. Componentes sem dados serão omitidos, mesmo quando ativados, sem deixar espaços vazios.

### 3. Sistema visual reutilizável

Criar uma biblioteca central de temas e layouts que converte escolhas em variáveis CSS, sem duplicar páginas ou componentes. A página pública e a prévia administrativa usarão o mesmo renderizador.

Os tokens incluirão cores, fontes, raio, densidade, botões, superfícies e contraste. Cada combinação continuará acessível e o estilo Cortaí permanecerá no painel administrativo.

### 4. Novo personalizador

Evoluir **Marca** para **Personalizar página**, com quatro abas:

- **Visual:** miniaturas reais dos oito temas, cinco layouts, cores com seletor e HEX, fontes, bordas, densidade e botões;
- **Conteúdo:** nome, logo, capa, frase, descrição, Sobre, contatos e endereço;
- **Componentes:** toggles agrupados em Essenciais, Confiança, Conversão e Extras; itens ainda sem fonte real aparecerão indisponíveis, não simulados;
- **Links:** WhatsApp, Instagram, telefone, endereço e link público.

Adicionar prévia imediata Desktop/Mobile, sem salvar, usando exatamente o componente público. “Visualizar no celular” abrirá a página publicada em nova aba.

Os comandos serão separados:

- **Salvar alterações:** persiste somente o rascunho;
- **Publicar:** aplica o rascunho à página pública;
- avisos claros de sucesso, falha e alterações não salvas;
- versões anteriores continuam restauráveis para o rascunho antes de uma nova publicação.

### 5. Página pública orientada à conversão

Recompor `/b/$slug` com módulos leves e condicionais:

1. hero com logo, nome, frase, capa, identidade e CTA de agendamento acima da dobra;
2. serviços;
3. profissionais;
4. destaques/galeria;
5. Sobre;
6. avaliações agregadas;
7. produtos, quando loja e seção estiverem ativas;
8. Instagram como link real, quando configurado;
9. localização com endereço e ação para abrir o mapa;
10. horários reais;
11. CTA final;
12. rodapé existente.

No celular, uma barra discreta de agendamento surgirá após a saída do hero. No desktop, o CTA persistente ficará acessível sem cobrir conteúdo. WhatsApp permanecerá sempre secundário. O compartilhamento e QR atuais serão preservados em posição compatível.

### 6. Performance e acessibilidade

- Manter uma leitura agregada por página e uma por editor, sem consulta por seção.
- Cache curto para a página pública e URLs assinadas; capa priorizada, demais imagens carregadas sob demanda.
- Não montar módulos desativados.
- Limitar galeria e produtos já na leitura.
- Garantir contraste, foco, alvos de toque, texto responsivo, sem rolagem horizontal e respeito a movimento reduzido.
- Não adicionar IA nem bibliotecas desnecessárias.

## Arquivos previstos

- Banco: nova migração para a configuração rascunho/publicada e operação transacional de publicação.
- Dados: `src/lib/marca.functions.ts`, `src/lib/publico.functions.ts` e tipos gerados automaticamente.
- Biblioteca visual: novos módulos pequenos para esquema, temas/tokens e renderizador da página.
- Painel: `src/routes/barbeiro.marca.tsx` e componentes específicos do personalizador.
- Público: `src/routes/b.$slug.tsx` e estilos globais estritamente necessários.
- Produto: `src/lib/versao.ts` (changelog, mantendo 2.0.0), `public/versao.json` (confirmado em 2.0.0) e `roadmap.md`.

## Validação final

- Fluxos: salvar rascunho, recarregar editor, publicar, restaurar versão, abrir página pública e agendar.
- Segurança: dono autorizado, outro papel bloqueado, isolamento entre duas barbearias e nenhum dado sensível público.
- Conteúdo: seções ativas/inativas, ausência de dados, loja desativada, sem WhatsApp/Instagram, avaliações vazias e horários fechados.
- Combinações: oito temas × cinco layouts por amostragem representativa, cores, fontes, raios, densidades e botões.
- Visual: celulares de 390–420 px, tablet e desktop de 1280 px; hero e CTA persistente sem sobreposição.
- Qualidade: tipos, testes focados, build e inspeção real no navegador.

## Fora desta entrega

- Alterações no fluxo de agendamento, autenticação, agenda, clientes ou WhatsApp.
- Feed do Instagram, promoções ou fidelidade pública sem fonte de dados própria.
- Comentários ou nomes de avaliações sem consentimento/moderação.
- Domínio personalizado e novos limites comerciais de plano; a base ficará preparada para esses controles futuros.
