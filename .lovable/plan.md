# Preferências após o agendamento

## Objetivo
Adicionar um passo opcional após a confirmação pública para o cliente registrar preferências que já aparecem na ficha do Modo Foco, sem afetar o agendamento concluído.

## Implementação
- Criar prova de posse própria por agendamento: token aleatório forte devolvido somente na confirmação e hash persistido no agendamento.
- Criar operação pública atômica no banco que valida token, status, prazo de 24 horas e limite de cinco gravações, preenchendo apenas campos ainda vazios na ficha vinculada.
- Reutilizar `validarPreferenciasCliente`, `ROTULOS_PREFERENCIAS` e a coluna `clientes.preferencias`; nenhum dado privado será lido ou devolvido à página pública.
- Aplicar limite adicional por IP com o contador persistido já usado pelo app, sem registrar o conteúdo enviado.
- Exibir o formulário opcional após a confirmação, com seleção reversível, detalhes recolhidos, aviso de privacidade, “Salvar” e “Agora não”.
- Guardar por 90 dias, por negócio e em `try/catch`, se o aparelho respondeu ou dispensou.
- Preservar integralmente a confirmação, cancelamento, alteração, agenda e FichaFoco existentes.

## Segurança e dados
- Migração aditiva, sem apagar dados, para hash e contador do token.
- A função pública recebe apenas agendamento, token e preferências; cliente e negócio são derivados no servidor.
- Validação no aplicativo e novamente no banco; atualização protegida contra concorrência.
- Agendamentos cancelados ou mais de 24 horas após o horário serão recusados.

## Qualidade
- Testes do contrato de segurança, mesclagem atômica e limite de taxa.
- Testes da etapa opcional, dispensa, botão desabilitado e falha do armazenamento local.
- Validação de tipos, lint, testes, build e fluxo público no navegador móvel.
- Atualização da regra arquitetural em `AGENTS.md`.

## Fora desta etapa
A pergunta pelo WhatsApp só será incluída se o motor atual permitir a integração pequena, determinística e dentro da janela de atendimento; caso contrário, ficará documentada como pendente.
