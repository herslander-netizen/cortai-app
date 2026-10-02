# Cortaí vendável: teste de 45 dias sem cartão + apresentação coerente

Entrega única. Nada é apagado; nada é publicado sem sua autorização.

## Decisões que preciso confirmar (assumidas abaixo; corrija se quiser)

1. **Essencial passa a ser gratuito** (hoje custa R$ 19,90). A vitrine fica: Essencial grátis, Conecta R$ 39,90 e Studio R$ 49,90. Profissional (R$ 29,90) fica inativo no banco. A memória do projeto com os 4 preços será atualizada.
2. **Nome do plano mais completo**: hoje aparece como "Equipe". Vou exibir **"Studio"**, como no seu pedido.
3. **Limites** (fixos por plano, mostrados na página de preços):
   - Essencial grátis: 1 profissional, 40 agendamentos/mês, sem WhatsApp automático e sem Secretária.
   - Conecta: até 4 profissionais, agendamentos ilimitados.
   - Studio: até 10 profissionais, agendamentos ilimitados.
4. **Anual com 20% de desconto**: Conecta R$ 383,04/ano e Studio R$ 479,04/ano (12 × mensal × 0,8).
5. **CPF/CNPJ e telefone no cadastro**: entram como campos obrigatórios no "Criar conta" do dono, usados só para o antiabuso (guardados de forma resumida, sem expor o número).
6. **E-mails da régua**: uso o envio de e-mails do app. Se ainda não houver domínio de e-mail configurado, o aviso no app e no WhatsApp funciona e o e-mail fica pendente até o domínio existir.

## 1. Teste de 45 dias com tudo liberado
- Todo negócio novo nasce em teste de 45 dias com os recursos do Studio, qualquer que seja o plano escolhido. `dias_teste` vira 45 nos planos e a duração passa a vir de uma constante única (`DIAS_DE_TESTE`).
- Datas de início e fim já existem (`teste_inicio`/`teste_fim`); passam a ser sempre gravadas.
- Contador discreto no painel: "Teste grátis: restam X dias".
- Antiabuso: registro de testes usados por CPF/CNPJ e por telefone (resumo criptográfico). Se já usou, a conta vai direto para o Essencial grátis com aviso claro.
- Limite de WhatsApp automático durante o teste: constante (padrão 600/mês). 80% avisa o dono no sininho; 100% pausa só os envios automáticos.

## 2. Dia 46 sem bloqueio
- Rotina diária (a mesma varredura de cobrança que já roda) rebaixa testes vencidos sem pagamento para o Essencial grátis. Nenhum dado apagado.
- Recursos acima do plano ficam visíveis e travados: "Disponível no plano X" + "Assinar agora" (reaproveita o aviso de recurso bloqueado existente).

## 3. Régua de avisos
- Dias 1, 7, 30, 40 e 44: aviso no sininho + e-mail; dias 30 e 44 também no WhatsApp do dono, se cadastrado.
- Dia 30 com números reais (lembretes enviados, agendamentos pelo cliente, faltas evitadas quando houver dado).
- Dia 44 com botão direto para o Pix do plano escolhido (link Asaas gerado pelo app).
- Roda dentro das automações e da chave privada já existentes; deduplicado por negócio + dia.

## 4. Planos e preços
- Vitrine com 3 planos, preço fixo, quantos profissionais cabem e o que inclui; seletor Mensal/Anual (−20%).
- "por profissional/mês" removido de todo o app.
- Seção de preços: "45 dias grátis com tudo liberado. Sem cartão. Depois, escolha o plano."

## 5. Apresentação e entrada
- "/" mostra a apresentação para quem não está logado; logado continua indo para a própria área.
- "Começar agora" abre o cadastro direto em "Criar conta", mantendo `proximo`.
- Escolha de segmento logo após a primeira dobra; padrão Barbearia; toda a demonstração segue o segmento.
- Demonstração com a data de hoje; Marina num único horário (10:00) em todas as telas; sem perfil e seção de recursos repetidos.
- Proposta central na primeira dobra e nos recursos: lembrete automático por WhatsApp que reduz faltas.
- Textos padrão de /admin/home (hero, seções, FAQ, SEO) atualizados, com as 3 perguntas pedidas.

## 6. Onboarding do teste
- Após o cadastro: lista curta (serviços, profissionais, conectar WhatsApp, compartilhar link) com progresso e "Pular" — reaproveita os Primeiros Passos existentes.
- Serviços e durações pré-preenchidos pelo segmento, editáveis.

## Detalhes técnicos
- Migração aditiva: tabela `testes_usados` (hash de documento/telefone, tenant, data) com GRANT só para service_role e RLS; colunas novas em `tenants` para documento/telefone resumidos e contador de envios automáticos do mês; `planos_da_plataforma` atualizada (dias_teste 45, limites, preços anuais, `pro` inativo). Nada é removido.
- Acesso efetivo: enquanto `assinatura_status = 'teste'` e `teste_fim >= hoje`, `recursos_de_plano` é lido como Studio (no servidor e na função `recurso_do_tenant_ativo`).
- Pausa de envio automático entra no ponto único de envio (`conexaoDeEnvio`), sem tocar nos envios manuais.
- Testes vitest para: duração única, rebaixamento, antiabuso, limite 80/100%, preço anual, ausência de "por profissional/mês".
- Validação: tipos, lint, testes, build e conferência em 390 px e 1280 px.
