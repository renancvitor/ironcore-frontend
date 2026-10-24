# Workout Planning

## Propósito

A feature `workout-planning` implementa o planejamento de treinos da pessoa autenticada: consulta de objetivos, criação de ciclos, composição de dias e atividades, prescrição, reordenação e lifecycle. Ela integra o catálogo de exercícios existente, a Home e a navegação global na primeira versão funcional e estável do frontend, [v1.0.0](../releases/v1.0.0/README.md).

Planejamento não representa execução de sessões. O backend continua responsável por ownership, validações, normalização de posições e transições de domínio.

## Estrutura e Responsabilidades

| Arquivo ou área                                                            | Responsabilidade                                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `workout-planning.models.ts`                                               | Requests e responses de objetivos, ciclos, dias, atividades e lifecycle.   |
| `workout-planning.service.ts`                                              | Comunicação HTTP por `API_BASE_URL`, sem cache de respostas.               |
| `workout-planning.labels.ts`                                               | Rótulos de status e dias da semana.                                        |
| `workout-cycle.form.ts`, `workout-day.form.ts`, `workout-activity.form.ts` | Factories, validações de interface e montagem de requests.                 |
| `form`                                                                     | Componentes de formulário de ciclo, dia, atividade e posição de atividade. |
| `catalog`                                                                  | Listagem, filtros, paginação, exclusão e contexto da busca em memória.     |
| `create`                                                                   | Cadastro de ciclo e navegação para sua composição.                         |
| `detail`                                                                   | Detalhe, edição, composição, seleção de exercícios e lifecycle.            |
| `features/exercise/catalog`                                                | Catálogo reutilizado em modo contextual de seleção.                        |
| `features/home/components/in-progress-workouts-card`                       | Resumo independente de planejamento na Home.                               |

As páginas mantêm dados e estados em signals locais. `WorkoutCycleCatalogStateService` preserva somente filtros aplicados, página e tamanho em memória. Voltar ao catálogo refaz a consulta; recarregar a aplicação reinicia esse contexto. Não há store global de ciclos nem sincronização entre abas.

## Rotas e Navegação

| Rota                       | Conteúdo                                           |
| -------------------------- | -------------------------------------------------- |
| `/workout-planning`        | Catálogo, filtros, paginação e exclusão de ciclos. |
| `/workout-planning/create` | Criação de ciclo.                                  |
| `/workout-planning/:id`    | Detalhe, edição, composição e lifecycle.           |

As rotas usam `loadComponent` dentro do AppShell protegido por `authGuard`. A rota estática `create` precede `:id`. Header e sidebar oferecem acesso ao catálogo; no mobile, o atalho do header fica oculto e o acesso permanece pela sidebar.

Linhas do catálogo abrem o detalhe por clique, Enter ou Space. A ação de edição abre o mesmo detalhe com `edit=true`, respeitando o status. ID inválido retorna sem consultar o detalhe. O retorno usa `/workout-planning`, exceto quando `from=home`, que retorna para `/`; label e tooltip acompanham a origem. A query string preserva esse contexto após recarregamento, sem aceitar destinos arbitrários.

## Contratos HTTP

Todos os endpoints exigem sessão por cookie. O serviço reutiliza o interceptor, `withCredentials` e o tratamento global de `401`, descritos em [Arquitetura](../architecture/README.md). O cliente não envia `personId`; a API resolve a pessoa autenticada.

| Método   | Caminho                                         | Entrada                                             |
| -------- | ----------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/api/training-goals`                           | Sem parâmetros.                                     |
| `GET`    | `/api/users/me/workout-cycles`                  | Filtros, `page` e `size`.                           |
| `POST`   | `/api/users/me/workout-cycles`                  | Nome, objetivo, duração desejada, `weekStartsOn` e observações.     |
| `GET`    | `/api/users/me/workout-cycles/{id}`             | ID.                                                 |
| `PUT`    | `/api/users/me/workout-cycles/{id}`             | Campos editáveis completos do ciclo, incluindo `weekStartsOn`.                |
| `DELETE` | `/api/users/me/workout-cycles/{id}`             | ID de ciclo não iniciado.                           |
| `PATCH`  | `/api/users/me/workout-cycles/{id}/start`       | Sem corpo de dados (`null`).                        |
| `PATCH`  | `/api/users/me/workout-cycles/{id}/complete`    | Sem corpo de dados (`null`).                        |
| `PATCH`  | `/api/users/me/workout-cycles/{id}/cancel`      | Sem corpo de dados (`null`).                        |
| `POST`   | `/api/users/me/workout-days`                    | `workoutCycleId`, `weekDay`, `title`.               |
| `PUT`    | `/api/users/me/workout-days/{id}`               | `title`.                                            |
| `DELETE` | `/api/users/me/workout-days/{id}`               | ID.                                                 |
| `PATCH`  | `/api/users/me/workout-days/{id}/reorder`       | `weekDay`, `sortOrder`.                             |
| `POST`   | `/api/users/me/workout-activities`              | `workoutDayId`, `exerciseId` e prescrição opcional. |
| `PUT`    | `/api/users/me/workout-activities/{id}`         | `exerciseId` e prescrição completa.                 |
| `DELETE` | `/api/users/me/workout-activities/{id}`         | ID.                                                 |
| `PATCH`  | `/api/users/me/workout-activities/{id}/reorder` | `orderIndex`.                                       |

### TrainingGoal

`GET /api/training-goals` retorna os objetivos ativos com `id`, `code` e `name`. O frontend preserva os nomes e a ordem recebidos, sem IDs fixos nem catálogo duplicado localmente. Os rótulos locais de status e dias da semana não substituem esse catálogo.

Os objetivos alimentam o filtro do catálogo e os formulários de criação/edição de ciclo. O seletor fica desabilitado durante carregamento ou falha; há retry. O formulário exige que o ID escolhido pertença à resposta disponível. Objetivo ausente ou inativo não é criado artificialmente como opção válida. O backend revalida sua disponibilidade ao criar, atualizar ou iniciar o ciclo.

### WorkoutCycle: Listagem, Filtros e Paginação

A resposta contém `cycles`, uma `PageResult` com `content`, `page`, `size`, `totalElements`, `totalPages` e `last`. A tabela apresenta nome, status, objetivo, datas e duração desejada. Campos ausentes não geram valores artificiais.

Os filtros combináveis são `name`, `workoutStatus`, `trainingGoalId`, `startDate` e `endDate`. Aplicar ou limpar filtros reinicia a página em zero e preserva o tamanho. Alterações pendentes do formulário não alteram a consulta da paginação até sua aplicação. Nome vazio é omitido; busca e filtros são processados pela API.

A consulta inicial envia página `0` e tamanho `20`; a UI oferece 10, 20, 50 e 100 itens. O backend aceita página a partir de zero e tamanho entre 1 e 100. A ordem recebida é preservada; o contrato atual ordena por nome e ID ascendentes. O período considera sobreposição da janela do ciclo, com fim ausente tratado como aberto, conforme o backend.

Listagem e objetivos carregam independentemente, com erro e retry próprios. A exclusão recarrega a listagem e, quando a página deixou de existir, consulta a última página válida. O paginator usa metadados da API e configuração em português do AppShell.

### WorkoutCycle: Criação e Edição

Criação e edição compartilham formulário e campos: `name` e `trainingGoalId` obrigatórios, `desiredDurationMonths` opcional inteiro positivo, `weekStartsOn` com valor inicial `SUNDAY` e `notes` opcional. O backend define status, origem e datas; o fluxo REST cria ciclos `MANUAL` em `NOT_STARTED`. A duração desejada não é percentual de progresso nem data de término calculada pelo frontend.

Durante gravação, o formulário e as ações locais ficam bloqueados contra reenvio. Sucesso no POST navega ao detalhe para compor o ciclo; sucesso no PUT atualiza o detalhe pela resposta. Falha mantém os valores e apresenta diálogo com mensagem da API ou fallback. Cancelar edição não grava dados.

### Início da Semana (`weekStartsOn`)

O seletor **Início da semana**, disponível nos formulários de criação e edição do ciclo, permite escolher qualquer dia de `SUNDAY` a `SATURDAY`. O valor inicial na criação é `SUNDAY`; na edição, o formulário carrega o `weekStartsOn` persistido do ciclo. A configuração segue as mesmas permissões de edição dos demais campos: `NOT_STARTED` e `IN_PROGRESS`.

O frontend envia `weekStartsOn` nos requests de criação e atualização. O campo é retornado nas respostas dessas operações e no detalhe do ciclo, que também exibe o dia escolhido. Após salvar a edição, o detalhe usa o valor retornado pela API e recalcula imediatamente a ordenação visual.

## WorkoutDay e Organização Visual

Um dia pertence ao ciclo e contém `weekDay`, `title`, `sortOrder` e atividades. É possível ter vários dias no mesmo dia da semana. A apresentação segue a sequência semanal natural a partir do `weekStartsOn` configurado no ciclo, de forma circular. Por exemplo, `SATURDAY` produz `SATURDAY → SUNDAY → MONDAY → TUESDAY → WEDNESDAY → THURSDAY → FRIDAY`. Dias da semana sem treinos não geram sessões artificiais nem interrompem essa sequência; entre sessões do mesmo `weekDay`, `sortOrder` continua definindo a ordem.

`weekStartsOn` altera apenas o ponto inicial da apresentação, sem permitir uma ordem arbitrária dos dias da semana. A ordenação é calculada no frontend, preservando o array recebido da API, o `weekDay` original e o `sortOrder` de cada `WorkoutDay`.

- Criação envia ciclo, título não vazio e `weekDay`, de `SUNDAY` a `SATURDAY`; o backend atribui a próxima posição.
- Edição por PUT altera somente `title`.
- Reorder permite mudar `weekDay` e posição `sortOrder`, a partir de 1, dentro do destino.
- Exclusão remove o dia e suas atividades, com confirmação explícita.

Após mutações, o frontend consulta novamente o detalhe para apresentar a composição normalizada. Se a gravação funcionar e a recarga falhar, informa que a alteração foi salva, bloqueia novas alterações sobre a composição desatualizada e oferece recarregar o ciclo.

## WorkoutActivity e Seleção de Exercises

Uma atividade pertence a um dia, referencia um `exercise` e possui `orderIndex` e prescrição opcional. O detalhe apresenta nome e grupos musculares recebidos para o exercício, sem inferir músculos ou classificações.

O mesmo `ExerciseCatalogComponent` atende dois modos:

- `browse`: consulta normal em `/exercises`, com abertura do detalhe e retorno ao catálogo.
- `select`: catálogo dentro do detalhe do ciclo, com confirmação/cancelamento por eventos e sem sair da composição ao clicar na linha.

Na inclusão, há seleção múltipla, mantida ao filtrar e paginar enquanto o seletor está aberto. Os exercícios escolhidos são prescritos e salvos individualmente em sequência; cada POST é independente e a composição é recarregada após cada sucesso. Cancelar interrompe os itens ainda não salvos, sem desfazer os já criados. Não há operação de criação em lote ou transação única no frontend.

Na edição, a prescrição atual preenche o formulário e o exercício pode ser substituído por seleção única. O PUT envia o exercício e todos os campos editáveis, inclusive opcionais removidos como `null`. Exclusão e reorder atuam sobre a atividade existente; não movem atividades entre dias.

Exercícios já vinculados ao mesmo dia aparecem como `Já adicionado`, com seleção desabilitada e indicação acessível. Na troca de exercício, a atividade editada é excluída dessa verificação. O frontend elimina repetições na seleção e verifica novamente antes de salvar; a unicidade e a disponibilidade do exercício continuam garantidas pelo backend. O mesmo exercício pode compor outros dias.

Filtros, classificações auxiliares, paginação e padrões responsivos do catálogo são reutilizados. O detalhe fornece uma instância local de `ExerciseCatalogStateService`: filtros e paginação do seletor permanecem nesse contexto, sem substituir a busca do catálogo normal. Reabrir o seletor não restaura uma seleção de exercícios anterior. Falha da listagem em modo de seleção fica no contexto com retry; não redireciona a Home. Os contratos do catálogo estão em [Catálogo de Exercícios](../exercises/README.md).

## Prescrição Híbrida

Todos os campos abaixo são opcionais e podem ser combinados. Não existe exclusividade artificial entre musculação, cardio ou outros tipos: séries, repetições e carga podem coexistir com duração, distância e intensidade na mesma atividade.

| Campo             | Apresentação e validação de interface                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| `sets`            | Séries; inteiro positivo quando preenchido.                                        |
| `repRangeMin`     | Repetições mínimas; inteiro positivo.                                              |
| `repRangeMax`     | Repetições máximas; inteiro positivo, não inferior ao mínimo quando ambos existem. |
| `targetLoadKg`    | Carga em kg; número finito positivo.                                               |
| `targetLoadText`  | Descrição textual de carga.                                                        |
| `durationMinutes` | Duração em minutos; inteiro positivo.                                              |
| `distanceKm`      | Distância em km; número finito positivo.                                           |
| `intensityText`   | Descrição de intensidade.                                                          |
| `restSeconds`     | Descanso em segundos; inteiro positivo.                                            |
| `notes`           | Observações livres.                                                                |

Textos são aparados e enviados como `null` quando vazios; números opcionais ausentes permanecem `null`. A UI não exige preencher prescrição para vincular um exercício e não preenche descanso sugerido automaticamente. As validações de formulário antecipam erros conhecidos, sem substituir as regras do backend.

## Reorder

O frontend envia a intenção de reposicionamento de um único item:

- Dia: `PATCH /workout-days/{id}/reorder` com `{ weekDay, sortOrder }`.
- Atividade: `PATCH /workout-activities/{id}/reorder` com `{ orderIndex }`.

As posições são inteiras a partir de 1. A UI limita o destino às posições disponíveis, considerando a entrada do dia no destino. O backend normaliza e renumera as sequências afetadas, inclusive após exclusão. O frontend não envia arrays completos, não renumera irmãos nem trata `sortOrder` e `orderIndex` como campos intercambiáveis. Reorder é feito por formulário de posição, sem drag-and-drop.

## Lifecycle, Edição e Exclusão

| Status        | Ações de lifecycle    | Edição e composição | Exclusão do ciclo |
| ------------- | --------------------- | ------------------- | ----------------- |
| `NOT_STARTED` | Iniciar ou cancelar.  | Permitidas.         | Permitida.        |
| `IN_PROGRESS` | Concluir ou cancelar. | Permitidas.         | Bloqueada.        |
| `COMPLETED`   | Nenhuma; terminal.    | Bloqueadas.         | Bloqueada.        |
| `CANCELLED`   | Nenhuma; terminal.    | Bloqueadas.         | Bloqueada.        |

Transições disponíveis: `NOT_STARTED -> IN_PROGRESS`, `NOT_STARTED -> CANCELLED`, `IN_PROGRESS -> COMPLETED` e `IN_PROGRESS -> CANCELLED`. Não há reabertura.

Iniciar envia a solicitação ao backend, que exige objetivo ativo, ao menos um dia e ao menos uma atividade em cada dia. A UI não duplica um validador completo dessas pré-condições: apresenta a recusa retornada pela API. `startDate` e `endDate` são definidos pelo backend. Após sucesso, status e datas retornados atualizam o detalhe e as ações disponíveis imediatamente.

Concluir e cancelar exigem diálogo que informa o bloqueio definitivo de edição/composição. Iniciar não exige esse diálogo. Enquanto houver confirmação ou requisição de lifecycle, as ações contextuais conflitantes ficam bloqueadas. Erro mantém o estado anterior e apresenta a mensagem do backend.

A exclusão do ciclo é oferecida no catálogo somente para `NOT_STARTED`; o diálogo informa a remoção de dias e atividades vinculados. Dias e atividades podem ser excluídos em `NOT_STARTED` e `IN_PROGRESS`, mas não em estados terminais. Cada exclusão pede confirmação, bloqueia operações locais concorrentes, mostra toast de sucesso e recarrega os dados. Falhas aparecem em diálogo, sem remoção otimista. Essas permissões de interface refletem o contrato; o backend revalida status, ownership e integridade.

## Home, Responsividade e Acessibilidade

O card `Planejamento de treinos` consulta até três ciclos `IN_PROGRESS`. Somente quando essa consulta não retorna itens, consulta `NOT_STARTED`; não mistura os grupos nem usa o fallback em erro. Preserva a ordem da API e indica quando o total excede os itens mostrados. Cada ciclo tem link com `from=home`; `Ver todos` abre o catálogo completo. O insight de dias em andamento deriva apenas de `startDate`. Não há ciclo principal, percentual de progresso, aderência ou sessões inferidas. Os estados e a composição estão em [Home e Cards-Resumo](../card-resume/README.md).

Telas e formulários reutilizam tokens, breakpoints, botões, inputs, loading, empty state, dialogs, toasts e paginator existentes. Filtros reduzem colunas conforme o espaço; tabelas permitem rolagem horizontal; formulários e ações seguem [Disposição de ações no mobile](../architecture/mobile-actions.md). Ícones possuem labels e tooltips, linhas aceitam teclado e a seleção usa checkboxes rotulados. Loading, erros e seleção possuem indicações acessíveis nos templates. Isso não representa certificação ou auditoria completa de acessibilidade.

## Revisão e Validação Local

A [Issue #78](https://github.com/renancvitor/ironcore-frontend/issues/78) fecha documentalmente o milestone. Foram conferidas as entregas mergeadas pelos PRs [#79](https://github.com/renancvitor/ironcore-frontend/pull/79) (modelos/serviço), [#80](https://github.com/renancvitor/ironcore-frontend/pull/80) (catálogo/detalhe), [#81](https://github.com/renancvitor/ironcore-frontend/pull/81) (ciclos), [#82](https://github.com/renancvitor/ironcore-frontend/pull/82) (dias), [#83](https://github.com/renancvitor/ironcore-frontend/pull/83) (atividades/seleção), [#84](https://github.com/renancvitor/ironcore-frontend/pull/84) (lifecycle) e [#85](https://github.com/renancvitor/ironcore-frontend/pull/85) (Home), até o commit `b615a9c`.

A conferência incluiu modelos, serviços, formulários, componentes, templates, estilos, testes, rotas e navegação. Os contratos foram comparados com a [documentação de Workout Planning do backend](https://github.com/renancvitor/ironcore-backend/blob/main/docs/workout-planning/README.md) e seus DTOs/controllers REST. A [release estável do backend](https://github.com/renancvitor/ironcore-backend/blob/main/docs/releases/v1.0.0/README.md) serviu de referência de consolidação; o escopo deste registro é o frontend.

```bash
npm test -- --watch=false
npm run build
```

Na revisão de 17/10/2026 (America/Sao_Paulo), passaram 699 testes em 59 arquivos; o build de produção concluiu sem avisos. Há cobertura de contratos HTTP, filtros, paginação, formulários, edição/exclusão, composição, seleção/duplicidade, prescrição híbrida, reorder, lifecycle, estados terminais, Home e navegação contextual. Os testes HTTP usam respostas simuladas. Esta etapa não executou nova integração autenticada contra a API real nem nova verificação visual em navegador.

## Fora do Escopo

Workout Session, execução/acompanhamento real de sessões, histórico de treinos executados, geração com IA/agent, métricas de aderência e progresso percentual de ciclos não fazem parte da v1.0.0. A enumeração de origem `AGENT` no contrato não disponibiliza geração de treino na interface.

Não há sincronização automática entre abas, confirmação de alterações não salvas ou guard de saída específico para os formulários desta feature. Os bloqueios documentados são locais à interação. A integração depende da disponibilidade da API e da configuração de sessão/cookies/CORS. Esses recortes não são bugs de planejamento.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
