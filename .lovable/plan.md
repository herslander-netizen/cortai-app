# Navegação móvel concentrada no menu lateral

## Objetivo
Remover a barra inferior somente no celular, devolver esse espaço às telas e tornar o menu lateral a porta única para todas as áreas, sem alterar a navegação fixa de telas maiores.

## Implementação
- Deixar `NavegacaoEquipe` responsável apenas pela lateral recolhível de desktop/tablet e retirar os estilos e reservas exclusivos da barra móvel.
- Ajustar o posicionamento compartilhado do botão “+” e da cápsula “Agora | ⇄” para a base segura da tela, preservando alinhamento e eliminando vãos na Timeline, Lista e Modo Foco.
- No menu móvel, incluir Agenda, Clientes, Financeiro e Lista de espera em “Dia a dia”, com Agenda primeiro; no desktop, evitar duplicação com a lateral fixa.
- Manter categorias expansíveis, abrindo inicialmente apenas “Dia a dia” e a categoria da tela atual, com persistência das escolhas e movimento de aproximadamente 200 ms reduzido quando solicitado pelo sistema.
- Adicionar saudação e frase diária determinística pelo fuso do negócio, usando o primeiro nome e, quando já disponível, o resumo real da agenda de hoje; manter nome do negócio, papel, status e título acessível.
- Preservar o gesto da borda esquerda para abrir o menu e o gesto no corpo da Agenda para trocar o dia, garantindo que o menu aberto detenha os próprios gestos.

## Testes e validação
- Cobrir a função pura de saudação, a presença dos antigos itens da barra no menu móvel e a ausência da barra inferior.
- Conferir caminhos de retorno para a Agenda em telas secundárias.
- Rodar tipos, lint e testes solicitados; verificar o build automático sem publicar.

## Detalhes técnicos
- A distinção móvel/desktop usará o mecanismo responsivo já adotado pelo projeto, sem depender apenas de CSS para alterar a lista do menu.
- A consulta de agenda continuará condicionada à abertura do menu e não será duplicada.
- Atualizar a regra arquitetural de navegação para registrar que a lateral desktop e o menu móvel têm responsabilidades diferentes.
