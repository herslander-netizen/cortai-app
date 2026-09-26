# Roadmap

- [ ] Aplicar identidade urbana Cortaí nos tokens e componentes compartilhados
- [ ] Substituir marca e ícones PWA mantendo todos os pontos de uso
- [ ] Revisar telas principais em celular e computador, claro e escuro

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
