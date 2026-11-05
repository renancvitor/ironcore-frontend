# Home e Cards-Resumo

## Objetivo

Este documento reúne as decisões de produto, UX e composição dos cards-resumo da Home do IronCore no estado atual da `main`, incluindo Workout Planning e os atalhos de Workout Session.

A Home apresenta informações recentes, o estado atual do usuário e caminhos úteis para as features. Histórico, cadastro e detalhes continuam nas páginas responsáveis por esses fluxos.

Os contratos e fluxos completos estão em [Avaliação corporal](../body-metrics/README.md) e [Workout Planning](../workout-planning/README.md). As responsabilidades dos componentes estão em [Arquitetura](../architecture/README.md) e [Estrutura do projeto](../project-structure/README.md).

## Princípios dos Cards-Resumo

Um card deve trazer informações úteis para o usuário. A existência de uma entidade ou endpoint, por si só, não determina a criação de um card.

Cada card deve:

- apresentar poucas informações relevantes;
- representar dados e estados reais;
- oferecer acesso à feature responsável pelos detalhes, quando disponível;
- preservar as regras de domínio do backend;
- usar os componentes e padrões visuais compartilhados.

O backend define indicadores corporais, estado dos ciclos e regras de execução. A Home apresenta esses dados, sem calcular regras de negócio ou selecionar artificialmente um treino principal.

## Cards da Home

A estrutura atual contém quatro cards:

| Card                      | Estado atual                                       | Ação                                          |
| ------------------------- | -------------------------------------------------- | --------------------------------------------- |
| Última avaliação corporal | Integrado ao backend.                              | `Ver detalhes`, quando existe avaliação.      |
| Planejamento de treinos   | Integrado ao backend.                              | Links individuais e `Ver todos`.              |
| Evolução corporal         | Integrado ao backend.                              | `Ver evolução completa`, em todos os estados. |
| Treinos do dia            | Integrado ao planejamento e à sessão em andamento. | Iniciar/continuar sessão.                     |

### Última Avaliação Corporal

O card consulta `GET /api/users/me/body-metrics/latest` e apresenta:

- data e horário da avaliação;
- peso;
- percentual de gordura, quando disponível;
- massa gorda, quando disponível;
- massa magra, quando disponível.

Altura, IMC, circunferências e observações ficam na página completa. A ação `Ver detalhes` abre `/body-metrics/latest`, cujo retorno leva à Home.

O card reutiliza `BodyMetricsLatestComponent` por `contentTemplate`. A consulta, o loading e o tratamento de ausência de avaliação e erros permanecem nesse componente. O resumo substitui apenas a apresentação de sucesso.

Quando a API retorna `404`, o card informa `Nenhuma avaliação corporal cadastrada.` e não apresenta `Ver detalhes`. Outros erros seguem o diálogo e a navegação para o início definidos pela feature. O card não possui ação de cadastro.

### Evolução Corporal

O card consulta `GET /api/users/me/body-metrics/progress/changes` com o período padrão compartilhado: do primeiro dia do mês de cinco meses atrás até hoje.

Ele apresenta as medidas disponíveis nesta ordem:

1. Peso.
2. Percentual de gordura.
3. Massa gorda.
4. Massa magra.

Para cada medida, exibe diferença absoluta, variação relativa e datas do primeiro e último valor válido no período. Os valores vêm do backend; as datas de referência podem variar entre medidas. A diferença absoluta de percentual de gordura é apresentada em pontos percentuais (`p.p.`), enquanto a variação relativa usa `%`.

Durante a consulta, o card apresenta loading e indicação acessível de estado. Em caso de erro, mantém a mensagem no card e oferece `Tentar novamente`. Uma nova tentativa não duplica uma consulta pendente.

Quando não há medidas elegíveis, o card explica que peso e composição corporal precisam de pelo menos duas avaliações válidas por medida no período. Mudanças de outras medidas na resposta não preenchem esse resumo.

A ação `Ver evolução completa` permanece disponível durante loading, erro, ausência de dados e sucesso. Ela abre `/body-metrics/progress?from=home`, reutilizando a página completa de evolução e comparativo.

O retorno dessa página acompanha a origem:

- acesso pela Home retorna para `/`;
- acesso pelo histórico, com `from=history`, retorna para `/body-metrics`;
- acesso direto, origem ausente ou inválida usa o histórico como fallback;
- acesso pela sidebar remove a origem da Home e usa o histórico, inclusive quando a página já está aberta.

A seleção de período, os gráficos de composição corporal, circunferências e percentual de gordura e o comparativo completo ficam na página de evolução. Os três endpoints de séries alimentam os gráficos; `/progress/changes` fornece as diferenças entre medidas.

### Planejamento de Treinos

`InProgressWorkoutsCardComponent` apresenta o card `Planejamento de treinos` e consulta `GET /api/users/me/workout-cycles?page=0&size=3&workoutStatus=IN_PROGRESS` pelo serviço de Workout Planning.

O resumo contempla múltiplos planejamentos independentes, como musculação, corrida e mobilidade. A prioridade é `IN_PROGRESS`: somente se a resposta não contiver itens é feita outra consulta, com `NOT_STARTED`. Não há mistura de status, preenchimento de vagas com ciclos não iniciados ou fallback após erro de consulta.

O conteúdo implementado é:

- até três ciclos, preservando a ordem recebida da API, sem escolher um ciclo principal;
- nome com link individual para `/workout-planning/:id?from=home` e objetivo de treino;
- status e duração desejada em meses, quando informada;
- insight simples de tempo em andamento derivado de `startDate`: `Iniciado hoje` ou dias desde o início; data ausente, inválida ou futura não gera duração artificial;
- indicação `Exibindo N de T ciclos.` quando `totalElements` excede a quantidade exibida;
- `Ver todos` para `/workout-planning`, sem filtro implícito, disponível em todos os estados.

Loading tem `aria-busy` e anúncio de estado; falhas aparecem no próprio card com `Tentar novamente`, sem duplicar uma requisição pendente. Quando ambas as consultas retornam vazias, informa que não existem ciclos em andamento ou aguardando início e orienta consultar ou criar um planejamento. Ciclos concluídos ou cancelados não entram nesse resumo, mas continuam acessíveis no catálogo completo.

O detalhe lê `from=home` da URL, inclusive após recarregamento, e oferece `Voltar ao início`. Origem ausente/inválida ou acesso pelo catálogo retorna aos ciclos. Não há nova página de detalhe ou destino arbitrário de retorno.

O tempo desde `startDate` é apenas informação de calendário. O card não calcula progresso percentual, aderência, sessões, volume executado ou um treino principal. Usar a primeira posição da listagem para definir prioridade de domínio não faz parte da entrega.

Header e sidebar também oferecem `Planejamento de treinos`. No mobile, o atalho do header fica oculto, mantendo o acesso pela sidebar. A Home acrescenta caminhos contextuais sem substituir a navegação global existente.

## Composição e Responsividade

A Home compõe os quatro cards com `SummaryCardComponent`, que compartilha título, conteúdo e rodapé de ações. A estrutura atual usa duas colunas no desktop e uma coluna nos breakpoints de tablet e mobile, com espaçamento definido pelos tokens existentes.

As ações do rodapé seguem alinhamento à direita e quebra conforme o espaço disponível. Cabeçalhos, ações e formulários seguem [Disposição de ações no mobile](../architecture/mobile-actions.md).

Não há carrossel automático, autoplay ou sistema de widgets. Novos componentes compartilhados devem responder a uma repetição real de comportamento. Um eventual scroll horizontal depende da quantidade e utilidade dos cards, sem constituir requisito da estrutura atual.

## Estados e Integração

Loading, ausência de dados e erro acompanham cada consulta. Os quatro cards carregam independentemente e fazem novas consultas ao visitar a Home novamente; não há um loading ou erro global para todos. Evolução e planejamento cancelam suas requisições quando destruídos.

Um estado vazio representa ausência real de dados, incluindo a ausência de ciclos nos dois status consultados pelo planejamento. As estratégias de feedback específicas da última avaliação permanecem sob responsabilidade da feature corporal.

Os cards usam os componentes compartilhados de loading e empty state, o locale `pt-BR` e as unidades dos dados apresentados. Não há dados fictícios, store global exclusivo da Home ou outra página de evolução.

## Treinos do Dia e Sessão em Andamento

`TodayWorkoutsCardComponent` usa `WorkoutPlanningService`, `WorkoutSessionsService` e uma instância local de `WorkoutSessionStartService`. Consulta todas as páginas de ciclos `IN_PROGRESS` (20 por página), elimina IDs repetidos e carrega seus detalhes com concorrência limitada a quatro. Ordena ciclos por ID e dias por `sortOrder`, apresentando todos os dias cujo `weekDay` corresponde ao dia local do navegador. Não escolhe um único ciclo principal, não seleciona treinos atrasados e não oculta automaticamente treinos já realizados.

O dia é atualizado à meia-noite local e ao retomar a Home. A configuração `weekStartsOn` organiza a apresentação semanal do ciclo, sem mudar o dia de calendário usado neste card.

A sessão em andamento é consultada separadamente por `/api/users/me/workout-sessions/in-progress`. Quando existe, oferece continuidade mesmo que pertença a outro dia ou ciclo. Durante consulta, falha, abertura ou existência de sessão ativa, o início de outra sessão fica bloqueado. Dias sem atividades também não podem iniciar. Falhas de planejamento e sessão têm estados e nova consulta próprios; falha de sessão não é apresentada como inexistência.

Ao receber foco ou voltar à visibilidade, o card atualiza o dia e reconsulta a sessão ativa, sem duplicar requisição pendente. Esse retorno não recarrega automaticamente toda a composição dos ciclos. Resultado incerto de abertura exige `Verificar sessão`; o serviço consulta o backend antes de permitir nova tentativa e oferece continuidade quando encontra um registro. O sucesso abre `/workout-sessions/:id`. O planejamento completo continua acessível pela navegação global e pelo seu próprio card-resumo.

O card mostra treinos previstos e estado confirmado da sessão. Não representa aderência, sequência obrigatória, volume executado ou conclusão inferida. O fluxo completo e os estados de recuperação estão em [Workout Session](../workout-session/README.md).

## Diretrizes para Cards Futuros

Cards de atividade recente, frequência ou aderência ainda não estão implementados. Sua eventual criação deve usar execução real e contratos próprios, sem transformar ciclos planejados em números de treinos concluídos. Geração por IA e campos estruturados de RIR, energia ou dor não fazem parte dos cards atuais.

## Testes

Os testes atuais verificam a composição da Home, o resumo da última avaliação e o acesso à página completa. Para evolução, cobrem medidas elegíveis, valores recebidos da API, unidades, datas, loading, erro, retry, ausência de dados, cancelamento e navegação.

Os testes de integração da página de evolução cobrem o retorno a partir da Home e do histórico, acesso direto, recarregamento, origem inválida e acesso pela sidebar. Os comandos de validação estão em [Avaliação corporal](../body-metrics/README.md#testes-e-validação-local).

O card de planejamento possui testes de prioridade, fallback, limite de três, ordem da API, indicação de mais ciclos, links, tempo desde `startDate`, loading, erro/retry, vazio e cancelamento. A navegação integrada verifica o retorno do detalhe para a Home e os fallbacks para catálogo. A [validação final da v1.0.0](../releases/v1.0.0/README.md#validação-local) registra a suíte completa e o build de produção.

Os testes de treinos de hoje cobrem múltiplas páginas/ciclos, ordenação, dia local, retomada, sessão ativa, bloqueios, erros, abertura incerta e continuidade. A validação atual está em [v1.2.0 — preparação](../releases/v1.2.0/README.md#testes-e-validações). Os resultados anteriores acima permanecem históricos.

<p align="right"><a href="../README.md">Voltar para o índice da documentação</a></p>
