# FLOW — Cadastro e ativação de clientes (padrão obrigatório)

Este procedimento faz parte da implantação e vale para **todos os novos estabelecimentos**. A marca não pode ficar configurada apenas no painel interno.

## Onde executar

- Repositório autorizado: `herslander-netizen/cortai-app` (Flow, antigo Cortaí).
- Banco da **prévia**: `pfkxvindedkuktogbcsv`.
- Banco da **produção**: `ibsberidejlbczxrweqg`.
- Nunca presumir que um cadastro existe nos dois bancos, nem trocar o Supabase da prévia pelo de produção.
- Sem Lovable; publicar somente pelos canais atuais de deploy do Flow, após verificação.

## Ficha de configuração

1. **Estabelecimento:** nome comercial, segmento, endereço, cidade/UF, WhatsApp, telefone, redes e fuso.
2. **Responsável:** nome e sobrenome, acesso autenticado, e-mail, vínculo ao `tenant_id` correto e papel de dono.
3. **Identidade visual:** logo aprovada (preferencialmente otimizada), cor principal HEX, cor de fundo/secundária HEX, cor de destaque HEX, capa opcional.
4. **Operação:** profissional(is), serviços com valor e duração, horários de funcionamento, intervalo e regras de agenda.
5. **Página pública:** slug, experiência (Direta/Vitrine/Conversa), textos, layout, estilo, componentes e autorização para publicar.
6. **Integrações opcionais:** WhatsApp, pagamentos, automações e recursos de plano; nunca declarar conectado sem verificar.

## Regra de aplicação automática

- Logo: enviar ao bucket `tenant-logos` dentro da pasta do próprio `tenant_id`. Guardar o caminho em `tenants.logo_url` e na marca publicada. Verificar que o arquivo existe e a URL assinada carrega.
- Paleta: persistir `tenants.cor_primaria`, `cor_secundaria`, `cor_accent` e os tokens correspondentes em `tenant_page_configs.published_config.pagina.cores`.
- Gravar também o snapshot de marca em `published_config.marca` ao publicar a identidade.
- No primeiro cadastro, aplicar as cores automaticamente. Em um estabelecimento **já implantado**, só substituir cores de página se o dono as editar expressamente; preservar cores e layouts personalizados.
- Nunca sobrescrever um `draft_config` pendente nem resetar suas configurações de chat, agenda, layout ou componentes.
- Na página de agendamento, a paleta personalizada deve prevalecer sobre cores genéricas da plataforma.
- Verificar a autorização e o isolamento multi-tenant antes de gravar. Não usar caminho de logo de outro tenant.
- A identidade básica não deve depender do recurso pago `branding_avancado`; recursos avançados respeitam as capacidades do plano.

## Aceite de entrega: não marcar "configurado" sem passar

- Dados do dono e vínculo ao negócio correto conferidos.
- Logo existente e acessível por URL autorizada; sem imagem quebrada.
- Cores publicadas conferidas com a ficha (incluindo o botão do agendamento).
- Página `/b/{slug}` e fluxo `/agendar/{slug}` abrem no ambiente correto.
- Layout testado em pelo menos 390 px e 1280 px.
- Serviço, profissional e horário reais exibidos no agendamento; sem duplicação de estabelecimentos por engano.
- Rascunhos e outros tenants intactos.
- Confirmar a publicação em prévia e obter autorização separada para mudanças em produção.

**Em caso de falha:** registrar etapa e diagnóstico real, não afirmar que o cliente está pronto; corrigir no próprio tenant, sem apagar contas, dados ou configurações já existentes.
