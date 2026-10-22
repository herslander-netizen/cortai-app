# Spec 7 — Módulos do Figaro ainda sem especificação

Fonte: APK completo reenviado em 22/10/2026 (jadx). Os textos vêm do `resources.arsc` (inglês) e de
alguns literais em português que estão no próprio código. As traduções abaixo são **sugestão**; os
textos em português que já vieram no código aparecem entre aspas e com "(pt no código)".
Cada tela tem a rota do Figaro e o movimento de troca de tela (ver `5-navegacao-e-transicoes.md`).
Animações: `6-animacoes.md`. Agenda, ficha e página pública já estão nas specs 2, 3 e 4.

Padrões que se repetem em todos os módulos [código]:
- **Lista → Painel → Editores.** Cada área tem uma lista (entra pela gaveta), um "painel" do item
  (`…Dashboard`, com números do item no topo e seções em cartões) e um editor separado por seção
  (`Edit…Details`, `Edit…Rates`…), cada um com o botão salvar em FAB estendido. Salvar volta ao painel.
- **Criar = fluxo em etapas** (`FigarooCreationFlowScaffold`), que sobe de baixo (`crossFlow`), com o
  título "Etapa" e botão "Continuar" ou "Continuar · N" (N = itens escolhidos); a última etapa tem o
  botão de criar. Sair no meio pergunta "Descartar alterações?" (Descartar / Continuar editando).
- **Desativar ≠ apagar.** Quase todo item tem as duas ações no fim do painel, cada uma com
  confirmação e texto explicando o efeito. Item desativado mostra um cartão de aviso com "Reativar".
- **Números do item no topo do painel**: "Agend.", "Receita", "Avaliação" (profissional, serviço,
  localidade, pacote).
- **Estado vazio com texto que ensina** e o botão principal no FAB ("Adicionar …").
- **Erro com "Tentar novamente"**; carregando com o indicador (mínimo de 400 ms).

## 1. Entrada, entrar e criar conta (`authentication`, `signup`)

- **Entrada (Landing):** sequência animada de 5 passos com vídeo (Seu site · Agendar · Lembretes ·
  Avaliações · Desempenho), frase "No ritmo da barbearia." (sugestão), botões "Começar" (criar conta) e
  "Já tem conta? Entrar". Toques repetidos no logotipo liberam o modo de desenvolvedor (contagem regressiva "Modo de desenvolvedor em %d…").
- **Entrar:** e-mail primeiro ("Vamos ver como você costuma entrar"); depois, conforme a conta, **senha**
  ("Bem-vindo de volta, %s", "Esqueceu a senha?") ou **código de acesso de 6 dígitos** enviado por
  e-mail, com "Reenviar em %s". Também Google e Facebook. Redefinir senha pede confirmação ("Enviaremos
  um código para %s").
- **Criar conta:** nome do salão, seu nome, telefone com DDI (EUA, Brasil, Portugal), e-mail; "Criar
  conta grátis"; termos e privacidade; e-mail já cadastrado abre aviso com "Entrar" / "Tentar outro".
  Ajuda abre uma folha com "Falar no WhatsApp". Cartão de oferta ("App grátis para sempre" para
  fundadores; teste grátis; 12 meses).

## 2. Onboarding (`onboarding`, rota `onboarding?startStep=`)

Estados no servidor, em ordem: `NotStarted` → `LocationsCreated` → `OwnerProfileCompleted` →
`TeamMembersCreated` → `Completed` [código: `OnboardingStatus`]. O fluxo tem um `NavHost` interno
(boas-vindas → localidades → equipe → serviços → concluído) e troca de etapa com `intraFlow`.

1. **Boas-vindas:** "Bem-vindo ao Figaroo", "Sua barbearia agora tem uma nova casa."; lista de 3 passos
   com estado (Concluído / Etapa atual / Não iniciado): **Definir localidades** ("Onde a mágica
   acontece"), **Adicionar equipe** ("Quem faz acontecer"), **Configurar serviços** ("O que você faz de
   melhor"). Quando tudo está feito, o selo "Tudo pronto". Botão "Configurar depois".
2. **Localidades:** lista + FAB "Adicionar localidade"; "Continuar".
3. **Equipe:** primeiro "Completar perfil" do dono (dados + horários; "Você trabalha em mais de um
   lugar — defina quando está disponível em cada um"); depois "Adicionar profissional". Texto do teste
   grátis: membros ilimitados durante o teste, depois escolhe os assentos.
4. **Serviços:** lista + FAB "Adicionar serviço", atalho "Categorias", aviso de que combos vêm depois;
   botão final "Concluir onboarding".
5. **Concluído:** "Preparando sua página…" → **"Sucesso!"** (pt no código) "Parabéns! Sua barbearia já
   pode receber agendamentos.", link da página digitado letra a letra, "Copiar link" e "Compartilhar",
   "Você pode personalizar o layout e o tema da página quando quiser.", "Ir para a agenda". Erro:
   "Não foi possível publicar".
- **Fora do fluxo:** se o onboarding não terminou, a Agenda mostra um toast "Continue configurando sua
  barbearia · Faltam poucos passos" que abre o onboarding na etapa certa; o Início tem a seção "Configure
  sua barbearia · 3 passos rápidos para ficar no ar" (`InlineOnboardingDashboard`). Campanhas ficam
  bloqueadas até concluir ("Complete o onboarding primeiro").

## 3. Clientes (`clientsoverview`, `marketingdashboard/clients`)

- **Lista** (gaveta → Clientes): ordem alfabética, selo "NOVO", FAB "Adicionar cliente"; vazio explica
  que clientes entram sozinhos ao agendar online.
- **Criar cliente** (2 etapas): Dados (Nome completo, e-mail, telefone) → Notificações.
- **Painel do cliente** (`client-dashboard/{id}`): topo com selo "Rosto novo" ou "Frequente"; seções
  Dados pessoais (e-mail, telefone); **Próximos agendamentos** + "Histórico"; **Pacote** (ativo,
  renovar, "Enviar resumo"; estados Agendado / Aguardando cobrança / Usado / Concluído / Expirado /
  Cancelado); **Reservas** (horário fixo: "toda terça às 10:00", "a cada 2 semanas", "Reservar
  horário"); **Notas** (folha "Nova nota"; nota escrita pelo cliente não pode ser editada);
  **Notificações** (Agendamentos e Marketing × E-mail e WhatsApp, ou "Não enviar"); "Excluir cliente".
- **Histórico de agendamentos** (`…/history`): lista; tocar abre a ficha do agendamento como folha.
- **Editar dados / Editar notificações:** telas próprias; avisa quando falta e-mail ou telefone para o
  canal escolhido.

## 4. Equipe (`teammembers`)

- **Lista:** papéis Dono, Barbeiro, Recepcionista, Gerente, Outro; FAB "Adicionar profissional".
- **Criar profissional** (2 etapas): Dados pessoais → Disponibilidade; "Salvar e enviar convite" (o
  convite vai por e-mail; e-mail já cadastrado é recusado).
- **Painel do profissional:** foto (Adicionar/Trocar foto), números (Agend., Receita, Avaliação),
  Disponibilidade semanal ("Fechado"), "Adicionar disponibilidade por data", Dados pessoais, Serviços.
  **Desativar** ("não recebe novos agendamentos; os existentes ficam") e **Excluir** ("afeta os
  assentos da assinatura e bloqueia o acesso ao app"); desativado mostra "Reativar profissional".
- **Editores:** Dados; Horário semanal (por localidade, "Copiar o horário deste dia para outros
  dias", "Disponível neste dia"); Disponibilidade por data (excluir volta ao horário semanal);
  Serviços ("Selecionar todos").

## 5. Serviços, categorias e combos (`services`)

- **Lista:** agrupada por categoria, grupos recolhíveis ("Recolher %s"), "Sem categoria".
- **Criar serviço** (3 etapas): Detalhes (nome, categoria, descrição; "Quer juntar serviços? Crie cada
  um e depois combine em um combo") → **Tabela de preços** (variações: duração mínima de 5 min, preço,
  descrição) → Profissionais.
- **Painel do serviço:** números de 30 dias ("Ainda não há dados suficientes"), Preços ("Duração ·
  preço base"), Profissionais ("A equipe toda faz este serviço" / "1 membro não faz"), Regras de
  agendamento (intervalo de horários "a cada %s", tempo antes/depois), **Atendimentos simultâneos**
  (janela livre dentro da duração do serviço), Desativar ("some da página pública") e Excluir (não
  permite com agendamentos futuros); aviso de que isso desativa os combos que dependem dele.
- **Categorias:** nome + cor (Padrão, Ametista, Carmim, Esmeralda, Lagoa, Rosa, Safira, Prata, Raio de
  sol, Tangerina, Tropical); excluir move os serviços para "Outros serviços".
- **Combos:** lista ("Combine serviços com desconto"), criar em etapas (Nome → Serviços, "N de M opções"
  → **Desconto** com "Exemplo com seus preços" e "O cliente economiza %s"), opção "Sugerir no
  agendamento" (quando falta só um serviço para fechar o combo, mostra a sugestão com o preço do combo);
  combo é desativado sozinho se um serviço sair.

## 6. Localidades (`locations`)

- **Lista** e **Criar localidade** (4 etapas): Detalhes (nome, telefone público) → Endereço (CEP busca
  o endereço) → Horário de funcionamento → Comodidades (Estacionamento, Wi-fi, Acessibilidade, Cartão,
  Crianças, Pets).
- **Painel:** mapa, números, Detalhes, Horários ("Adicionar horário especial"), Comodidades, **Equipe
  disponível** ("atribuída automaticamente pela disponibilidade de cada membro"), Excluir.

## 7. Pacotes (`loyalty`)

- **Lista** ("Venda várias visitas adiantadas, com prazo para usar"); **Criar pacote** (Serviços →
  Regras: quantidade de visitas, prazo de uso 7 dias / 15 dias / 1 mês, preço com "Preço normal" e "O
  cliente economiza" → Detalhes); o preço do pacote não pode passar do preço normal; pacote igual já
  existente é recusado.
- **Painel do pacote:** vender, clientes (ativos / encerrados, "Vender de novo"), desativar (sai da
  venda, quem comprou continua usando), excluir (só sem clientes ativos).
- **Vender pacote** (fluxo interno): Cliente → Pacote → **Agendar visitas** (agendar agora, depois, ou
  deixar o cliente escolher pelo link; reservar horários futuros por ritmo semanal/quinzenal/mensal,
  com conflito marcado) → Pagamento (validade começa hoje ou na primeira visita).

## 8. Cobrança e vendas (`checkout`, `sales`)

- **Cobrança** (da ficha do agendamento, `crossFlow`): **Resumo** (cliente, serviços, "Confirme que o
  cliente veio", visita paga por pacote sem cobrança) → editar serviço (preço, profissional, promoção,
  remover) / adicionar serviço / trocar cliente → **Pagamento**: Dinheiro, Cartão de crédito, Vale-
  presente, Pix, Outro. Dinheiro abre "Valor exato / Valor recebido / Falta receber" com atalhos de
  R$ 100 e R$ 200 e o troco. Barra de totais embaixo (Total sem descontos, Descontos de promoção,
  Descontos, Acréscimo, Total, "Adicionar desconto" em R$ ou %). "Confirmar pagamento". No último uso
  do pacote, oferece "Renovar pacote?".
- **Vendas** (gaveta): lista por data; vazio explica que a venda nasce ao cobrar um atendimento.
- **Painel da venda:** "Comanda aberta" / "Pago", total recebido, editar pagamento; **Reabrir comanda**
  só para o dono; fechar com alterações pergunta antes. Venda de tipo desconhecido mostra "Atualize o
  app".

## 9. Campanhas (`marketingdashboard`)

- **Painel de promoções** (gaveta → Campanhas Promocionais): lista de campanhas (ativas, Pausada,
  Arquivada), "Criar campanha"; bloqueado até concluir o onboarding.
- **Criar campanha** (etapas, inclui Duração) e **painel da campanha** (cupom, detalhes da promoção,
  resgates desde o início, arquivar com confirmação); editores de detalhes (nome, chamada, imagem de
  capa), regras (benefício, desconto, requisitos) e duração.

## 10. Avaliações, notificações e conta

- **Avaliações** (gaveta): resumo (nota média, barras 5→1, selo "Excelente"), "Avaliações · N",
  ordenar "Mais recentes", cartão com "ver mais / ver menos" e menu Opções (Ver cliente / Ver
  agendamento); tempo relativo ("há 5 horas"); puxar para atualizar.
- **Notificações** (sino; textos **em português no código**): abas "Todas" / "Não lidas · N", "Marcar
  todas como lidas", "Tudo em dia!", "Nenhuma notificação ainda"; tempo "Há %d min", "Ontem"; detalhe com
  "Marcar como lida/não lida", "Ver avaliação", "Ver agendamento".
- **Opções da Conta:** cartão do perfil, aviso "Verifique seu e-mail", métodos de entrada (E-mail,
  Google, Facebook: Conectar / Configurar), Assinatura ("Gerenciar assinatura"), versão do app, "Sair"
  e "Excluir conta" (com confirmação). Subtelas: Acesso (trocar e-mail, definir/trocar senha; sem senha,
  entra com código), Trocar e-mail (código de 6 dígitos), Definir senha (mínimo de 8, letras e números),
  Verificar e-mail.

## 11. Negócio e agendamento (`companysettings`)

- **Informações Básicas:** nome do negócio e logotipo (quadrado), "Salvar alterações".
- **Editar link:** só minúsculas, números e hífen; link em uso / longo demais recusados.
- **Opções de Agendamento:** Agendamento (intervalo padrão de horários, antecedência máxima de 1 dia a
  3 meses), **Verificação** (cliente confirma telefone ou e-mail antes de agendar; desligar pede
  confirmação e explica o risco), Avaliações ("Pedir novas avaliações" após cada atendimento) e o
  resumo das notificações (WhatsApp, Push, E-mail; Equipe).
- **Notificações:** eventos Lembrete (até 2 horários antes), Confirmação, Remarcação, Cancelamento
  (este só por e-mail), cada um para clientes e para a equipe; **saldo de WhatsApp** ("N de M", "Só
  restam N", "Pausado até…; e-mails continuam").

## 12. Assinatura (`billing`)

- **Escolher plano** (`crossFlow`): assentos com + e −, preço base + por membro, "Todos os recursos
  incluídos" (link de agendamento, lembretes automáticos, disponibilidade personalizada, temas,
  promoções e fidelidade, indicadores), "Assinar · %s/mês"; estados "Seu teste grátis acabou" e
  "Assinatura pausada" ("Retomar assinatura").
- **Ajustar equipe:** quando o plano tem menos assentos que a equipe, marcar quem sai.
- Plano especial "Cadeira Cativa" ("Grátis para sempre").

## 13. Galeria de imagens (`media`)

Folha cheia (`crossFlow`) com abas "Minhas imagens" e "Imagens do Figaroo", "Adicionar do aparelho",
"Usar imagem"; limite de 5 MB; só JPEG ou PNG. Usada pelo Hero e pela Galeria da página e pela capa
de campanha.

## 14. O que já existe no Cortaí e onde comparar [inferência]

| Figaro | Cortaí |
|---|---|
| Onboarding (localidades → equipe → serviços → concluído) | `/barbeiro/configurar` (Negócio, Equipe, Serviços, Horários, Regras, Agendamento, Link, Pronto) e `PrimeirosPassos` |
| Clientes, painel, notas, histórico | `/barbeiro/clientes`, `/barbeiro/clientes/$id` |
| Equipe e disponibilidade | `/barbeiro/equipe`, `/barbeiro/profissionais`, `/barbeiro/horarios` |
| Serviços, categorias | `/barbeiro/servicos` (combos: sem tela própria encontrada) |
| Pacotes | `/barbeiro/fidelidade` (comparar regras antes de mexer) |
| Cobrança e vendas | comanda dentro da Agenda, `/barbeiro/caixa`, `/barbeiro/financeiro` |
| Campanhas | `/barbeiro/crescimento`, `/barbeiro/indicacoes` |
| Avaliações | `/barbeiro/avaliacoes` |
| Conta e assinatura | `/barbeiro/conta`, `/barbeiro/plano` |
| Opções de agendamento e notificações | `/barbeiro/horarios`, `/barbeiro/mais` (`PreferenciasDeAvisos`), `/barbeiro/cortai` |

Regras de negócio do Figaro (ex.: excluir serviço com agendamento futuro, verificação no agendamento,
limite de 2 lembretes) são **referência**, não decisão: mudar regra do Cortaí continua precisando do dono.
