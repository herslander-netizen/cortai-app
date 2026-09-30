# Refinamento comercial e visual do Cortaí

## Objetivo
Consolidar `/apresentacao` como a única apresentação comercial pública do Cortaí, preservando o showroom real já existente e tornando a página adequada para compartilhamento por Instagram, WhatsApp e QR Code.

## Implementação
- Transformar o showroom atual em uma página comercial contínua, com navegação por âncoras suaves e seções de Agenda, Modo Foco, Clientes, Secretária, Comanda/Caixa, segmentos, planos, FAQ e chamada final.
- Reutilizar as demonstrações atuais de Agenda, Modo Foco, cliente, chat e comanda como estados seguros e não persistentes; não executar ações reais.
- Manter a escolha temporária de segmento para adaptar exemplos, sem criar uma segunda apresentação nem remover a identidade conversacional já aprovada.
- Conectar “Conhecer o Cortaí” aos recursos, “Ver planos” à tabela oficial e “Comece a organizar seu negócio” ao fluxo existente `/login?proximo=/comecar`.
- Usar o contato comercial já configurado para “Quero falar com alguém”; quando indisponível, não inventar número ou integração.
- Manter os quatro planos e recursos exatamente como definidos em `planos-comerciais.ts`. Como a unidade atual do produto é mensal por plano, preservar `/mês` e não introduzir “por profissional” sem regra comercial existente.
- Preservar Admin > Marketing com abrir, copiar link, QR Code e compartilhar, atualizando a descrição para a apresentação comercial consolidada.

## Refinamento visual seguro
- Auditar rapidamente login/cadastro, onboarding, Agenda, Modo Foco, Clientes, Secretária, Comanda/Caixa, planos e Admin > Marketing em 390 px e 1280 px.
- Corrigir somente inconsistências confirmadas e locais: contraste, hierarquia, espaçamento, truncamento, overflow, botões, estados vazios e navegação redundante.
- Preferir ajustes nos componentes e estilos compartilhados existentes; não redesenhar módulos estáveis nem criar componentes paralelos.

## Proteções preservadas
- Verificar, sem enfraquecer, as travas atuais de WhatsApp, Secretária, agendamento pelo cliente, Modo Foco, comanda/caixa e gestão avançada de equipe.
- Não alterar disponibilidade, conflitos de agenda, autenticação, isolamento por negócio, RLS, banco, preços operacionais ou regras financeiras.
- Não criar migração nem dados persistentes para a apresentação.

## Validação
- Testar âncoras, links, CTAs, contato comercial, navegação e compartilhamento da apresentação.
- Validar visualmente `/apresentacao` e as telas públicas/operacionais acessíveis em 390 px e 1280 px.
- Rodar TypeScript, lint dos arquivos alterados, testes disponíveis e build; conferir também os diagnósticos do preview.
- Deixar tudo pronto para publicação, sem publicar ou fazer deploy nesta execução.
