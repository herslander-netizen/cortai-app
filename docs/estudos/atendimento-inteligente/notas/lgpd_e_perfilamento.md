# LGPD, ANPD, regras do WhatsApp e conselhos profissionais aplicados a perfis comportamentais, previsões e recomendações automáticas num SaaS multi-negócio de atendimento e agendamento (estado em 06/11/2026)

> **Isto não é parecer jurídico.** Onde aparece **(revisão jurídica)**, a conclusão depende de advogado ou de encarregado (DPO).
>
> **Legenda de status:** **[LEI]** lei em vigor · **[REG]** regulamento vinculante (ANPD ou conselho profissional) · **[GUIA]** orientação ou documento oficial sem força de lei · **[PL]** projeto de lei (não é lei) · **[META]** política ou termo contratual da plataforma · **[SEC]** fonte secundária (escritório, imprensa, blog, fornecedor), a usar com cautela.
>
> **Método e limites:** o site do Planalto respondeu "Acesso Negado" a todas as consultas automatizadas desta sessão. Os trechos da LGPD, do CDC, do Marco Civil, do ECA, da Lei 13.787/2018, da Lei 9.294/1996 e das LCs 123/2006 e 182/2021 foram citados **de memória do texto compilado oficial, sem reconferência online**. Antes de usar em documento formal, reconferir no link indicado. Foram **baixados e conferidos literalmente**: a Res. CD/ANPD nº 2/2022 (DOU), o Guia de Legítimo Interesse da ANPD (fev/2024), a Nota Técnica nº 12/2025 da ANPD e o texto do PL 2338/2023 tal como chegou do Senado à Câmara (apresentação em 17/03/2025). As páginas da Meta foram lidas na versão online de nov/2026.

## 1. LGPD aplicada a perfis, previsões e recomendações: bases legais, princípios, art. 12 §2, art. 20, dados sensíveis, crianças, controlador × operador, RIPD, retenção, direitos e incidentes

### Takeaway
O perfil comportamental de um cliente identificado é dado pessoal (art. 12 §2). Quando o perfil revela saúde, vida sexual, origem racial ou outro dado sensível, entra no regime do art. 11 (§1). Em clínicas, odontologia, estética e parte das academias, isso elimina o legítimo interesse e a execução de contrato como bases: passa a ser preciso consentimento específico e destacado, ou outra hipótese estrita do art. 11.

Fora da saúde, a divisão é esta:
- Lembretes cabem em execução de contrato.
- Perfis e sugestões de retorno podem usar legítimo interesse, desde que haja teste de balanceamento por finalidade, transparência e oposição fácil.
- Decisões que afetem o cliente e se baseiem só em tratamento automatizado dão direito a revisão e a explicação dos critérios (art. 20). A revisão por pessoa natural foi vetada.

O SaaS é o operador: responde solidariamente se sair das instruções do negócio, que é o controlador (art. 42 §1 I).

### Cited Findings

**Natureza do perfil e das inferências**
- **[LEI]** Art. 12 §2: "Poderão ser igualmente considerados como dados pessoais, para os fins desta Lei, aqueles utilizados para formação do perfil comportamental de determinada pessoa natural, se identificada". O *caput* exclui os dados anonimizados, "salvo quando o processo de anonimização ao qual foram submetidos for revertido ... ou quando, com esforços razoáveis, puder ser revertido" — [LGPD (Planalto)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Art. 11 §1: o regime de dados sensíveis se aplica "a qualquer tratamento de dados pessoais que revele dados pessoais sensíveis e que possa causar dano ao titular". A **inferência** também é regulada, não só o dado coletado — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Art. 5º II: são sensíveis os dados sobre origem racial ou étnica, convicção religiosa, opinião política e filiação a sindicato ou a organização religiosa, filosófica ou política; também o "dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a uma pessoa natural" — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Princípios (art. 6º)**
- **[LEI]** Finalidade (I): propósitos legítimos, específicos, explícitos e informados, sem tratamento posterior incompatível. Adequação (II). Necessidade (III), que o guia da ANPD transcreve como "limitação do tratamento ao mínimo necessário para a realização de suas finalidades, com abrangência dos dados pertinentes, proporcionais e não excessivos em relação às finalidades do tratamento de dados" — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm); [Guia de Legítimo Interesse, ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[LEI]** Também se aplicam:
  - qualidade dos dados (V): exatidão, clareza, relevância e atualização, o que pesa diretamente sobre previsões;
  - transparência (VI), "observados os segredos comercial e industrial";
  - **não discriminação** (IX): "impossibilidade de realização do tratamento para fins discriminatórios ilícitos ou abusivos";
  - responsabilização e prestação de contas (X).

  — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Art. 46 §2: as medidas de segurança devem ser observadas "desde a fase de concepção do produto ou do serviço até a sua execução", ou seja, privacidade desde a concepção — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Bases legais (arts. 7º, 8º, 9º e 10)**
- **[LEI]** Art. 7º:
  - I: consentimento;
  - V: execução de contrato ou de procedimentos preliminares, a pedido do titular;
  - VIII: tutela da saúde, exclusivamente em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária;
  - IX: legítimo interesse do controlador ou de terceiro, "exceto no caso de prevalecerem direitos e liberdades fundamentais do titular".

  — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Consentimento é "manifestação livre, informada e inequívoca ... para uma finalidade determinada" (art. 5º XII). Autorizações genéricas são nulas (art. 8º §4). A revogação pode ocorrer a qualquer momento, "por procedimento gratuito e facilitado" (art. 8º §5) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Art. 10: o legítimo interesse só fundamenta tratamento "para finalidades legítimas, consideradas a partir de situações concretas". Isso inclui:
  - I: "apoio e promoção de atividades do controlador";
  - II: "prestação de serviços que o beneficiem, respeitadas as legítimas expectativas dele".

  Os parágrafos trazem limites:
  - §1: só os dados "estritamente necessários" podem ser tratados (redação confirmada literalmente no guia da ANPD);
  - §2: o controlador deve adotar medidas de transparência;
  - §3: a ANPD pode pedir RIPD.

  — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm); [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[LEI]** Art. 9º: o titular tem direito a informação "clara, adequada e ostensiva" sobre a finalidade específica, a forma e a duração do tratamento, a identificação e o contato do controlador, o uso compartilhado, as responsabilidades dos agentes e os seus direitos — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Dados sensíveis (art. 11)**
- **[LEI]** Só podem ser tratados com consentimento "de forma específica e destacada, para finalidades específicas" (I). Sem consentimento, só quando indispensável para, entre outros:
  - obrigação legal ou regulatória (II a);
  - exercício regular de direitos, inclusive em contrato (II d);
  - proteção da vida (II e);
  - tutela da saúde, exclusivamente por profissionais de saúde, serviços de saúde ou autoridade sanitária (II f);
  - prevenção à fraude e segurança do titular em identificação e autenticação de cadastro em sistemas eletrônicos (II g).

  — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[GUIA]** Para a ANPD, o legítimo interesse é "hipótese legal não aplicável ao tratamento de dados pessoais sensíveis, haja vista a sua previsão apenas no art. 7º da lgpd, não tendo sido reproduzida no art. 11". O guia dá o exemplo de dados de pacientes: é preciso colher o consentimento do paciente, "quando possível", ou "encontrar outra hipótese legal" — [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[LEI]** Art. 11 §4 (redação da Lei 13.853/2019): é vedado comunicar ou compartilhar entre controladores dados de saúde "com objetivo de obter vantagem econômica". As exceções são a prestação de serviços de saúde e de assistência farmacêutica em benefício do titular, para portabilidade e para transações financeiras e administrativas — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Crianças e adolescentes (art. 14)**
- **[LEI]** O tratamento segue o melhor interesse do menor. Para dados de crianças, exige consentimento específico e em destaque de ao menos um dos pais ou do responsável (§1). A participação em atividades não pode depender de dados além do estritamente necessário (§4), e a informação deve ser simples, clara e acessível (§6) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm). Pelo ECA, criança é a pessoa de até 12 anos incompletos; adolescente, entre 12 e 18 anos (art. 2º) — [ECA (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm)
- **[GUIA]** Enunciado CD/ANPD nº 1, de 22/05/2023: dados de crianças e adolescentes podem ser tratados "com base nas hipóteses legais previstas no art. 7º ou no art. 11", desde que o melhor interesse seja observado e prevaleça. Se a base for o legítimo interesse, o registro do teste deve demonstrar três pontos:
  - (i) o que foi considerado o melhor interesse;
  - (ii) os critérios da ponderação;
  - (iii) que não há riscos desproporcionais.

  Se o teste for inconclusivo ou faltarem salvaguardas, "deverá ser adotada outra base legal" — [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** Caso do guia: um app educacional usa dados de crianças para direcionar publicidade. O legítimo interesse "não será a hipótese legal mais apropriada", porque "não há legítima expectativa do titular quanto ao tratamento de seus dados pessoais para fins publicitários". Usar dados de crianças é critério de alto risco e, nesse caso, o RIPD deve ser feito "independentemente da realização do teste de balanceamento" — [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)

**Decisões automatizadas e perfilamento (art. 20)**
- **[LEI]** Art. 20, na redação da Lei 13.853/2019: o titular pode pedir revisão de decisões "tomadas unicamente com base em tratamento automatizado" que afetem seus interesses, "incluídas as decisões destinadas a definir o seu perfil pessoal, profissional, de consumo e de crédito ou os aspectos de sua personalidade". Os parágrafos completam:
  - §1: o controlador fornece, quando solicitado, "informações claras e adequadas a respeito dos critérios e dos procedimentos utilizados", observados os segredos comercial e industrial;
  - §2: sem essas informações, a ANPD pode auditar "aspectos discriminatórios";
  - §3, que exigia revisão por pessoa natural, foi **vetado**.

  — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[GUIA]** A consolidação da tomada de subsídios sobre IA registra a visão de parte dos contribuintes: "A LGPD não exige revisão humana, mas os argumentos do titular devem ser analisados. A revisão pode ser feita por humanos ou máquinas". Outros defendem escalar para revisão humana em casos complexos ou contestados. A própria ANPD lembra que a tomada de subsídios "não representa o posicionamento final da ANPD" — [Nota Técnica nº 12/2025, ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts-06-2024-nt-12-2025-consolidacao-das-contribuicoes.pdf/@@display-file/file)
- **[LEI]** Art. 19 II: a declaração completa ao titular, em até 15 dias, indica "a origem dos dados, a inexistência de registro, os critérios utilizados e a finalidade do tratamento" — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Controlador × operador**
- **[LEI]** Controlador é aquele a quem "competem as decisões referentes ao tratamento" (art. 5º VI). Operador é quem "realiza o tratamento de dados pessoais em nome do controlador" (art. 5º VII) e "deverá realizar o tratamento segundo as instruções fornecidas pelo controlador" (art. 39). Ambos mantêm registro das operações, "especialmente quando baseado no legítimo interesse" (art. 37) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Art. 42 §1 I: o operador responde solidariamente pelos danos "quando descumprir as obrigações da legislação de proteção de dados ou quando não tiver seguido as instruções lícitas do controlador", e nesse caso se equipara ao controlador — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[GUIA/SEC]** Pelo Guia de Agentes de Tratamento (2ª versão):
  - o operador trata dados para as finalidades indicadas pelo controlador, segundo instruções documentadas, sem finalidade própria;
  - quem trata dados para finalidade própria deve ser tratado como controlador dessa operação;
  - o suboperador precisa de autorização do controlador, genérica ou específica (por exemplo, no contrato).

  Esses pontos vêm de resumos secundários do guia, não do texto lido diretamente — [Guia de Agentes (ANPD)](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/Segunda_Versao_do_Guia_de_Agentes_de_Tratamento_retificada.pdf/); [resumo SERPRO](https://serpro.gov.br/menu/noticias/noticias-2021/diretrizes-sobre-os-conceitos-de-agentes-de-tratamento-terceiros-e-destinatarios); [Migalhas](https://www.migalhas.com.br/depeso/365151/atualizacao-no-guia-orientativo-dos-agentes-de-tratamento-pela-anpd)

**Registro, RIPD e encarregado**
- **[LEI]** O RIPD é a documentação do controlador com "a descrição dos processos de tratamento de dados pessoais que podem gerar riscos às liberdades civis e aos direitos fundamentais, bem como medidas, salvaguardas e mecanismos de mitigação de risco" (art. 5º XVII). A ANPD pode exigi-lo, "inclusive de dados sensíveis" (art. 38). O conteúdo mínimo inclui os tipos de dados, a metodologia de coleta e de segurança e a análise das salvaguardas — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[GUIA]** O RIPD "pode incorporar o teste de balanceamento" e trazer análise mais ampla dos riscos e das mitigações — [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[LEI/REG]** O controlador indica encarregado (art. 41). Agentes de pequeno porte estão dispensados, mas devem manter canal de comunicação com o titular — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm); [Res. CD/ANPD 2/2022, art. 11](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)

**Direitos do titular**
- **[LEI]** Art. 18: o titular tem direito a:
  - confirmação de que há tratamento e acesso aos dados;
  - correção de dados "incompletos, inexatos ou desatualizados";
  - anonimização, bloqueio ou eliminação de dados "desnecessários, excessivos ou tratados em desconformidade";
  - portabilidade;
  - eliminação do que foi tratado com consentimento;
  - informação sobre compartilhamento e sobre a possibilidade de não consentir;
  - revogação do consentimento.

  O §2 garante que o titular pode "opor-se a tratamento realizado com fundamento em uma das hipóteses de dispensa de consentimento, em caso de descumprimento" da Lei — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Art. 19: confirmação e acesso em formato simplificado, imediatamente, ou por declaração completa em até 15 dias (o pequeno porte tem prazo em dobro; ver a seção 2) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Retenção e eliminação**
- **[LEI]** Arts. 15–16: o tratamento termina quando a finalidade é alcançada, no fim do período, a pedido do titular ou por determinação da ANPD. Depois disso, os dados são eliminados. A conservação só é permitida para:
  - obrigação legal ou regulatória;
  - pesquisa;
  - transferência a terceiro conforme a Lei;
  - "uso exclusivo do controlador, vedado seu acesso por terceiro, e desde que anonimizados os dados".

  — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[LEI]** Marco Civil, art. 15: o provedor de aplicações constituído como pessoa jurídica, com fins econômicos, deve guardar os registros de acesso a aplicações por 6 meses, sob sigilo — [Lei 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- **[LEI]** Lei 13.787/2018, art. 6º: prontuários em papel e digitalizados só podem ser eliminados depois do prazo mínimo de 20 anos contados do último registro — [Lei 13.787/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm)

**Segurança, incidentes e sanções**
- **[LEI]** O art. 46 exige medidas técnicas e administrativas de segurança. O art. 48 obriga a comunicar à ANPD e ao titular todo incidente "que possa acarretar risco ou dano relevante" — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[REG]** Res. CD/ANPD nº 15/2024 (Regulamento de Comunicação de Incidente de Segurança):
  - comunicação à ANPD em 3 dias úteis, contados "do conhecimento pelo controlador de que o incidente afetou dados pessoais";
  - complementação possível em até 20 dias úteis;
  - envio por formulário eletrônico;
  - comunicação aos titulares também em 3 dias úteis.

  Há risco relevante quando o incidente pode afetar significativamente direitos e envolve ao menos um destes critérios: dados sensíveis; dados de crianças, adolescentes ou idosos; dados financeiros; dados de autenticação; dados protegidos por sigilo; larga escala. Na dúvida, a ANPD recomenda comunicar — [Res. 15/2024 (Biblioteca Digital MJ)](https://bibliotecadigital.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html); [página da ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis); [SERPRO, 2025](https://www.serpro.gov.br/menu/noticias/noticias-2025/incidentes-seguranca-dados-pessoais)
- **[LEI]** Art. 52 II: multa simples de até 2% do faturamento no Brasil, limitada a R$ 50 milhões por infração — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)

**Leis vizinhas que pesam sobre perfis de consumo**
- **[LEI]** CDC, art. 43: o consumidor tem acesso às informações em "cadastros, fichas, registros e dados pessoais e de consumo" sobre ele.
  - §1: os dados devem ser objetivos, claros e verdadeiros, sem informação negativa por mais de 5 anos;
  - §2: "A abertura de cadastro, ficha, registro e dados pessoais e de consumo deverá ser comunicada por escrito ao consumidor, quando não solicitada por ele";
  - §3: o consumidor pode exigir correção imediata.

  — [CDC (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- **[LEI]** CDC, art. 39: são práticas abusivas "recusar atendimento às demandas dos consumidores, na exata medida de suas disponibilidades de estoque" (II) e "recusar a venda de bens ou a prestação de serviços, diretamente a quem se disponha a adquiri-los mediante pronto pagamento" (IX) — [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)

### Inferences
- **Mapa de bases por uso (proposta, revisão jurídica):**
  - **(a) Confirmação e lembrete de horário marcado:** art. 7º V (contrato). Em clínicas, art. 11 II d (exercício de direitos em contrato) ou f (tutela da saúde), sempre sem conteúdo clínico no texto.
  - **(b) Perfil operacional interno** (intervalo de retorno, taxa de faltas, serviços habituais) usado para organizar a agenda: legítimo interesse (art. 10 I e II), com teste por finalidade, registro e oposição. Em segmentos de saúde, o próprio histórico de atendimentos revela saúde (art. 11 §1); a base passa a ser consentimento específico e destacado, ou retorno clinicamente indicado pelo profissional (tutela da saúde).
  - **(c) Mensagem de recuperação, retorno ou oferta:** fora da saúde, o legítimo interesse é defensável para clientes com relação prévia, desde que cada mensagem traga descadastramento (exemplo da ANPD, seção 2). A regra interna do Flow, "marketing só com consentimento" (`CONTEXTO.md` §7), é mais conservadora que o mínimo legal e simplifica a conformidade com a Meta e com os conselhos profissionais.
  - **(d) Previsões de retorno, falta ou evasão:** legítimo interesse só como apoio à decisão humana. Se a previsão gerar efeito sobre o cliente (exigir sinal, esconder horário, rebaixar prioridade), incidem o art. 20, o art. 6º IX e o CDC, art. 39.
- **Dados derivados também contam.** O perfil é dado pessoal mesmo guardado como números agregados (art. 12 §2). Por isso, pedidos de eliminação, oposição e acesso precisam alcançar as features derivadas, as previsões e as recomendações, e não só os registros de agendamento.
- **Segmentos "não médicos" também geram inferências sensíveis.** Exemplos inferidos, sem fonte específica:
  - serviços para queda de cabelo ou de podologia revelam saúde;
  - depilação íntima toca a vida sexual;
  - serviços específicos por tipo de cabelo podem funcionar como indício de origem racial;
  - padrões de agenda ligados a guarda religiosa revelam convicção religiosa.

  Pelo art. 11 §1, o sistema não deve derivar nem rotular esses traços.
- **Finalidades são do negócio, não do SaaS.** O SaaS projeta a lógica de recomendação, mas as finalidades devem ser ligadas e desligadas pelo próprio negócio e documentadas no contrato de operador. Treinar modelo ou fazer benchmark com dados de vários negócios é finalidade própria do SaaS: nessa operação ele vira controlador e precisa de base própria e de transparência, ou de anonimização real no sentido do art. 12 (revisão jurídica).
- **Incidentes.** O operador precisa permitir que cada negócio cumpra os 3 dias úteis da Res. 15/2024. O contrato deve prever aviso do SaaS ao negócio em questão de horas, já com os campos que o formulário da ANPD pede.
- **CDC, art. 43 §2.** O artigo pode ser lido como dever de comunicar por escrito a abertura de "registro ... de consumo" que o cliente não pediu. Na prática a exigência costuma recair sobre birôs de crédito. Um aviso claro no fluxo de agendamento e na primeira mensagem reduz o risco (revisão jurídica).

### Gaps
- A redação literal da LGPD, do CDC, do Marco Civil, do ECA, da Lei 13.787 e das LCs não foi reconferida online, porque o Planalto bloqueou a sessão.
- Não encontrei regulamento da ANPD em vigor sobre os prazos do art. 18 nem sobre o art. 20 (ver a seção 2).
- Não encontrei fonte sobre a aplicação do CDC, art. 43 §2, a perfis internos de CRM de prestadores de serviço.
- Não verifiquei nesta sessão o regulamento de transferência internacional da ANPD (arts. 33–36 da LGPD), relevante para nuvem, Meta e provedores de IA no exterior. Também não verifiquei o tratamento da "controladoria conjunta" no guia de agentes nem o papel da Meta (controladora ou operadora) na Cloud API.
- Não confirmei o prazo de guarda do registro interno de incidentes previsto na Res. 15/2024.

## 2. Orientação e regulação da ANPD (legítimo interesse, pequeno porte, IA e decisões automatizadas, prioridades 2026–2027), ECA Digital e PL 2338/2023

### Takeaway
A ANPD ainda não editou regra vinculante específica sobre perfilamento ou decisão automatizada. O art. 20 está no item 7 (Inteligência Artificial) da Agenda Regulatória 2025–2026, ainda na fase de consolidação de contribuições (NT 12/2025), e IA é eixo prioritário de fiscalização em 2026–2027 (Res. 30/2025).

Hoje vinculam quatro instrumentos:
- a LGPD;
- a Res. 2/2022: decisão unicamente automatizada de perfil, ou uso de dado sensível ou de menor, somada a efeito significativo ou larga escala, configura alto risco. Isso tira o pequeno negócio do regime simplificado;
- a Res. 15/2024, sobre incidentes;
- o ECA Digital, em vigor desde 17/03/2026, que veda perfilamento para publicidade a crianças e adolescentes.

O PL 2338/2023 não é lei: aguarda parecer na Câmara, com votação adiada para depois das eleições de outubro de 2026. No texto do Senado, explicação, contestação e revisão humana valem só para sistemas de alto risco. Essa lista não inclui marketing, recomendação de consumo nem crédito, mas inclui avaliação de estudantes e apoio a diagnóstico.

### Cited Findings

**Guia de Legítimo Interesse (fev/2024)**
- **[GUIA]** Publicado em formato digital em fevereiro de 2024 — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file); [notícia da ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse)
- **[GUIA]** Teste em três fases:
  - **Finalidade:** verificar a natureza dos dados ("o legítimo interesse não é aplicável ao tratamento de dados pessoais sensíveis"), garantir o melhor interesse de crianças e adolescentes e descrever o interesse e sua legitimidade, com "lastro em situações concretas".
  - **Necessidade:** com base no art. 10 §1, "privilegiar formas menos intrusivas" e minimizar os dados.
  - **Balanceamento e salvaguardas:** ponderar interesses e direitos e "adotar a perspectiva do titular, a fim de assegurar que as suas legítimas expectativas e seus direitos e liberdades fundamentais sejam respeitados". Um possível risco ou impacto negativo "não afasta, por si só" o uso da base.

  — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** "O teste de balanceamento deve ser aplicado para cada finalidade específica". Para uma nova finalidade, "recomenda-se elaborar outro teste de balanceamento" — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** Sobre a legítima expectativa, o controlador deve "avaliar e ser capaz de demonstrar que o tratamento dos dados pessoais para a finalidade pretendida é, razoavelmente, o esperado pelos titulares naquele contexto" — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** Exemplo favorável: instituição de ensino e editora que envia promoções à comunidade acadêmica, com a qual "possui uma relação prévia". O guia conclui que:
  - o interesse é legítimo (art. 10 I);
  - o envio atende às legítimas expectativas;
  - o desconto pode beneficiar o titular (art. 10 II);
  - os riscos são mitigados porque a base não é compartilhada com terceiros e há "opção de descadastramento nas próprias mensagens encaminhadas ou no aplicativo".

  — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** Exemplo desfavorável: monitoramento de empregados (webcam, registro de tudo o que é digitado) sem "meios efetivos de oposição ao tratamento". Nesse caso o legítimo interesse não é admissível — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** O modelo de teste (Anexo II) tem seção própria, "Salvaguardas e mecanismos de opt-out e de oposição". O guia liga o teste ao dever de registro (art. 37) e admite que o RIPD o incorpore. A ANPD pode pedir o RIPD (art. 10 §3) — [Guia](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)

**Agentes de pequeno porte: Res. CD/ANPD nº 2/2022 (texto do DOU conferido)**
- **[REG]** Quem não pode usar o regime diferenciado (art. 3º):
  - I: quem realiza tratamento de alto risco (salvo o art. 8º, que permite reunir-se em entidades para mediar reclamações);
  - II: quem tem receita bruta acima do limite do art. 3º, II, da LC 123/2006 (R$ 4,8 milhões) ou, no caso de startups, do art. 4º §1º I da LC 182/2021 (R$ 16 milhões);
  - III: quem pertence a grupo econômico cuja receita global ultrapasse esses limites.

  MEI, ME e EPP são abrangidos (art. 2º II) — [Res. 2/2022 (DOU)](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019); valores em [LC 123/2006](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm) e [LC 182/2021](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp182.htm)
- **[REG]** Art. 4º: o tratamento é de alto risco quando atende a ao menos um critério geral **e** a um critério específico.
  - Critérios gerais: larga escala; ou tratamento que "possa afetar significativamente interesses e direitos fundamentais".
  - Critérios específicos:
    - a) tecnologias emergentes ou inovadoras;
    - b) vigilância ou controle de zonas acessíveis ao público;
    - c) "decisões tomadas unicamente com base em tratamento automatizado de dados pessoais, inclusive aquelas destinadas a definir o perfil pessoal, profissional, de saúde, de consumo e de crédito ou os aspectos da personalidade do titular";
    - d) "utilização de dados pessoais sensíveis ou de dados pessoais de crianças, de adolescentes e de idosos".

  Nota: o critério c) acrescenta "de saúde" à lista do art. 20 da LGPD — [Res. 2/2022](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)
- **[REG]** Art. 4º §2: o tratamento afeta significativamente quando "puder impedir o exercício de direitos ou a utilização de um serviço, assim como ocasionar danos materiais ou morais aos titulares, tais como discriminação". Pelo §1, a larga escala considera o número de titulares, o volume de dados, a duração, a frequência e a extensão geográfica — [Res. 2/2022](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)
- **[REG]** Flexibilizações:
  - registro simplificado (art. 9º);
  - comunicação de incidente simplificada, nos termos de regulamento específico (art. 10);
  - dispensa de encarregado, mas com canal de comunicação obrigatório (art. 11 e §1º). Indicar encarregado conta como boa prática (§2º);
  - política simplificada de segurança (art. 13);
  - **prazo em dobro** (art. 14) para pedidos de titulares, comunicação de incidente (exceto quando houver risco à integridade física ou moral ou à segurança nacional), declaração completa do art. 19 II e pedidos da ANPD;
  - declaração simplificada em até 15 dias (art. 15).

  — [Res. 2/2022](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)
- **[REG]** A flexibilização "não isenta" do cumprimento das bases legais, dos princípios e dos direitos dos titulares (art. 6º). A ANPD pode exigir as obrigações dispensadas conforme a natureza, o volume e os riscos do tratamento (art. 16) — [Res. 2/2022](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)

**IA e decisões automatizadas: estado da regulação na ANPD**
- **[GUIA]** A NT nº 12/2025/CON1/CGN/ANPD (processo 00261.006920/2024-46) consolida a tomada de subsídios do projeto do item 7, "Inteligência Artificial", da Agenda Regulatória 2025–2026, aprovada pela Resolução nº 23, de 09/12/2024. Além de regulamentar o art. 20, a ANPD "pode endereçar melhor o tema por meio de documentos orientativos, como guias e estudos técnicos" — [NT 12/2025](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts-06-2024-nt-12-2025-consolidacao-das-contribuicoes.pdf/@@display-file/file)
- **[GUIA]** Na NT 12/2025:
  - **Convergências:** programas de governança e privacidade, Privacy by Design, transparência, RIPD, segurança, monitoramento contínuo e capacitação; documentação de todo o ciclo de vida do sistema de IA, da concepção à desativação; o risco como fator que define a necessidade de RIPD.
  - **Divergências:** obrigatoriedade da revisão humana; necessidade e nível de detalhe da regulação; avaliação de impacto para todos os sistemas; adoção de padrões como o NIST AI RMF e as normas ISO 42001 e 23894.

  — [NT 12/2025](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts-06-2024-nt-12-2025-consolidacao-das-contribuicoes.pdf/@@display-file/file)
- **[REG]** A Res. CD/ANPD nº 30, de 23/12/2025, aprovou o Mapa de Temas Prioritários 2026–2027 com quatro eixos: direitos dos titulares; proteção de crianças e adolescentes no ambiente digital; tratamento de dados pelo Poder Público; "inteligência artificial e tecnologias emergentes" — [notícia da ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-mapa-de-temas-prioritarios-para-o-bienio-2026-2027-e-atualiza-agenda-regulatoria-2025-2026). A nota técnica do mapa prevê "20 atividades de fiscalização relacionadas ao tratamento de dados" no eixo de IA (dado tirado de resumo; anexo não lido na íntegra) — [NT 54/2025](https://www.gov.br/anpd/pt-br/assuntos/noticias/NotaTcnica54.2025MTP2025.pdf)
- **[GUIA]** Em junho de 2026, o CNPD enviou contribuições para a Agenda Regulatória 2027–2028, incluindo tratamento de dados no contexto da IA, anonimização e decisões automatizadas — [CNPD/ANPD](https://www.gov.br/anpd/pt-br/cnpd/cnpd-encaminha-contribuicoes-prioritarias-para-a-agenda-regulatoria-da-anpd-2027-2028)
- **[SEC]** Blogs afirmam que a ANPD publicou em 2026 um guia final sobre IA e dados pessoais. Isso **não foi confirmado** em fonte oficial nesta pesquisa — [Confidata](https://confidata.com.br/blog/anpd-regulacao-ia-brasil-2026-2027); [Farracha de Castro](https://farrachadecastro.com.br/farracha-de-castro/decisoes-automatizadas-e-inteligencia-artificial-perspectivas-regulatorias-segundo-a-anpd/)
- **[GUIA]** Documentos oficiais de 2025–2026 já usam a denominação "Agência Nacional de Proteção de Dados" — [voto CD 35/2025](https://www.gov.br/anpd/pt-br/assuntos/deliberacoes-do-conselho-diretor-1/circuitos-deliberativos-ano-2025/cd-35-2025-votos.pdf); [NT 54/2025](https://www.gov.br/anpd/pt-br/assuntos/noticias/NotaTcnica54.2025MTP2025.pdf)

**ECA Digital (Lei 15.211/2025)**
- **[LEI]** Em vigor desde 17/03/2026 — [Machado Meyer (SEC)](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026); [Poder360 (SEC)](https://www.poder360.com.br/poder-governo/eca-digital-entra-em-vigor-nesta-3a-feira-entenda-o-que-muda/)
- **[LEI/SEC]** Segundo as análises disponíveis, o art. 22 veda técnicas de perfilamento para direcionar publicidade comercial a crianças e adolescentes, e também análise emocional e realidade aumentada ou virtual com esse fim. Uma nota técnica da ANPD lista os arts. 22 e 26 sob "publicidade comercial" — [Factsheet Machado Meyer](https://www.machadomeyer.com.br/images/ebooks/Factsheet_ECA_Digital.pdf); [Migalhas](https://www.migalhas.com.br/depeso/452213/eca-digital-e-protecao-de-criancas-e-adolescentes-no-ambiente-on-line); [ANPD, NT 10 (TS 03/2025)](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-03-2025-nota-tecnica-10-de-abertura.pdf/@@display-file/file)
- **[SEC]** A ANPD é a autoridade de fiscalização do ECA Digital — [Demarest](https://www.demarest.com.br/?p=164008). As fontes divergem sobre o número do decreto regulamentador (12.622/2025 ou 12.880/2026) — [Conjur](https://www.conjur.com.br/2026-mar-21/eca-digital-a-resposta-a-nova-infancia-consumidora//?print=1); [BMA](https://www.bmalaw.com.br/conteudo/direito-digital-protecao-de-dados-e-cybersecurity/informativos-e-newsletters/eca-digital-e-sua-regulamentacao-entram-em-vigor/pdf)

**PL 2338/2023 (marco legal da IA): não é lei**
- **[PL]** Aprovado pelo Senado em 10/12/2024. A Câmara criou a Comissão Especial em abril de 2025 e a instalou em 20/05/2025, com presidência de Luisa Canziani e relatoria de Aguinaldo Ribeiro — [Barbieri Advogados (SEC)](https://www.barbieriadvogados.com/regulamentacao-inteligencia-artificial-brasil/); [LCF Monitor (SEC)](https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/)
- **[PL]** A ficha da Câmara mostra o projeto aguardando parecer do relator na Comissão Especial, com movimentação de apensação em 27/10/2026. Segundo agregador, o relator disse em 24/08/2026 que a votação ficaria para depois das eleições de outubro — [ficha de tramitação (Câmara)](https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262); [LCF Monitor (SEC)](https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/). Cronogramas anteriores (votação em fevereiro, parecer em junho de 2026) não se cumpriram — [Douglas Vilar (SEC)](https://douglasvilar.com.br/artigos/posts/2026-06-13_marco-legal-ia-pl-2338-regulacao-brasil)
- **[PL]** Direitos diante de qualquer sistema de IA (art. 5º):
  - informação "quanto às suas interações com sistemas de IA ... inclusive sobre caráter automatizado da interação";
  - privacidade e proteção de dados;
  - "não discriminação ilícita ou abusiva e à correção de vieses discriminatórios ilegais ou abusivos, sejam eles diretos ou indiretos";
  - para grupos vulneráveis, linguagem "apropriada à idade" e observância do melhor interesse (§2º).

  — [texto do PL recebido pela Câmara](https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023)
- **[PL]** Direitos só diante de sistemas de **alto risco** (art. 6º):
  - "direito à explicação sobre a decisão, a recomendação ou a previsão feitas pelo sistema";
  - "direito de contestar e de solicitar a revisão de decisões, recomendações ou previsões";
  - "direito à revisão humana das decisões, levando-se em conta o contexto, o risco e o estado da arte".

  A explicação é gratuita, em linguagem simples, com procedimento simplificado conforme "o porte do agente, em especial no caso de micro e pequenas empresas e startups" (art. 7º). A supervisão humana fica dispensada se for "comprovadamente impossível" ou exigir esforço desproporcional (art. 8º) — [texto do PL](https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023)
- **[PL]** A lista de alto risco (art. 14) inclui, entre outros:
  - II: seleção de estudantes ou "avaliações determinantes no progresso acadêmico ou monitoramento de estudantes";
  - III: emprego;
  - IV: acesso e elegibilidade a "serviços privados e públicos que sejam considerados essenciais";
  - VIII: "aplicações na área da saúde para auxiliar diagnósticos e procedimentos médicos, quando houver risco relevante à integridade física e mental";
  - XI: reconhecimento de emoções por biometria.

  A lista **não** traz item sobre marketing, recomendação de consumo ou crédito — [texto do PL](https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023). Fontes secundárias que dizem que crédito é alto risco são **contraditas** pelo texto — [Strong (SEC)](https://strong.com.br/blog/marco-legal-inteligencia-artificial-pl-2338/). Em 2024, a sociedade civil já criticava essa ausência do crédito — [ata CGI.br](https://www.cgi.br/media/atas/pdf/reuniao_do_cgi.br_de_26_de_julho_de_2024_0_29012025.pdf)
- **[PL]** Entre as vedações (art. 13) estão sistemas com o propósito de "explorar quaisquer vulnerabilidades da pessoa natural ou de grupos com o objetivo ou o efeito de induzir o seu comportamento de maneira que cause danos à saúde, à segurança ou outros a direitos fundamentais", e a pontuação social de pessoas pelo poder público — [texto do PL](https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023)

### Inferences
- **Pequeno porte, salvo alto risco.** A maioria dos negócios clientes (MEI, ME, EPP) é agente de pequeno porte: sem encarregado obrigatório (mas com canal), com registro simplificado e prazos em dobro, **desde que não faça tratamento de alto risco**.
  - Um recurso que decida de forma unicamente automatizada impedir ou condicionar o atendimento (bloquear agenda, exigir sinal, esconder horários por "score" de faltas) preenche o critério específico c) e o critério geral do §2 ("impedir ... a utilização de um serviço"). Isso tira o negócio do regime simplificado.
  - Clínicas, odontologia e estética (dados de saúde) e escolas (menores) já preenchem o critério d); basta somar um critério geral.
  - Manter a IA como sugestão para decisão humana é a escolha de desenho que mais reduz esse enquadramento.
- **O SaaS provavelmente não é pequeno porte nesse papel.** Ao agregar milhares de negócios, tende a operar em "larga escala", e pode não se enquadrar por receita ou grupo econômico. Convém planejar encarregado, registro completo, RIPD-modelo para os clientes e trilha de auditoria.
- **Se o PL 2338 virar lei como saiu do Senado**, recomendações de agenda não seriam alto risco, com três exceções possíveis:
  - avaliação ou monitoramento de alunos em escolas (art. 14 II);
  - apoio a diagnóstico ou procedimento em saúde (art. 14 VIII);
  - talvez o art. 14 IV, se o regulamento considerar consultas de saúde "serviço essencial" e a IA condicionar o acesso a elas.

  Os direitos do art. 5º valeriam para todos os negócios: o assistente no WhatsApp teria de se identificar como automatizado. O texto ainda pode mudar na Câmara.
- **Documentar agora.** Com a fiscalização de 2026–2027 focada em IA, decisões automatizadas e crianças (Res. 30/2025), é prudente registrar já o teste de legítimo interesse e o RIPD dos recursos de perfil e previsão.
- **Menores e ECA Digital.** Em escolas, e em qualquer negócio com clientes menores (cortes infantis, academias com adolescentes), não fazer perfilamento para ofertas ao menor. O contato e o destinatário de qualquer comunicação devem ser o responsável adulto, com uma marca de idade na ficha que suprima recomendações (revisão jurídica sobre o alcance da lei a SaaS de agendamento).

### Gaps
- Não confirmei nenhum guia oficial final da ANPD sobre IA ou decisões automatizadas, nem data para o regulamento do art. 20.
- Não li o anexo integral da Res. 30/2025; os números de fiscalização vêm do resumo da nota técnica.
- ECA Digital: não li a redação literal dos arts. 20, 22 e 26 (Planalto bloqueado; só fontes secundárias). O alcance de "acesso provável por crianças e adolescentes" a um SaaS de agendamento depende de análise jurídica, e os números dos decretos regulamentadores divergem.
- PL 2338: o parecer e o substitutivo do relator na Câmara ainda não existem; a lista de alto risco pode mudar.
- Não verifiquei o ato que transformou a ANPD em "Agência" nem a amplitude das novas competências.

## 3. Segmentos de saúde e afins (clínicas médicas e odontológicas, estética, fisioterapia, academias): CFM, CFO, COFFITO, ANVISA e o que a IA nunca deve inferir ou sugerir

### Takeaway
Em clínicas, odontologia, estética, fisioterapia e, em parte, academias, todo perfil ou previsão derivado do histórico de atendimento é dado de saúde (art. 11). Recuperação de clientes e ofertas exigem consentimento específico e destacado.

Além da LGPD, as mensagens precisam obedecer aos códigos de cada profissão:
- **Odontologia:** ainda proíbe anunciar preços, serviços gratuitos e formas de pagamento.
- **Medicina (CFM 2.336/2023):** permite anunciar preço e desconto, mas veda promessa de resultado.
- **Medicamentos e terapias:** a propaganda é restrita a publicações para profissionais de saúde (Lei 9.294/1996, art. 7º).
- **WhatsApp:** a política restringe informação de saúde e produtos médicos.

A IA nunca deve inferir diagnóstico ou traço sensível, nem sugerir procedimento. Retorno clínico só a partir do plano definido pelo profissional, com texto neutro.

### Cited Findings
- **[LEI]** Dado de saúde é sensível (art. 5º II), e qualquer tratamento que o revele segue o art. 11 (§1). Não cabe legítimo interesse; a base é consentimento "específico e destacado" ou hipóteses como a tutela da saúde (II f) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm); [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[LEI]** É vedado comunicar ou compartilhar dados de saúde entre controladores para obter vantagem econômica, salvo as exceções de prestação de serviços de saúde (art. 11 §4) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[REG]** CFM, Res. 2.336/2023 (publicidade médica), em vigor desde 11/03/2024:
  - permite "Anunciar valor das consultas";
  - permite "Anunciar descontos sendo vedado oferecer qualquer outra vantagem casada ao desconto";
  - mantém vedadas a publicidade que induza garantia de resultados, a divulgação de métodos não reconhecidos pelo CFM e a concorrência desleal.

  — [apresentação do CREMAL](https://cremal.org.br/wp-content/uploads/2025/08/Emmanuel_Publicidade-Alagoana-de-Psiquiatria2336.pdf); [Legismap (SEC)](https://legismap.com.br/conteudos/artigos-e-noticias/publicidade-medica-veja-o-que-foi-liberado-e-o-que-ainda-e-proibido); [Legismap, vigência (SEC)](https://legismap.com.br/conteudos/artigos-e-noticias/conselho-federal-de-medicina-atualiza-regras-para-a-publicidade-medica); [texto no CFM](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf); [Mattos Filho (SEC)](https://www.mattosfilho.com.br/en/unico/new-rules-medical-advertising/); [Campos Thomaz (SEC)](https://camposthomaz.com/en/comunicado-ct/cfm-updates-medical-advertising-rules/)
- **[REG]** CFO: o art. 44, I, do Código de Ética Odontológica (Res. CFO-118/2012) segue proibindo publicidade com serviços gratuitos, preços e modalidades de pagamento. A Res. CFO-196/2019 não mudou isso. A Res. CFO-271/2025, de 18/06/2025, alterou só o inciso XIV do art. 44 (cartões de desconto), em cumprimento a decisão do CADE, e o CFO reafirmou que continuam proibidos anúncios com preços e serviços gratuitos — [Qconcursos (SEC)](https://www.qconcursos.com/questoes-de-concursos/questoes/59df40e0-27); [Legismap (SEC)](https://legismap.com.br/conteudos/artigos-e-noticias/em-cumprimento-a-decisao-do-cade-cfo-realiza-alteracoes-pontuais-no-codigo-de-etica); [Res. CFO-271/2025](https://sistemas.cfo.org.br/visualizar/atos/RESOLU%C3%87%C3%83O/SEC/2025/271). O CRO-BA alertou que "Black Friday na odontologia é infração ética" — [Correio (SEC)](https://www.correio24horas.com.br/minha-bahia/black-friday-na-odontologia-e-infracao-etica-alerta-conselho-de-odontologia-1124)
- **[LEI]** Lei 9.294/1996, art. 7º: "A propaganda de medicamentos e terapias de qualquer tipo ou espécie poderá ser feita em publicações especializadas dirigidas direta e especificamente a profissionais e instituições de saúde". Há exceção para medicamentos de venda livre — [Lei 9.294/1996 (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/l9294.htm); [transcrição (SEC)](https://www.admdireito.com.br/legislacao/art/lei_00092941996-7)
- **[REG/SEC]** A RDC 102/2000 da ANVISA vedava "a propaganda, publicidade ou promoção, ao público leigo, de descontos para medicamentos de venda sob prescrição" — [Normas Brasil](https://www.normasbrasil.com.br/norma/resolucao-102-2000_96494.html). O STJ decidiu em 2024 que a ANVISA não pode, por ato próprio, restringir a propaganda de fármacos além do que a lei prevê — [Conjur](https://www.conjur.com.br/2024-ago-14/nao-cabe-a-anvisa-restringir-propaganda-de-medicamentos-decide-stj//?print=1); [Trilhante, REsp 2.035.645/DF](https://informativos.trilhante.com.br/julgados/stj-resp-2035645-df)
- **[META]** A política do WhatsApp diz: "Don't use WhatsApp for telemedicine or to send or request any health related information", nos lugares em que a regulação proíbe enviar esses dados a sistemas sem salvaguardas reforçadas (redação condicional exata a reconferir). "Medical and healthcare products" é categoria restrita. Mensagens de setores regulados só valem na plataforma, não no app Business, e as de medicamentos de venda livre nunca podem ir a menores de 18 anos — [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)
- **[META]** Na categorização de modelos da Meta, os únicos exemplos de saúde como "utility" são de serviço público (campanha de saúde, emergência sanitária). Conteúdo de saúde com elemento promocional entra na regra de conteúdo misto e vira marketing — [Template categorization (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization.md)
- **[PL]** No PL 2338, IA na saúde para "auxiliar diagnósticos e procedimentos médicos, quando houver risco relevante" é alto risco (art. 14 VIII). Também é vedado explorar vulnerabilidades para induzir comportamento que cause dano à saúde (art. 13 I b) — [texto do PL](https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023)
- **[LEI]** O prontuário tem guarda mínima de 20 anos (Lei 13.787/2018, art. 6º) — [Lei 13.787/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm)

### Inferences
- **O que nunca inferir ou rotular, em qualquer segmento:** diagnóstico, doença ou condição (inclusive gravidez, saúde mental, peso), vida sexual, orientação sexual, origem racial ou étnica, religião e deficiência. Esses traços também não podem ser deduzidos de serviços, horários, fotos ou conversas.
- **O que a IA nunca deve sugerir:**
  - tratamento, procedimento, medicamento, dose ou intervalo clínico por conta própria;
  - "está na hora de reaplicar o botox" ou nome de medicamento ou marca (risco de propaganda de terapia ao público e risco ético);
  - promessa ou expectativa de resultado, ou antes e depois;
  - em odontologia: preço, desconto, "avaliação grátis" ou formas de pagamento;
  - comparação entre profissionais.

  Retorno clínico só quando o profissional tiver definido o plano (por exemplo, "retorno em 6 meses" registrado por ele), e sempre com texto neutro.
- **Mensagens neutras, sem detalhe clínico** no texto nem na pré-visualização (exemplo: "Seu retorno com {profissional} está chegando"). O aviso aparece na tela bloqueada e pode ser lido por terceiros, o que toca o sigilo profissional e o dever de segurança (art. 46).
- **"Modo saúde" por segmento:**
  - perfil só com métricas operacionais (intervalo de retorno, faltas);
  - consentimento específico e destacado antes de qualquer recuperação ou marketing;
  - nenhuma nota clínica nem texto livre no contexto enviado à IA;
  - pergunta clínica recebida pelo WhatsApp sempre encaminhada ao profissional;
  - RIPD-modelo pronto para esses negócios.
- **Academias:** anamnese (questionário de saúde), peso e composição corporal são dados de saúde; catraca biométrica é dado biométrico. Prever evasão pela frequência é admissível, mas sem cruzar dados de saúde para fazer ofertas.
- **Veterinária e oficina:** a saúde do animal não é dado pessoal; os dados do tutor e a placa ou o veículo ligados a uma pessoa são. O risco é menor, mas valem as mesmas regras de finalidade e de oposição.
- **Regras de conteúdo por profissão.** A medicina permite preço e desconto; a odontologia não. Por isso as regras de conteúdo das mensagens promocionais precisam ser definidas por profissão, e não por um "segmento saúde" genérico (revisão jurídica, inclusive para estética feita por biomédicos, dentistas ou médicos).

### Gaps
- Não pesquisei nesta sessão as regras de publicidade do COFFITO (fisioterapia), do CFBM (biomedicina estética), do CREF (academias) e do CFMV (veterinária).
- Não li diretamente o texto atual do art. 44 do Código de Ética Odontológica nem os artigos de preço e desconto da Res. CFM 2.336/2023 (só fontes secundárias e slides).
- Não reconferi os arts. 73 (sigilo) e 75 (casos identificáveis em anúncios) do Código de Ética Médica (Res. CFM 2.217/2018), que são relevantes para mensagens automáticas.
- Não confirmei se a RDC 102/2000 foi substituída pela RDC 96/2008 (provável), nem como a propaganda de toxina botulínica e de outros injetáveis estéticos é tratada.
- Não li a WhatsApp Commerce Policy nem a redação exata da cláusula de saúde da política de mensagens.

## 4. WhatsApp: Business Messaging Policy, categorias de modelos (utility × marketing), limites de frequência, opt-in e opt-out, e riscos das APIs não oficiais (Evolution/Baileys)

### Takeaway
Na API oficial, a Meta exige três coisas:
- opt-in, com o nome do negócio. Pode ser colhido fora do WhatsApp, e a Meta recomenda um opt-in por categoria;
- atender a pedidos de saída feitos em qualquer canal;
- caminho para atendimento humano sempre que houver automação.

Toda sugestão de retorno, recuperação ou recomendação é marketing, mesmo que o cliente a tenha pedido, e conteúdo misto também conta como marketing. Marketing está sujeito a limite dinâmico por usuário (erro 131049), e modelos mal classificados podem ser recategorizados com penalidade. Lembrete só é utility se for puramente transacional.

No canal não oficial (Evolution/Baileys sobre o WhatsApp Web), os Termos do WhatsApp proíbem acesso automatizado não autorizado, disparo automático e uso não pessoal. O risco é o banimento do número do negócio, sem ferramentas de opt-in ou de categoria, e a LGPD vale do mesmo jeito.

No Brasil, uma medida preventiva do CADE, mantida em março de 2026, suspendeu a proibição da Meta a chatbots de IA de uso geral de terceiros. O atendimento por IA do próprio negócio não era o alvo.

### Cited Findings

**Política e opt-in/opt-out (API oficial)**
- **[META]** Business Messaging Policy, atualizada em 23/09/2026:
  - o contato só pode ocorrer depois de receber o telefone ou o nome de usuário da pessoa e "opt-in permission from the recipient";
  - boa prática: opt-ins separados por categoria de mensagem e para chamadas;
  - é obrigatório respeitar "all requests (either on or off WhatsApp) by a person to block, discontinue, or otherwise opt out", inclusive retirando a pessoa dos contatos;
  - recomenda dar instruções claras para sair de categorias específicas.

  — [Business Messaging Policy](https://whatsappbusiness.com/policy/) (redirecionada de business.whatsapp.com/policy)
- **[META]** Automação é permitida, mas a empresa "must also have available prompt, clear, and direct escalation paths" para atendimento humano: transferência no chat, telefone, e-mail, site, loja ou formulário — [Business Messaging Policy](https://whatsappbusiness.com/policy/)
- **[META]** É proibido pedir ou enviar número completo de cartão, conta bancária, documento de identidade ou "other sensitive identifiers". O volume pode ser limitado por feedback negativo dos usuários, e "We may limit or remove your access" em caso de violação — [Business Messaging Policy](https://whatsappbusiness.com/policy/)
- **[META]** Guia de opt-in da Meta:
  - o opt-in deve dizer claramente que a pessoa aceita receber comunicações da empresa e trazer o nome da empresa;
  - pode ser coletado fora do WhatsApp (SMS, site, URA, presencialmente ou em papel) e "can be general and not specifically for WhatsApp";
  - recomenda opt-in separado por categoria e fluxos de entrada e saída claros, com os pedidos honrados;
  - a pessoa pode parar de receber marketing de uma empresa específica;
  - tudo sujeito à lei local.

  — [Getting opt-in (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in.md)

**Categorias de modelo**
- **[META]** Utility: modelos "typically triggered by a user action or request", que precisam ser "non-promotional, not containing any promotional or persuasive intent" e "specific to or requested by the user (clearly related to their order, account, services, or transactions)", ou essenciais e críticos. Mensagens de pedido e de conta não podem promover, recomendar, fazer venda adicional nem tentar renovação — [Template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization.md); [Template guidelines](https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines/)
- **[META]** Marketing:
  - promoções e cupons;
  - retargeting de quem visitou, usou ou interagiu: "marketing even if requested by users";
  - pesquisa de satisfação genérica, que "will not be approved as utility" (a específica sobre um pedido pode ser utility);
  - conteúdo misto, com utilidade e promoção juntas;
  - modelos ambíguos, como "{{1}}" ou "Parabéns!".

  — [Template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization.md)
- **[META]** A página de categorização não cita lembretes de agendamento entre os exemplos — [Template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization.md)
- **[META]** A Meta recategoriza modelos aprovados de forma recorrente, com aviso um dia antes (sem aviso para contas já advertidas). A penalidade é escalonada:
  1. advertência;
  2. limite do volume de utility numa janela de 24h;
  3. recategorização de todos os modelos utility da conta como marketing, às vezes do portfólio inteiro.

  O negócio tem 60 dias para recorrer — [Template guidelines](https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines/)

**Limites de marketing por usuário**
- **[META]** O WhatsApp "may limit the number of marketing template messages" que uma pessoa recebe, conforme o engajamento recente dela (taxa de leitura) e o volume na caixa de entrada.
  - Mensagens de marketing enviadas dentro da janela de 24h aberta pelo cliente não contam.
  - A falha volta com o erro 131049.
  - É preciso esperar ao menos 24h antes de reenviar; repetir antes disso pode bloquear novas tentativas por até 24h.
  - Marketing não é entregue a números dos EUA.

  — [Per-user marketing limits (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits.md). Segundo fornecedores, o limite é dinâmico, não divulgado e vale só para marketing — [Wati (SEC)](https://www.wati.io/en/blog/whatsapp-error-131049/); [Vonage (SEC)](https://api.support.vonage.com/hc/en-us/articles/17270698783516-WhatsApp-Per-User-Marketing-Template-Messaging-Limits)

**APIs não oficiais (WhatsApp Web, Baileys, Evolution)**
- **[META]** Termos de Serviço do WhatsApp, vigentes desde 04/01/2021 para usuários fora da "European Region" (o que inclui o Brasil). Proíbem:
  - acessar ou usar os serviços "through automated or other means" de forma não autorizada;
  - "(a) reverse engineer, alter, modify, create derivative works from, decompile, or extract code from our Services";
  - criar contas "through unauthorized or automated means";
  - criar "software or APIs that function substantially the same as our Services" e oferecê-los a terceiros sem autorização.

  Entre os usos ilegais ou inaceitáveis estão "bulk messaging, auto-messaging, auto-dialing, and the like" e "any non-personal use of our Services unless otherwise authorized". O WhatsApp pode "disabling or suspending your account" — [Terms of Service](https://www.whatsapp.com/legal/terms-of-service)
- **[SEC]** Baileys, wwebjs e Venom funcionam por engenharia reversa do WhatsApp Web, simulando um navegador ou usuário. Fornecedores apontam risco de banimento permanente do número. Essas fontes vendem a API oficial (viés comercial) e não trazem dados de frequência de banimento — [SocialHub](https://www.socialhub.pro/blog/baileys-wwebjs-venom-riscos-apis-whatsapp-nao-oficiais/); [Clint](https://clint.digital/blog/riscos-whatsapp-nao-oficial-2026); [Pasquale Pillitteri](https://pasqualepillitteri.it/pt/news/12976/integrar-whatsapp-evolution-api-cloud-api-meta); [Digisac](https://www.digisac.com.br/blog/chatbot-no-whatsapp-erros-que-podem-gerar-banimento)

**IA no WhatsApp Business e o CADE**
- **[META/SEC]** Linha do tempo:
  - a Meta alterou os termos do WhatsApp Business para proibir provedores de IA de uso geral — [Olhar Digital, out/2025](https://olhardigital.com.br/2025/10/18/pro/whatsapp-business-vai-proibir-chatbots-de-ia-entenda/);
  - as startups Luzia e Zapia recorreram ao CADE — [Tecnoblog](https://tecnoblog.net/noticias/ias-brasileiras-entram-com-processo-contra-restricoes-no-whatsapp/);
  - o CADE abriu inquérito e determinou medida preventiva suspendendo a proibição no Brasil — [Olhar Digital, jan/2026](https://olhardigital.com.br/2026/01/13/pro/muda-algo-no-whatsapp-entenda-o-inquerito-do-cade-contra-a-meta/);
  - em 04/03/2026, o Tribunal do CADE negou por unanimidade o recurso da Meta — [CNN Brasil](https://www.cnnbrasil.com.br/economia/negocios/cade-mantem-medida-preventiva-que-obriga-meta-a-permitir-chatbots-de-ia-no-whatsapp/); [MacMagazine](https://macmagazine.com.br/post/2026/03/04/tribunal-do-cade-mantem-liminar-contra-termos-de-ia-do-whatsapp-no-brasil/);
  - em 30/03/2026, o CADE manteve multa diária de R$ 250 mil por descumprimento — [Portal Tela](https://www.portaltela.com/noticias/economia/2026/03/30/cade-mantem-multa-diaria-de-r-250-mil-contra-whatsapp-por-ia/).
- **[SEC]** A Meta argumentou que o WhatsApp Business foi feito para empresas atenderem seus próprios clientes, não para distribuir chatbots de terceiros — [O Povo](https://www.opovo.com.br/noticias/economia/2026/02/02/meta-diz-ao-cade-que-chatbots-de-ia-se-aproveitam-do-whatsapp-business-para-uso-nao-previsto.html). A imprensa noticiou depois que o WhatsApp recuou no Brasil e que empresas podem usar IA para atender clientes (datas dessas matérias não conferidas) — [Exame](https://exame.com/tecnologia/whatsapp-volta-atras-e-deixa-que-empresas-brasileiras-usem-ias-para-atender-clientes/); [Canaltech](https://canaltech.com.br/apps/whatsapp-desiste-de-bloquear-outros-chatbots-de-ia-no-brasil-revela-portal/)
- **[META]** A Business Messaging Policy lida em nov/2026 não traz regra específica para provedores de IA; a restrição está nos termos da solução de negócios — [Business Messaging Policy](https://whatsappbusiness.com/policy/)

### Inferences
- **Classificação dos envios do Flow na API oficial:**
  - **Utility:** confirmação, lembrete, remarcação e cancelamento do horário marcado; "cheguei"; aviso de vaga da lista de espera que o próprio cliente pediu (desde que o texto não seja promocional, inferência); pesquisa sobre aquele atendimento específico.
  - **Marketing:** "faz X semanas desde sua última visita"; retorno sugerido sem horário marcado; aniversário com desconto; recomendação de outro serviço; NPS genérico; qualquer lembrete com "aproveite e agende também…".

  Juntar uma sugestão ao lembrete transforma o lembrete em marketing e expõe a conta à recategorização.
- **Opt-in em duas camadas** no agendamento: "Avisos do seu horário pelo WhatsApp", ligado ao serviço, e "Sugestões e ofertas de {negócio} pelo WhatsApp", desmarcado por padrão. Isso atende à boa prática da Meta, ao consentimento da LGPD quando essa for a base escolhida e à regra interna do Flow.
- **Opt-out:** palavra-chave ("PARAR", "SAIR"), botão em toda mensagem de marketing e pedidos feitos fora do WhatsApp (no balcão, por telefone) vão para uma lista de supressão por negócio, com data e origem. Sair do marketing deve também desligar o perfil daquele cliente para fins de marketing.
- **Frequência:** usar limites próprios abaixo dos da Meta (por exemplo, no máximo uma sugestão de retorno por ciclo, parar depois de duas sem resposta, respeitar horário silencioso). O erro 131049 é dinâmico e falhas repetidas pioram a entrega. Dentro da janela de 24h aberta pelo cliente a restrição da Meta é menor, mas finalidade e expectativa da LGPD continuam valendo.
- **Evolution/Baileys:**
  - o risco recai sobre o número do próprio negócio (banimento);
  - a sessão do WhatsApp Web dá acesso a todas as conversas do aparelho, inclusive contatos pessoais e grupos. É preciso filtrar na entrada e não guardar nem perfilar mensagens de quem não é cliente nem está agendando (necessidade, art. 6º III);
  - não usar o canal não oficial para disparos de marketing;
  - manter a regra, já existente no Flow, de que falha do WhatsApp nunca bloqueia a operação.
- **Transparência da IA:** identificar o assistente como automático e oferecer "falar com a equipe" atende à exigência de escalonamento da Meta e antecipa o direito de informação do art. 5º I do PL 2338. A disputa no CADE trata de IA de uso geral de terceiros; um assistente de agendamento do próprio negócio não é o alvo declarado da restrição.

### Gaps
- Não li as faixas de limite de envio (tiers) nem as regras de qualidade vigentes em 2026.
- Não li a WhatsApp Commerce Policy nem o texto exato da cláusula sobre provedores de IA nos termos da solução de negócios. O desfecho de mérito do caso no CADE depois de março de 2026 é desconhecido.
- Não encontrei dados confiáveis sobre a taxa de banimento com Baileys ou Evolution.
- A Meta não documenta como as regras de opt-in e de categoria se aplicam à automação feita pelo WhatsApp Web, que é um canal não autorizado.

## 5. Controles práticos de desenho (explicabilidade, separação de fatos, padrões e previsões, oposição ao perfilamento, minimização, inferências sensíveis, retenção, acesso por papel, auditoria, isolamento e não discriminação)

### Takeaway
Os controles que mais reduzem o risco jurídico e de plataforma:
- separar fato, padrão, previsão e recomendação, cada um com origem e explicação;
- a IA só sugere e uma pessoa decide: nunca negar, condicionar ou piorar o atendimento por score;
- base legal e teste definidos por finalidade;
- oposição ao perfilamento e saída do marketing separadas e fáceis;
- minimização, com features agregadas em janelas móveis;
- bloqueio de inferências sensíveis e modos específicos para saúde e para menores;
- retenção com eliminação também dos dados derivados;
- acesso por papel, trilha de auditoria e isolamento por negócio, sem aprendizado cruzado com dados brutos;
- contrato de operador, RIPD e plano de resposta a incidentes.

### Cited Findings
- **[LEI]** A LGPD exige finalidade, necessidade, qualidade, transparência, não discriminação e prestação de contas (art. 6º); informação sobre os critérios da decisão automatizada quando solicitada (art. 20 §1); direito de oposição (art. 18 §2); revogação facilitada do consentimento (art. 8º §5); e segurança desde a concepção (art. 46 §2) — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- **[REG]** Decisão unicamente automatizada de perfil, somada a efeito que possa "impedir ... a utilização de um serviço" ou causar "discriminação", é tratamento de alto risco para o regime de pequeno porte — [Res. 2/2022](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)
- **[GUIA]** Salvaguardas reconhecidas pela ANPD: descadastramento em cada mensagem; não compartilhar a base com terceiros; a seção "opt-out e de oposição" no teste; um teste por finalidade; registro e RIPD — [Guia de Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf/@@display-file/file)
- **[GUIA]** Convergências da consulta da ANPD: governança, Privacy by Design, transparência, RIPD, monitoramento contínuo e documentação do ciclo de vida da IA — [NT 12/2025](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts-06-2024-nt-12-2025-consolidacao-das-contribuicoes.pdf/@@display-file/file)
- **[PL]** Se o projeto for aprovado: explicação de "decisão, recomendação ou previsão", contestação e revisão humana para sistemas de alto risco; correção de vieses e aviso de interação automatizada para todos — [texto do PL](https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2868197&filename=PL+2338%2F2023)
- **[META]** Exigências da Meta: escalonamento para humano, saída por categoria e limites de marketing por usuário — [Business Messaging Policy](https://whatsappbusiness.com/policy/); [Per-user limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits.md)
- **[LEI]** Recusar atendimento a quem paga é prática abusiva (CDC, art. 39 II e IX). O cadastro de consumo deve ser objetivo, verdadeiro e corrigível (art. 43) — [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- **[LEI]** Os registros de acesso a aplicações devem ser guardados por 6 meses (Marco Civil, art. 15) — [Lei 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- **[LEI/SEC]** O ECA Digital proíbe perfilamento para publicidade a menores — [Factsheet Machado Meyer](https://www.machadomeyer.com.br/images/ebooks/Factsheet_ECA_Digital.pdf)
- **[REG]** Incidente com risco relevante deve ser comunicado em 3 dias úteis — [Res. 15/2024](https://bibliotecadigital.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html)

### Inferences
1. **Quatro camadas separadas e rotuladas:**
   - **Fato:** um registro (exemplo: "faltou em 12/10").
   - **Padrão:** cálculo determinístico (exemplo: "volta em média a cada 28 dias, em 6 visitas").
   - **Previsão:** probabilidade com faixa e versão do modelo ou da regra (exemplo: "chance alta de retorno em 30 dias").
   - **Recomendação:** ação sugerida à equipe, com o motivo.

   Cada item guarda a origem, a data do cálculo e a validade. A tela mostra o rótulo e um "por que estou vendo isto?" em linguagem simples. A IA generativa só verbaliza fatos e padrões já calculados; nunca cria número nem motivo. Isso cobre o art. 20 §1 e o art. 19 II da LGPD e o art. 6º I do PL 2338.
2. **A IA sugere, uma pessoa decide.** Nenhuma previsão pode bloquear horário, esconder vaga, exigir sinal, mudar preço, rebaixar alguém na lista de espera ou marcar o cliente como "problemático".
   - Usos permitidos da previsão de falta: lembrete extra, pedido de confirmação, facilitar a remarcação. Todos beneficiam o titular (art. 10 II).
   - Se o dono quiser cobrar sinal de quem falta com frequência, isso vira uma regra explícita e objetiva, configurada por ele, publicada na página de agendamento, aplicada a todos e com revisão humana e canal de contestação (art. 20), e não um score opaco (revisão jurídica).
3. **Nada de "lista negra" entre negócios.** Cada negócio é um controlador distinto. Compartilhar histórico de faltas entre negócios seria uso compartilhado sem base clara, potencialmente discriminatório e contrário ao CDC, art. 43.
4. **Base legal e teste por finalidade, registrados por negócio:**
   - lembretes: contrato;
   - perfil operacional: legítimo interesse, com teste;
   - sugestões de retorno e ofertas: consentimento (regra do Flow);
   - saúde: consentimento específico e destacado;
   - menores: nenhum marketing.

   A versão do aviso de privacidade e a do consentimento ficam registradas a cada aceite.
5. **Oposição ao perfilamento, por cliente.** Um interruptor "não usar meu histórico para sugestões" interrompe o cálculo, apaga as features derivadas e mantém só o necessário para prestar o serviço. Fica separado da saída do marketing. Os dois podem ser acionados pelo próprio cliente (WhatsApp ou página) e pela equipe.
6. **Minimização:**
   - features agregadas a partir dos agendamentos (datas, categoria do serviço, status) numa janela móvel (por exemplo, 24 meses);
   - nada de texto livre de conversa no perfil;
   - nada de foto, localização precisa ou dados de outros contatos;
   - as preferências privadas continuam na ficha existente (`clientes.preferencias`), nunca na página pública.
7. **Lista de bloqueio de inferências sensíveis** (art. 11 §1), aplicada no código e nos prompts. Para segmentos de saúde, vale o "modo saúde" descrito na seção 3.
8. **Retenção:**
   - recalcular o perfil periodicamente e descartar o anterior;
   - cliente inativo além da janela tem o perfil apagado ou anonimizado;
   - excluir um cliente apaga também o perfil, as previsões e as recomendações dele;
   - registros de acesso guardados por no mínimo 6 meses;
   - prazo da auditoria de recomendações definido no RIPD;
   - se o negócio guarda prontuário no sistema, a regra dos 20 anos vale para esse documento. O prontuário deve ficar separado dos dados de marketing.
9. **Acesso por papel:**
   - o profissional vê os padrões só dos próprios clientes;
   - a recepção vê sinais operacionais ("confirmar por telefone"), sem o score;
   - o dono vê painéis agregados;
   - nenhum score fica visível ao público.

   O isolamento por negócio no banco (RLS) e o filtro manual por negócio em toda consulta com acesso privilegiado são regras que o Flow já segue.
10. **Trilha de auditoria:** quem viu o perfil; qual recomendação foi exibida, aceita ou ignorada; que mensagem saiu e com qual base ou consentimento; qual versão do modelo ou da regra foi usada. Isso sustenta o art. 37, o art. 6º X e as respostas a pedidos do art. 20.
11. **Sem aprendizado cruzado com dados brutos.** Heurísticas por negócio (média, desvio, sazonalidade) são explicáveis e funcionam com poucos dados. Um modelo global só pode usar dados realmente anonimizados, ou exige que o SaaS assuma o papel de controlador com base legal própria.
12. **Provedores de IA e de nuvem:**
    - enviar só os fatos calculados necessários, nunca o histórico completo nem dado sensível;
    - listar os suboperadores (Meta, hospedagem da Evolution, provedor de IA, nuvem) no contrato com o negócio;
    - tratar a transferência internacional (lacuna da seção 1).
13. **Viés e discriminação:** não usar como sinal nome, gênero, idade, bairro ou CEP, nem foto. Monitorar se as recomendações e os lembretes extras se concentram em certos grupos de clientes e revisar as regras antes de ativá-las.
14. **Contrato de operador (DPA):**
    - finalidades habilitadas por negócio;
    - lista de suboperadores;
    - aviso de incidente ao negócio em questão de horas;
    - apoio a pedidos de titulares (exportar e apagar os dados de um cliente);
    - devolução ou eliminação dos dados ao fim do contrato;
    - direito de auditoria.
15. **Transparência ao cliente final:** um aviso gerado pelo SaaS em nome de cada negócio, com:
    - as finalidades (lembretes, sugestões de retorno, previsões para organizar a agenda);
    - as bases legais;
    - os direitos e como se opor;
    - o canal de contato, obrigatório para o pequeno porte sem encarregado.
16. **O que o Flow já tem e converge** (`CONTEXTO.md`):
    - marketing só com consentimento;
    - WhatsApp como secretária de avisos, e falha do WhatsApp nunca bloqueia a operação;
    - remetente sempre a conexão do próprio negócio;
    - RLS em toda tabela;
    - preferências privadas fora da página pública.

    São bases boas para os controles acima.

### Gaps
- Não encontrei orientação da ANPD nem decisão judicial sobre score de faltas, exigência de sinal ou "próxima melhor ação".
- Não existe padrão oficial de formato de explicação; a NT 12/2025 só registra a divergência entre contribuintes.
- As janelas de retenção sugeridas (24 meses e outras) são propostas de desenho, sem fonte normativa específica. Devem ser definidas no RIPD com o jurídico.
- Os modelos de teste de legítimo interesse, de RIPD e de contrato de operador precisam de revisão de advogado ou encarregado antes do uso.
