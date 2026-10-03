# Auditoria de funcionalidades do Cortaí e proposta do Painel de Funcionalidades

Somente diagnóstico. Nenhum arquivo, dado ou migração foi ou será alterado ao aprovar este documento. Aprovar serve só para registrar a auditoria; a construção do painel exige um pedido separado.

## 1. Como o acesso funciona hoje

```text
plano (recursos_de_plano) + interruptor do negócio (recursos_do_tenant, ausente = ligado) + permissão da pessoa
```
- Matriz de planos: 14 recursos em `src/lib/planos.ts` (loja_online, produtos_estoque, fidelidade, fila_espera, indicacoes, crescimento, agendamento_manual, personalizacao_cliente, branding_avancado, modo_foco, comanda_caixa, historico_completo, secretaria_whatsapp, equipe_avancada).
- O catálogo de capacidades (`src/lib/capacidades.ts`) já calcula os estados "Ativado / Disponível / Não incluído / Sem permissão". É a base natural do painel.
- Também existem interruptores soltos, espalhados em telas próprias: `tenants.loja_ativa`, `indicacao_ativa`, `lista_espera_automatica`, `aceita_encaixe`, `listada`, `assinatura_visivel`; o liga/desliga do Voltaí (`regras_de_plano` tipo fidelidade); e cerca de 15 chaves em `config_atendimento_ia` (responder_whatsapp, confirmacao_automatica, lembretes, recuperacao_ativa, saudacao_ativa, permite_cancelar/remarcar/confirmar, pagamento_antecipado, encaminhamento_humano, situacoes_desligadas).
- Problema principal: não existe um lugar único para ver o que está ligado. Cada interruptor mora numa tela diferente.

## 2. Inventário e classificação

Legenda: C = obrigatória (core) · O = opcional, pode ser desligada · D = depende de configuração · I = interna/admin

| Funcionalidade | Tipo | Evidência principal |
|---|---|---|
| Agenda (Timeline/Lista, troca de dia, toque longo) | C | barbeiro.agenda / AgendaOperacional, useAgendaDia |
| Motor de disponibilidade, bloqueios, escalas | C | disponibilidade.ts, ocupacoes-extras.server.ts |
| Serviços e preços | C | barbeiro.servicos |
| Horários de funcionamento | C | barbeiro.horarios |
| Clientes e perfil (ficha, preferências, fotos) | C | barbeiro.clientes.*, cliente-perfil/* |
| Profissionais | C | barbeiro.profissionais |
| Notificações no sino | C | notificacoes, criar_notificacao |
| Página pública /b/$slug + agendamento /agendar/$slug | C/D (exige slug) | agendar.$slug.tsx, agendamento-publico.functions |
| Novo agendamento manual / encaixe | O (plano agendamento_manual; tenants.aceita_encaixe) | AgendamentoManual.tsx |
| Modo Foco (cockpit) | O (plano modo_foco) | cockpit-foco.ts, CockpitFoco |
| Fila de chegada (sem hora marcada) | O (fila_espera) | barbeiro.fila, entrar_na_fila_publica |
| Lista de espera com oferta automática de vaga | O (lista_espera_automatica) | fila-ofertas.server.ts, /vaga/$token |
| Comanda, caixa, Pix, fiado | O (comanda_caixa) | barbeiro.caixa, FechamentoComanda |
| Comissões, relatórios financeiros | O, depende do caixa | barbeiro.comissoes, barbeiro.financeiro |
| Carteira do cliente (créditos/saldo) | O, depende do caixa | carteira.functions, app.carteira |
| Planos de crédito / limite de fiado | O | regras_de_plano, bloqueia_agendamento_no_limite |
| Voltaí (fidelidade) | O | barbeiro.fidelidade, fidelidade.functions |
| Indicações | O (indicacao_ativa) | barbeiro.indicacoes |
| Avaliações e recuperação de nota baixa | O | barbeiro.avaliacoes, avaliar.$token |
| Crescimento / desempenho 7 dias | O (crescimento) | barbeiro.crescimento, FaixaDesempenho |
| Divulgar nas redes (novo) | O | barbeiro.divulgar |
| Produtos e estoque | O (produtos_estoque) | barbeiro.produtos |
| Loja online | O, depende de produtos (loja_ativa) | loja.$slug |
| Secretária Cortaí / WhatsApp | O/D (Conecta + conexão) | whatsapp/*, barbeiro.cortai |
| Confirmação, lembrete, pós-atendimento | O/D, dependem do WhatsApp | config_atendimento_ia |
| Cortaí Chat (agendamento por conversa) | O (formato da página) | conversa/*, ChatShell |
| CortAI (assistente) | O | AssistenteCortai, IconeDaIA |
| Push no celular | D (cada pessoa ativa no aparelho) | lib/push/*, AtivarAvisosNoAparelho |
| Personalização da página / temas / identidade | O (branding_avancado, personalizacao_cliente) | barbeiro.marca, barbeiro.temas |
| Equipe e permissões | O (equipe_avancada) | barbeiro.equipe |
| Aparecer na busca de negócios | O (listada) | barbearias.tsx, DescobrirBarbearias |
| Preferências após o agendamento | O | PreferenciasAposAgendamento |
| Onboarding / Primeiros passos / guias | C no começo, O depois | PrimeirosPassos, GuiaProvider |
| PWA: instalação e manifest | D (escolha do usuário) | ConviteDeInstalacao, manifestDaRota |
| Atualização obrigatória / aviso de versão | I (plataforma) | AtualizacaoObrigatoria, versao.json |
| Cookies e privacidade | C legal (o usuário escolhe) | BannerDeCookies, privacidade.tsx |
| Assinatura, teste grátis, Asaas | I | barbeiro.plano, admin.asaas |
| Admin da plataforma (home, apresentação, recursos, parceiros) | I | admin.* |

## 3. Pontos de atrito se forem obrigatórios

- Voltaí: muda preço efetivo e cria promessa ao cliente. Já é desligável, mas fica escondido na própria tela.
- Fiado / limite de crédito: `bloqueia_agendamento_no_limite` é a única regra que hoje pode impedir um cliente de agendar. Precisa ficar explícita no painel.
- WhatsApp automático (lembretes, recuperação, saudação): mexe com consentimento e tem custo por envio.
- Lista de espera automática: manda mensagem a terceiros sem ação do dono.
- Avaliações públicas, indicações, loja online e aparecer na busca: expõem o negócio.
- Comanda obrigatória ao finalizar: a regra de que finalizar sempre abre a comanda atrapalha quem não usa caixa.
- Convites de push e de instalação: viram incômodo se aparecerem demais.
- Preferências após o agendamento: um passo a mais para o cliente.

## 4. Proposta do Painel de Funcionalidades (para o dono)

Lugar: Ajustes > "Funcionalidades". Cada linha tem nome, uma frase de descrição, interruptor e estado ("Incluído no seu plano" ou "Disponível no Conecta"). Um recurso fora do plano aparece sem interruptor e sem popup de venda.

1. **Atendimento:** Encaixes · Modo Foco · Fila de chegada · Lista de espera automática
2. **Página e agendamento:** Agendamento pelo cliente · Agendar por conversa · Preferências após agendar · Aparecer na busca
3. **Comunicação:** Secretária no WhatsApp · Confirmação automática · Lembretes · Mensagem pós-atendimento · Recuperação de clientes sumidos
4. **Dinheiro:** Comanda e caixa · Comissões · Carteira do cliente · Fiado (com a opção "bloquear agendamento no limite")
5. **Relacionamento:** Voltaí · Indicações · Avaliações
6. **Vendas e divulgação:** Produtos e estoque · Loja online · Divulgar nas redes
7. **Visual:** Personalização avançada · Temas
8. **Equipe:** Acessos e permissões

Ficam fora do painel: Agenda, serviços, horários, clientes, profissionais, sino, privacidade, atualização do app, assinatura.

## 5. Dependências

```text
Loja online         -> Produtos e estoque
Comissões, Carteira, Fiado, Pix -> Comanda e caixa
Lembretes, Confirmação, Pós, Recuperação, oferta de vaga por WhatsApp -> Secretária WhatsApp (+ conexão)
Lista de espera automática -> Fila/lista de espera (pode funcionar por link /vaga sem WhatsApp)
Agendar por conversa, Preferências após agendar -> Agendamento pelo cliente
Avaliações (convite) -> funciona pelo link; WhatsApp é opcional
Voltaí -> Comanda (crédito na finalização); não depende da agenda
```
Regras: desligar o recurso principal desativa os dependentes, com aviso. Desligar nunca apaga dados nem cancela o que já foi enviado (o mesmo padrão da lista de espera). Religar retoma de onde parou.

## 6. Quem vê o quê

- Dono (gerenciar_permissoes ou alterar_dados_barbearia): todo o painel.
- Profissional e recepção: não veem o painel; só sentem o efeito (menus e ações somem).
- Cliente: nunca vê interruptores; vê apenas a ausência do recurso (sem cartão Voltaí, sem loja, sem botão de lista).
- Admin da plataforma: continua com a matriz de planos (`/admin/recursos`) e com a versão mínima, fora do painel do dono.

## 7. Padrões recomendados (sem mudar nada agora)

- Ligado: encaixes, Modo Foco, agendamento pelo cliente, lista de espera automática (como já é), avaliações, confirmação automática.
- Desligado até o dono ativar: Voltaí, indicações, loja online, fiado com bloqueio, recuperação de clientes, preferências após agendar, divulgar, aparecer na busca.
- Comanda: ligada para quem tem caixa. Avaliar uma opção "finalizar sem comanda" quando o caixa estiver desligado; hoje a regra da Agenda obriga abrir a comanda.

## 8. Voltaí (fidelidade)

- Verificado: o agendamento só lê a regra de fidelidade para mostrar o progresso (`agendamento.functions.ts` linhas 69–92; `app.agendar.tsx` linhas 310–324). Nenhum caminho bloqueia agenda ou agendamento por causa do Voltaí.
- Já existe exceção por cliente (`clientes.fidelidade_participa`) e o desligamento preserva o progresso.
- O crédito acontece só na comanda (`creditar_fidelidade_da_comanda`). Uma falha ali não deve impedir fechar a comanda. Não confirmei isso na leitura; recomendo confirmar antes de construir o painel.
- Atenção: a única trava de agendamento ligada a cartões e créditos é o fiado (`bloqueia_agendamento_no_limite`), e não o Voltaí.

## 9. Atualização obrigatória do PWA

- É mecanismo da plataforma: `versao.json` (minima/atual), AtualizacaoObrigatoria e AvisoDeVersao em `__root`, controle só pelo admin, regra registrada em AGENTS.md.
- Não deve aparecer no Painel de Funcionalidades nem depender de plano, interruptor ou permissão do negócio.
- Também ficam fora do painel o convite de instalação e o de push: são escolhas de cada pessoa no aparelho, não do negócio.

## Limites desta auditoria

Feita só pela leitura do código e dos tipos do banco, sem abrir as telas com uma conta de dono (a conta de teste é admin). Os itens marcados como "não confirmado" precisam ser checados antes de construir o painel.
