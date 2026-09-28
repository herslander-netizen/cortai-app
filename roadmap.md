# Roadmap

- [x] Aplicar identidade urbana Cortaí nos tokens e componentes compartilhados
- [x] Substituir marca e ícones PWA mantendo todos os pontos de uso
- [x] Revisar telas principais em celular e computador, claro e escuro

- [x] V3 Etapa 2: aplicar paleta neutra e destaques dessaturados por identidade
- [x] V3 Etapa 2: consolidar tokens de espaçamento, raio e estados da agenda
- [x] V3 Etapa 2: sincronizar cor do navegador e validar Agenda em 390/1280, claro/escuro

- [ ] Compactar header global: remover nome gigante da barbearia e H1 "Agenda"
- [ ] Corrigir logo escura invisível na home de início (/index, DescobrirBarbearias)
- [x] A1: fuso da barbearia na página pública de agendamento (lista de dias usava fuso do navegador)
- [x] A3: cache de permissões — RLS confirmada no banco; sessão atualiza em tempo real via tenant_usuarios
- [x] M3: desvinculado vê tela clara em /comecar (acesso desativado ou vínculo removido), sem loop
- [x] M2: recuperação de senha com resposta neutra (não revela se o e-mail existe)
- [x] B1: logo do Cortaí e da barbearia legíveis em todas as identidades e nos dois modos
- [x] B2: metatags padronizadas (og:url + canônica nas páginas públicas, noindex nas internas)

## Conversa Padrão (docs/conversa-padrao.md)
- [x] Textos padrão + variáveis + editar/desligar (conversa-padrao.ts, colunas em config_atendimento_ia)
- [x] Lista de templates Meta (docs/templates-meta.md)
- [x] 8 conversas de teste (7 passam; atraso é lacuna)
- [ ] Ligar os textos ao motor e acrescentar vocabulário
- [ ] Situações novas no motor (atraso, elogio, objeto esquecido, eventos, terceiros...)
- [ ] Seção "Conversa" no painel (textos, liga/desliga, FAQ)
- [ ] Notificações novas no agendador (horário próximo, pós-atendimento, falta, valor a pagar, aniversário)

## Agenda móvel em modo foco
- [x] Timeline móvel em tela cheia com ações diretas e menu mínimo
- [x] Leitura offline da última agenda e bloqueio seguro de ações sem conexão
- [x] Validar ações, toque longo, tela cheia e atualização ao vivo em 390 px

## Revisão barbeiro + cliente público (set/2026)
- [x] Agendamento público: busca de cliente pelo telefone (com/sem 9), horários ocupados iguais à trava do banco, "Alterar" sem duplicar, confirmação salva ao recarregar, aviso quando a barbearia não tem profissionais
- [x] Testes de disponibilidade
- [ ] Barbearias sem profissional ativo (o-barbeiro, nando-do-corte, teste) precisam cadastrar equipe para abrir agenda online
- [x] Agenda móvel: resumo do dia (faturado, faltam/atrasados, tempo médio) e finalizados recolhíveis
- [x] Confirmação pública explica alterar/cancelar e convite de conta com fidelidade
- [ ] WhatsApp: barbearias sem WhatsApp conectado — confirmações falham (precisa conectar em Integrações)
## Nova identidade visual Cortaí
- [x] Aplicar tokens Grafite/Creme e uso restrito do rosa em todo o app
- [x] Tornar escuro padrão, atualizar identidades, cliente, página pública e PWA
- [x] Migrar preferências e padrões do tenant no banco
- [x] Limpar cores fixas, atualizar documentação/novidades e validar telas em 390px
- [ ] Fechar contraste destrutivo e da landing nos dois modos
- [ ] Tratar azuis Cortaí como marca padrão e validar pares preenchidos
- [ ] Recolorir o verde-lima dos sete PNGs oficiais sem alterar o desenho

