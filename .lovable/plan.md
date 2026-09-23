# Cortaí 2.0 — Movimento, resposta ao toque e avisos

Versão atual 1.6.0 → destino 1.7.0. Nada de mexer em agenda, financeiro, WhatsApp, permissões ou regras existentes: só a camada visual e uma tabela nova de avisos.

## 1. Resposta imediata ao toque

- Todo botão e card clicável reage na hora (leve encolhida + mudança de superfície), sem esperar o servidor.
- Resposta rápida ao toque no celular já está ligada; estendo para os cards e itens de lista.
- Botão de ação demorada: trava o clique duplo, mantém a largura, mostra o girinho só depois de 0,3s e termina com um ✓ por 0,6s.
- Confirmar/cancelar atendimento, marcar como atendido, registrar venda e baixar fiado passam a mudar na tela na hora e voltar atrás sozinhos se der erro.
- Listas abrem com o desenho do conteúdo (esqueleto), nunca tela cheia girando.
- Busca de clientes espera 250ms antes de procurar; tocar num item do menu já adianta o carregamento da tela.

## 2. Movimento

Arquivo novo `src/lib/motion.ts` com os tempos e curvas (rápido 120ms, padrão 200ms, lento 280ms; molas para as folhas).

- Troca de tela: aparece com leve subida, 200ms.
- Folhas de baixo (tesoura ✂, ações da agenda): sobem com mola, fundo escurece, arrastar fecha.
- Itens de lista entram em cascata (no máximo 8).
- Confirmação de agendamento com traço de ✓ desenhado.
- Números do Início (R$ e ocupação) sobem contando em 400ms.
- Agenda abre já rolada até o próximo atendimento ou até a abertura, nunca na madrugada.
- Quem pede menos animação no aparelho recebe só o esmaecer.

## 3. Avisos em três camadas

**A. Recados rápidos (toasts):** no celular acima da barra inferior, no computador no canto superior direito, 4 segundos, no tom do Cortaí ("Pronto. Agendamento criado." / "Não deu certo. Tenta de novo?"). Cancelar e excluir passam a usar "Desfazer" por 5 segundos em vez de caixa de confirmação.

**B. Central de avisos (sininho no cabeçalho):** tabela nova `notificacoes` com barbearia, usuário, tipo, título, texto, link, lida e data, protegida para cada barbearia ver só o que é dela. Gatilhos novos (sem tocar nos existentes) criam aviso em: novo agendamento, cancelamento, remarcação, entrada na fila, fiado vencido, Voltaí completo e Pix recebido. Chegada ao vivo, pulso discreto no sininho e contador. Painel: folha de baixo no celular, lista de 380px no computador, agrupado em Hoje / Ontem / Anteriores; tocar abre o link e marca como lida; botão "Marcar todas como lidas"; vazio diz "Tudo em dia por aqui."

**C. Avisos fixos:** faixa de configuração pendente ("Faltam 2 coisas para deixar sua barbearia pronta"), que encolhe para uma pílula ao rolar e some quando concluído. Em Configurações > Notificações, escolher por tipo entre App e WhatsApp.

## 4. Visual

Mantenho a identidade atual do Cortaí (grafite, branco, dourado pontual, tipografia já em uso), cantos de 12–18px e bordas leves. O dourado só em não lidas e destaques; verde para sucesso e terracota para alerta, usando os tons já existentes.

## Detalhes técnicos

- Nova dependência: `framer-motion`. Tokens em `src/lib/motion.ts`.
- Nova tabela `public.notificacoes` com GRANTs + RLS por barbearia/usuário, tabela `notificacoes_preferencias`, e triggers `AFTER INSERT/UPDATE` novos em agendamentos, fila, fiados, fidelidade e caixa. Nenhuma migration destrutiva.
- Realtime via canal Supabase na central de avisos.
- Novos componentes: `src/components/ui/botao-acao.tsx`, `src/components/notificacoes/*` (sino, painel, item), `src/components/layout/FaixaPendencias.tsx`, `src/hooks/useContagem.ts`.
- Alterados: `Screen.tsx` (sino no cabeçalho), `__root.tsx` (posição dos toasts + AnimatePresence), `TabBar.tsx`, folhas existentes, telas de agenda/clientes/caixa para os updates otimistas.
- Custo zero: nenhuma IA envolvida.

## Testes

Dono, gerente, barbeiro e recepção; celular, tablet e computador; barbearia sem avisos; aviso chegando ao vivo; desfazer cancelamento; erro de rede com volta atrás; aparelho com menos animação; tipos e build.
