# Páginas de configuração do Figaro e o que o Cortaí tem (24/10/2026)

Fonte: código descompilado do APK de 23/10 (`accountsettings`, `companysettings`, `sales/ui/paymentoptions`) e os textos de `strings.xml`.
Os tokens de layout são os de `1-design-system.md` (§3 formas, §4 espaços, §6.6 linhas). Textos abaixo em português do Cortaí.

## 1. Peças comuns (todas as telas de configuração)

| Peça Figaro | Valor | No Cortaí |
|---|---|---|
| `FigarooCollapsingHeaderScaffold` | título grande + descrição, encolhe ao rolar | `Screen` (título fixo; **C15 ainda não feito**) |
| `FigarooSectionHeader` (Form) | 13/18 semibold, espaçado, topo 32 / base 8 | `SecaoDeConfiguracao` |
| `FigarooListGroup` + `FigarooListRow` | cantos externos 28 dp, internos 4 dp, 2 dp entre linhas; linha ≥ 56 dp; ícone líder 48 dp em círculo `primaryContainer`; título 15/20 semibold; apoio `bodyMedium`; fim = valor, seta ou `FigarooSwitch` | `GrupoDeLinhas`, `LinhaDeConfiguracao`, `LinhaComInterruptor` (novos, `ui/formulario/LinhasDeConfiguracao.tsx`) |
| Linha que abre seletor | folha de baixo com uma linha por opção e ponto de rádio | `LinhaDeOpcoes` (novo) |
| Cartão de perfil / aviso de verificação | cantos 28 dp | `CartaoDePerfil`, `AvisoDeConfiguracao` (novos) |
| `FigarooExtendedFAB` "Salvar alterações" | só nas telas de formulário (Informações básicas, Notificações, Senha) | `BotaoFab` |
| `FigarooCreationFlowScaffold` + `FigarooHeroHeader` | telas de fluxo curto (trocar e-mail, verificar e-mail, acesso) | `TelaDeFormulario` |

## 2. Telas, uma a uma

| # | Tela (entrada) | Estrutura no Figaro | Cortaí hoje | Estado |
|---|---|---|---|---|
| 1 | **Opções da conta** (gaveta) | Título "Detalhes da conta"; cartão de perfil (avatar, nome, papel Proprietário/Gerente/Equipe); aviso "Verifique seu e-mail"; **Formas de entrar** (E-mail, Google, Facebook: Conectar/Configurar/Desconectado); **Assinatura** (nome do plano, valor/mês, "Gerenciar assinatura"); versão (7 toques = modo dev); "Sair" e "Excluir conta" com confirmação | `/barbeiro/conta` | **Refeita 24/10:** perfil, aviso de e-mail com reenvio, E-mail + Alterar senha, Assinatura, Seu negócio, Aparência e aplicativo, versão, Sair. **Falta:** Google (estado de conexão), "Excluir conta" |
| 2 | Acesso (e-mail) | "Configurações de e-mail": Trocar e-mail, senha (definir/trocar), selo Verificado | senha dentro da Conta (`AlterarSenha`) | Parcial: trocar e-mail e "entrar com código" não existem |
| 3 | Trocar e-mail | Herói + campos "E-mail atual"/"Novo e-mail" + "Verificar" (código de 6 dígitos) | não existe | **Falta** (precisa fluxo de código no Auth) |
| 4 | Definir/Trocar senha | Cabeçalho que encolhe, "Senha atual", "Nova senha", dica (8+, letras e números), FAB "Salvar senha" | `AlterarSenha` (formulário na linha) | Funciona; falta virar tela |
| 5 | Verificar e-mail | Herói "Verifique sua caixa de entrada", código de 6 dígitos, reenviar em N s | só reenvio de link | **Falta** (código) |
| 6 | **Informações básicas** (gaveta) | Descrição; seção Logo (quadrada, Adicionar/Excluir); seção "Informações básicas" com "Nome do negócio"; FAB "Salvar alterações" | antes só na configuração inicial | **Nova 24/10:** `/barbeiro/negocio` (logo pela galeria, nome, WhatsApp) |
| 7 | Editar link | Campo "Link da página" (`meu-negocio`), dica, erros (obrigatório, em uso, longo, formato) | editor da página (`SecaoLink`) | Existe dentro de Personalizar Página; falta tela própria |
| 8 | **Opções de agendamento** (gaveta) | **Agendamento** (Intervalo padrão dos horários → folha; Antecedência máxima, slider 1 dia–3 meses), **Verificação** (exigir confirmar telefone/e-mail; desligar pede confirmação), **Avaliações** (Pedir novas avaliações), resumo de **Notificações** (WhatsApp/Push/E-mail × Clientes/Equipe) | regras só na configuração inicial | **Nova 24/10:** `/barbeiro/agendamento` (intervalo, antecedência máxima, mínima, cancelamento, intervalo entre atendimentos, encaixe; salva na hora). **Falta:** Verificação, Avaliações, resumo de notificações |
| 9 | **Notificações** | Eventos Lembrete (até 2 horários antes), Confirmação, Remarcação, Cancelamento (só e-mail), cada um para Clientes e Equipe; folha por canal; saldo de WhatsApp ("N de M", "Só restam N", "Pausado até…"); "Descartar alterações?" | `/barbeiro/automacao` (Central de automação do WhatsApp) + `PreferenciasDeAvisos` (pessoais) | Existe com outro desenho; **a refazer** (lote 2) |
| 10 | **Opções de pagamento** | Seção **Taxas** por forma (Dinheiro, Cartão, Pix…): percentual (máx. 100%) ou valor fixo, "Remover taxa"; nota "a taxa é aplicada no fechamento, o cliente paga o mesmo total"; só o dono altera | não existe | **Decisão do dono** (regra de negócio + migração) |
| 11 | Assinatura | Escolher plano (assentos), ajustar equipe | `/barbeiro/plano` | Existe (459 linhas), desenho próprio; a conferir |
| 12 | Personalizar Página e editores | ver `4-pagina-publica.md` | `/barbeiro/marca`, `/barbeiro/sua-pagina` | Quase tudo feito (§8 de `10-`) |
| 13 | Modo desenvolvedor | 7 toques na versão | — | Não se aplica |

## 3. O que foi feito em 24/10 (lote 1)

- Peças novas e testadas: `GrupoDeLinhas`, `LinhaDeConfiguracao`, `LinhaComInterruptor`, `LinhaDeOpcoes`, `SecaoDeConfiguracao`, `CartaoDePerfil`, `AvisoDeConfiguracao`.
- **Ajustes** (`/barbeiro/mais`) reorganizado em grupos "Seu negócio" e "Conta" com as telas acima; o menu lateral (`DrawerAjustes`) ganhou
  "Informações básicas" e "Opções de agendamento".
- **Opções da conta**, **Informações básicas** e **Opções de agendamento** no desenho do Figaro (listas em grupo, linhas de 56 dp, ícone em círculo).
- Os blocos antigos que sobraram na Conta (tema do aplicativo, instalar, segurança, dicas, privacidade) entram em cartão de 28 dp (`.cartao-config`) até virarem linhas.

## 4. Pendências e decisões

1. **Opções de pagamento / taxa por forma**: regra de negócio e migração (acréscimo). Precisa de decisão e autorização.
2. **Verificação no agendamento** e **Pedir novas avaliações**: o Cortaí já tem confirmação de telefone no agendamento público e envio de pedido de avaliação; falta ligar os interruptores a esses dados (conferir colunas antes).
3. **Notificações** (lote 2): refazer em eventos × clientes/equipe com saldo de WhatsApp, usando os dados da Central de automação.
4. **Trocar e-mail / Verificar e-mail / entrar com código**: dependem do Auth do Supabase (fluxo de código de 6 dígitos).
5. **Excluir conta**: apaga dados; só com decisão do dono (AGENTS.md).
6. **Cabeçalho que encolhe (C15)** em todas as telas de configuração.
