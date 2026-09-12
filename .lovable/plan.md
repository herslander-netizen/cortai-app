# Tela Marca

## O que será criado
- Adicionar “Marca” à navegação do painel do barbeiro e criar uma tela única, organizada em seções.
- Permitir editar dados da barbearia, redes sociais, tema, paleta própria e textos exibidos aos clientes.
- Mostrar uma prévia compacta do app do cliente sem alterar layout, fonte ou espaçamento.
- Enviar logo PNG quadrada para o armazenamento da Lovable Cloud, com validação e placeholder “SUA LOGO”.
- Aplicar as três cores salvas somente nas telas do app do cliente daquela barbearia.
- Manter versões anteriores da marca, com data e ação de restaurar.
- Manter a assinatura ligada e bloqueada no plano Essencial; permitir desligar nos planos Pro e Studio.

## Dados e segurança
- Criar uma tabela de histórico de marca vinculada à barbearia, com acesso restrito aos membros dela.
- Criar uma área pública de armazenamento exclusiva para logos, com envio restrito a membros da barbearia.
- Salvar uma versão antes de cada alteração ou restauração.
- Usar os campos de marca já existentes na barbearia para a configuração atual.

## Detalhes técnicos
- A tela usará os controles e tokens visuais existentes, em formato mobile-first.
- A atualização e a restauração serão feitas no servidor e validarão os valores recebidos.
- A logo terá limite de tamanho e aceitará somente PNG; largura, altura e transparência serão verificadas antes do envio.
- A configuração será carregada no layout do cliente e convertida em variáveis de cor com contraste protegido.
- A tela terá metadados próprios e será verificada no celular e no desktop.
