# Modo Foco como cockpit do profissional

## Resultado
O Modo Foco será uma tela operacional de relance, sempre no dia atual e em um único profissional, com alertas persistentes, tempos corretos, ações diretas e sem valores financeiros. A demonstração pública reutilizará a mesma visualização do produto em modo somente leitura.

## Implementação
1. Limpar apenas a formatação pendente da entrega anterior e reconferir a suíte antes de alterar comportamento.
2. Isolar em funções puras a escolha do atendimento atual/próximo, estados do cockpit, ordenação, contagens e progresso; considerar o fuso do negócio e os estados confirmados equivalentes a agendado.
3. Manter alertas detectados em estado até “Entendi” ou até a condição transitória acabar, limitando a dois e vibrando uma vez.
4. Fixar o Foco em hoje; selecionar automaticamente o profissional do usuário quando ele atende e oferecer seletor apenas a dono/recepção sem cadeira.
5. Reutilizar as ações oficiais da Agenda para chegada, início, falta, cancelamento, remarcação e comanda. Ações imediatas preservam o desfazer de cinco segundos; finalizar continua abrindo a comanda.
6. Extrair uma visualização pura do cockpit com topo, emergências, bloco Agora, ficha, Próximo, sequência e rodapé ergonômico. A tela real conecta dados e ações; a apresentação fornece dados fixos e botões inertes.
7. Mostrar confirmação do lembrete existente. Para aviso de atraso, usar o envio oficial quando o caminho atual permitir e cair no link do aparelho quando o canal não puder enviar.
8. Atualizar as regras permanentes da Agenda e registrar a decisão estrutural de compartilhar a visualização do cockpit.

## Qualidade
- Testar estados, alerta persistente, hoje no fuso, ordem dos próximos, atraso/tempo excedido, contagem e compartilhamento da demonstração.
- Conferir retrato 390 px e paisagem 844×390, inclusive ausência de sobreposição e alvos de toque.
- Rodar tipos, lint, suíte completa e build; corrigir tudo até passar.
- Não publicar.

## Limites seguros
- Nenhum valor financeiro aparece no Foco.
- Nenhuma regra de disponibilidade, conflito ou finalização será duplicada.
- O cache existente continua sendo a única fonte offline; dados privados não serão ampliados nele.
- Se o backend atual não registrar de forma confiável “pediu para remarcar” ou não expuser um envio operacional autenticado compatível, a interface não inventará esse estado nem criará um canal paralelo; isso será relatado como limite.
