# Contexto compartilhado — Flow, Figaro, GPT e Claude

**Objetivo:** centralizar o contexto duradouro que o dono já explicou para que Claude Code, ChatGPT/GPT e Muse consigam continuar o trabalho sem o dono precisar repetir informações. Este documento complementa — não substitui — `AGENTS.md`, `DIARIO.md`, `MUSE.md` e o contrato de design. Se houver conflito, prevalecem as regras do projeto e as decisões mais recentes registradas no `DIARIO.md`.

**Última consolidação:** 2026-10-18. Este documento só registra informações conhecidas; não afirma que arquivos, APK ou funcionalidades foram verificados quando isso não aconteceu.

## 1. Fonte única de verdade e comunicação entre IAs

- Repositório: `herslander-netizen/cortai-app`.
- Branch de trabalho exclusiva: `cloudflare-workers-migration-2026-10-13`.
- Canal compartilhado entre as IAs: `DIARIO.md` no GitHub. As conversas privadas de Claude, GPT e Muse não são automaticamente visíveis umas às outras.
- Leia sempre `AGENTS.md`, `DIARIO.md`, `MUSE.md` e, para interface, `docs/contrato-de-design.md`; siga também os arquivos `AGENTS.md` mais próximos do código.
- Antes de alterar arquivos, confira `Em andamento` e reserve a tarefa conforme o protocolo do `DIARIO.md`. Depois, registre no diário o que mudou, os arquivos e os testes, remova a reserva e deixe recados para quem precisa agir. Quem ler recado endereçado a si responde ou marca `[lido]`.
- Não trabalhar em `main`, não abrir PR para `main`, não fazer force-push/rebase/amend em commit enviado. Não tocar no repositório `evolution-crm`.
- Não alterar banco real, aplicar migrações, mudar DNS, publicar no site principal, criar custos ou apagar dados/funcionalidades sem autorização explícita do dono.
- Um push na branch de trabalho aciona validação e prévia em `https://previa.cortaiapp.pages.dev`. O site principal é `https://cortaiapp.pages.dev`; só publicar quando o dono pedir explicitamente “mande pra main”, “publica” ou equivalente, executando o fluxo “Lançar versão”. A prévia e o site principal usam o mesmo banco `cortai-prod`; tratar gravações de teste como reais.
- Nunca registrar segredos, senhas ou tokens nos documentos.

## 2. Divisão de responsabilidades

- **Claude Code:** implementa o código do Flow, incluindo os arquivos reservados para a Agenda. O dono determinou que a Agenda segue o Figaro e que Claude continua responsável pela implementação da Agenda.
- **GPT/ChatGPT:** atua como analista visual e de referência para ajudar Claude a recuperar o comportamento original do Figaro; também pode executar tarefas em arquivos fora das reservas de Claude, respeitando o diário.
- **Muse:** tem as mesmas autorizações e regras gerais, conforme decisão do dono; coordenar mudanças pelo diário.
- Não editar arquivos de implementação da Agenda que estejam reservados ao Claude. Para perguntas do Claude sobre o Figaro, responder com especificação prática e verificável: hierarquia, espaçamento relativo, estados antes/durante/depois, movimentos, o que muda e o que permanece, gestos, casos de borda e critérios de aceite.
- Separar sempre **observação direta**, **inferência** e **sem evidência**. Não inventar comportamento, classe do APK, timestamp de vídeo, nome de componente ou detalhes de outro aplicativo. Não declarar paridade concluída sem validação visual e funcional.

## 3. Identidade e objetivo do produto

- O produto atual chama-se **Flow**. “Figaro/Figaroo” é a referência de uma versão antiga que deve ser recuperada; não é o nome atual do produto.
- Preservar a identidade visual atual do Flow. Recuperar da referência Figaro a estrutura, a experiência, os cartões, fluxos, gestos, transições e animações que forem comprováveis. Não fazer redesign amplo nem misturar padrões de outros aplicativos.
- O Flow deve servir a diferentes segmentos de beleza e serviços; não tornar a interface genericamente dependente de barbearias. A linguagem por segmento fica em `src/lib/segmentos.ts`.
- Manter arquitetura, dados, regras de negócio, permissões e backend atuais ao recuperar a experiência visual.
- O contrato de design obrigatório está em `docs/contrato-de-design.md`. Para ícone da IA, usar o mecanismo de projeto `IconeDaIA`; não criar outro padrão isolado.
- O dono prefere trabalhar pelo GitHub e pelo Android quando necessário; não depender do Lovable. O Lovable deixou de ser usado pelo projeto.

## 4. Recuperação do Figaro: evidências e limitações

- Decisão do dono em 2026-10-18: o APK original `Figaroo.apk` é a referência autoritativa para o que for verificável. Preservar o que for bom da versão antiga e acrescentar apenas a marca atual e novas funcionalidades, sem misturar estilos.
- O dono enviou gravações de tela e capturas de referência do Figaro. Os vídeos são a fonte prioritária para comportamento e animação quando mostram diretamente o fluxo. Ao citar evidência, informar o nome exato do arquivo e timestamp apenas depois de confirmar o trecho.
- Duas capturas da tela Início foram referenciadas em `docs/referencia-figaro/inicio-1.jpg` e `docs/referencia-figaro/inicio-2.jpg`; usar apenas se estiverem presentes na branch e inspecionadas.
- Foi recebido o arquivo `Figaroo.apk.part-002` (aproximadamente 18 MB), que aparenta ser uma parte de um arquivo dividido, não um APK completo independente. Até agora não foi confirmado que o conjunto de partes esteja completo nem que o APK tenha sido reconstruído ou inspecionado. **Não alegar inspeção do APK.** Se o dono enviar as outras partes, confirmar os nomes e a sequência antes de reconstruir.
- Uma tentativa de buscar `docs/referencia-figaro/Figaroo.apk` no repositório retornou 404. Isso não prova que o APK não exista fora do repositório.
- Imagens genéricas de Glambook, Fresha, Dribbble ou outros aplicativos usadas em mensagens anteriores não são evidência do Figaro e não devem guiar a implementação.

## 5. Decisões confirmadas sobre a Agenda (não repetir como tarefas novas)

Estas decisões estão registradas no `DIARIO.md`; servem de contexto para revisão, não como autorização para mexer nos arquivos reservados:

- **Dia selecionado:** círculo azul.
- **Cartões de atendimento:** fundo neutro consistente entre status; apenas a barra lateral muda de cor conforme o status. Usar fundo adequado ao tema claro/escuro.
- **Navegação por dias:** no celular, a página inteira da timeline (horas, linhas, expediente e cartões) desliza horizontalmente; o dia vizinho entra ao lado com suas próprias horas. A faixa da semana acompanha o gesto e troca de semana ao cruzar os limites; também pode ser arrastada. O calendário mensal abre a partir da faixa da semana.
- **Lista:** atendimentos de hoje em diante, janela inicial de 60 dias com carregamento adicional ao rolar, agrupados por dia; busca por cliente, telefone ou serviço. Cancelados e faltas ficam ocultos atrás de “Mostrar cancelados”. A animação de entrada/saída segue o vídeo de referência.
- **Arraste:** mover cartão ou ajustar sua duração avança em passos de 5 minutos, independentemente do intervalo visual de horários do estabelecimento.
- **Detalhe do atendimento:** ao tocar no cartão, abrir ficha compacta com cliente, horário/serviço/profissional, status, ação principal e contato; ações secundárias ficam em “Mais ações”. Painel fixo de edição usa “Descartar” e “Salvar”. A navegação lateral entre dias deve continuar responsiva; não bloquear o gesto durante edição.
- **Alça de duração:** edição da duração pela alça do cartão; não adicionar lupa temporal.
- **Calendário/atualização:** abertura do calendário desce suavemente e fechamento recolhe no sentido inverso, sem alterar o fundo do painel. Indicadores/pontinhos próximos à grade substituem texto de atualização periódica; ícones de calendário e sino maiores.
- **Menu +:** já existe em `MenuAcoesAgenda.tsx`, com “Bloquear horário”, “Atendimento avulso”, “Agendar por voz” e “Agendar horário”. Não reportar como ausente nem redesenhar sem solicitação.
- **Zoom por pinça:** Claude relatou ter implementado zoom de dois dedos na timeline, com ancoragem do horário sob os dedos, compartilhamento entre páginas de dias, persistência no dispositivo e cancelamento do swipe de dia ao usar dois dedos. Claude relatou testes/build passando, mas a validação em aparelho físico não foi confirmada independentemente. Tratar como status reportado, não como verificação própria.
- Os arquivos de implementação da Agenda estão reservados a Claude. O documento de perguntas é `docs/referencia-figaro/agenda-perguntas.md`; Claude pediu respostas detalhadas com a fonte de cada afirmação. Onde não houver prova, escrever literalmente “sem evidência”.

## 6. Tela Início Figaro

O diário registra duas imagens de referência da tela Início, com os seguintes elementos de cima para baixo:
1. Cabeçalho com logo redondo, nome do negócio (exemplo “Teste”), texto “Nome · Proprietário” e ícone de ajustes à direita.
2. Cartão “Sua Página · Online” com ícone de compartilhar.
3. Faixa “O desempenho aparecerá aqui”.
4. Cartão “Confirme seu e-mail” e botão “Verificar agora”.
5. Cartão “Ative as notificações”, com “Ativar” e “Agora não”.
6. Cartão “Agenda · Hoje · fechado” com ponto à direita.
7. Links “Sua barbearia ›” e “Fidelidade ›”.
8. Cartão “Suporte · Atendimento humano no WhatsApp”.
Os cartões têm cantos bem arredondados e fundo um tom acima do fundo da página no tema escuro. Isso é a descrição registrada no diário; confirmar as imagens antes de extrapolar detalhes não listados.

## 7. Infraestrutura e segurança — resumo para orientação

- Código: GitHub; hospedagem em Cloudflare Pages; backend/auth/arquivos no Supabase `cortai-prod`.
- Prévia: `previa.cortaiapp.pages.dev`; site principal: `cortaiapp.pages.dev`.
- A branch `main` é arquivo histórico e não alimenta os sites.
- Nenhuma ação neste documento autoriza alteração de banco, aplicação de migração ou publicação.
- Migrações devem ser apenas de acréscimo, ensaiadas localmente e aplicadas apenas com autorização. Não usar `DROP` nem apagar dados.
- Não tocar em `evolution-crm`; não colocar segredos em arquivos, logs ou mensagens.
- O estado técnico detalhado, automações, segredos por nome de variável e pendências devem ser consultados em `MUSE.md`, não duplicados manualmente aqui para evitar divergência.

## 8. Como Claude e GPT devem atualizar este documento

1. Antes de editar, ler o diário e verificar reservas.
2. Acrescentar fatos duradouros, decisões do dono e limites que ajudem a próxima IA a continuar.
3. Não duplicar cada andamento temporário: mudanças e validações de cada tarefa ficam no topo de “Diário” do `DIARIO.md`.
4. Para um recado entre IAs, usar a seção “Recados” do `DIARIO.md` e marcar `[lido]` quando visto.
5. Se houver contradição, prevalece a decisão mais recente do dono registrada em `DIARIO.md`; sinalizar conflitos em vez de inventar uma resolução.
6. Não marcar uma tarefa como concluída nem um teste como aprovado sem evidência verificável.
