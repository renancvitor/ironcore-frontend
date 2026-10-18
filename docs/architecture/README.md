# Documentação de Arquitetura

## Visão Geral

O IronCore Frontend é uma aplicação Angular standalone. O bootstrap ocorre em `src/main.ts`; `app.config.ts` concentra os providers globais; e `AppComponent` hospeda o `router-outlet` e o fundo visual compartilhado.

A aplicação separa infraestrutura transversal em `core`, elementos reutilizáveis em `shared`, composição visual persistente em `layout` e fluxos funcionais em `features`. As features atualmente entregues pertencem aos contextos de autenticação, avaliação corporal, exercícios, planejamento de treinos, início e perfil.

## Bootstrap e Providers

`bootstrapApplication(AppComponent, appConfig)` inicia a aplicação. O `appConfig` registra:

- listeners globais de erro do navegador;
- Router com as rotas de `app.routes.ts`;
- `HttpClient`, URL base da API e interceptor pelo `provideCoreHttp()`;
- inicialização de `ThemeService` e locale `pt-BR`, com os dados de locale registrados;
- um `provideAppInitializer` que chama `AuthService.restoreSession()` na inicialização.

## Camadas e Responsabilidades

| Área                    | Responsabilidade atual                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `core/auth`             | Contratos de autenticação, login, logout, restauração de sessão e estado reativo em memória.   |
| `core/http`             | Provider do `HttpClient` e token `API_BASE_URL`.                                               |
| `core/interceptors`     | Inclusão de cookies nas chamadas à API e limpeza de sessão em respostas `401`.                 |
| `core/guards`           | Guard reutilizável aplicado à área autenticada.                                                |
| `core/theme`            | Estado e persistência da preferência de tema.                                                  |
| `shared/components`     | Componentes de interação e feedback sem regra de domínio.                                      |
| `layout`                | Application shell, header e sidebar.                                                           |
| `features/auth`         | Páginas e fluxos de login e primeiro acesso.                                                   |
| `features/body-metrics` | Contratos, consultas, formulários, exclusão, evolução e comparativo de avaliações corporais.   |
| `features/exercise`     | Contratos e consultas do catálogo, filtros, contexto de navegação e detalhe com músculos-alvo. |
| `features/workout-planning` | Contratos, catálogo, formulários, composição de ciclos/dias/atividades e lifecycle. |
| `features/home`         | Composição dos resumos de última avaliação, evolução corporal e planejamento de treinos.      |
| `features/profile`      | Perfil, dados de `Person`, nickname e alteração de senha.                                      |

Uma feature pode usar APIs públicas de `core` e elementos de `shared`, mas não deve acessar detalhes internos de outra feature. `shared` não deve depender de features e `core` não deve depender de `features` ou `layout`.

A composição atual da Home utiliza a API pública de apresentação de `BodyMetricsLatestComponent`, por `contentTemplate`. O componente da feature mantém consulta e estados; o card define apenas o conteúdo resumido de sucesso. Essa reutilização não cria um segundo serviço ou carregamento de `/latest` na Home.

O card de evolução usa `BodyMetricsService.getChanges` e `defaultProgressPeriod`, com estado local e uma consulta de `/progress/changes`. Ele seleciona peso e composição corporal da resposta, preserva diferenças e datas e oferece loading, empty state e retry. Não há outro serviço ou store para a Home, nem duplicação da página completa de evolução. Conteúdo, estados e decisões de produto estão em [Home e Cards-Resumo](../card-resume/README.md).

O card de planejamento usa a API pública de `WorkoutPlanningService`, com consulta e estados próprios. Busca até três ciclos em andamento e consulta não iniciados apenas se a primeira resposta estiver vazia. Os três summaries são independentes, sem store ou estado de carregamento global da Home.

## Comunicação HTTP e Environments

`provideCoreHttp()` registra o `HttpClient` com `authInterceptor` e fornece `API_BASE_URL` a partir do environment ativo. Serviços devem receber esse token; URLs da API não devem ser repetidas nas features.

O interceptor identifica chamadas para a API por origem e caminho. Somente essas chamadas recebem `withCredentials: true`; chamadas externas permanecem inalteradas. Em uma resposta `401`, o estado local é limpo e o erro continua no fluxo RxJS. Para chamadas que não sejam login, logout, primeiro acesso ou restauração de sessão, também há navegação para `/login`.

| Arquivo                                       | Uso                                     | `apiBaseUrl`                                  |
| --------------------------------------------- | --------------------------------------- | --------------------------------------------- |
| `src/environments/environment.ts`             | configuração padrão e build de produção | vazio, para chamadas relativas à mesma origem |
| `src/environments/environment.development.ts` | `ng serve` e build `development`        | `http://localhost:8080`                       |

`angular.json` substitui o environment padrão pelo de desenvolvimento nessa configuração. Arquivos de environment não devem conter segredos.

## Autenticação

`AuthService` integra os contratos utilizados pelos fluxos entregues:

- `POST /api/auth/login`;
- `GET /api/users/me`, para restaurar a sessão por cookie;
- `POST /api/auth/logout`.
- `POST /api/users/change-initial-password`.

`AuthStateService` guarda apenas o usuário autenticado em um `signal`, com `userId`, e-mail, nickname e o indicador `mustChangePassword`. O token eventualmente retornado no login não é persistido nem usado como credencial pelo frontend; a sessão usa o cookie enviado pelo navegador com `withCredentials`. Ao recarregar a página, a sessão é reconstruída por `GET /api/users/me`. Um `401` nessa restauração representa ausência de sessão e não interrompe a inicialização.

`authGuard` permite navegação somente quando há usuário no estado e, caso contrário, cria uma `UrlTree` para `/login`. Ele está aplicado à rota que monta a área autenticada. Como a restauração ocorre no inicializador, uma entrada direta nessa área é liberada quando `GET /api/users/me` restabelece uma sessão válida antes da avaliação do guard.

## Routing e Application Shell

O routing possui as rotas públicas `/login` e `/first-access`. A rota raiz, composta por `AppShellComponent` e protegida por `authGuard`, contém início, `/profile`, `/change-password` e as rotas de avaliação corporal, exercícios e planejamento de treinos. Os componentes de rota usam `loadComponent` para carregamento sob demanda. O shell organiza header, sidebar, área de conteúdo com `.ic-container` e um `router-outlet` interno. Header e sidebar oferecem acesso ao perfil, histórico corporal, catálogo de exercícios e planejamento de treinos; a sidebar também oferece evolução. O header oferece logout e preferência de tema. No mobile, os atalhos de histórico, exercícios e planejamento do header ficam ocultos, mantendo o acesso pela sidebar.

A avaliação corporal possui `/body-metrics`, `/body-metrics/latest`, `/body-metrics/progress`, `/body-metrics/create` e `/body-metrics/:id`, com rotas estáticas antes de `:id`. A edição ocorre dentro do detalhe. `bodyMetricsHistoryGuard` impede saída do histórico enquanto há exclusão pendente. O provider de `MatPaginatorIntl` em português pertence ao AppShell e é compartilhado com suas páginas carregadas sob demanda.

O catálogo usa `/exercises` e `/exercises/:id` na mesma área protegida. A listagem abre o detalhe por clique ou teclado, e o detalhe retorna ao catálogo com o contexto aplicado preservado em memória. As duas telas reutilizam serviços de HTTP, sessão e feedback existentes.

Workout Planning usa `/workout-planning`, `/workout-planning/create` e `/workout-planning/:id`, com `create` antes de `:id`. Edição, composição e lifecycle ocorrem no detalhe existente. O link individual da Home acrescenta `from=home`; o detalhe retorna para `/` nessa origem e para o catálogo quando ela está ausente ou inválida. O contexto é preservado na URL após recarregamento. `edit=true` abre a edição quando o status permite.

A Home acessa a evolução com `from=home`, e o histórico com `from=history`, na query string de `/body-metrics/progress`. A página lê a origem atual da URL: `home` retorna para `/`; histórico, origem inválida/ausente e acesso direto retornam para `/body-metrics`. A sidebar acessa a rota sem origem, restaurando o fallback inclusive na mesma página. Label e tooltip do botão de retorno acompanham esse contexto. A origem não altera os contratos HTTP, período ou visão inicial e não cria uma segunda tela.

Login envia `POST /api/auth/login`, atualiza o estado de sessão e navega para o início após sucesso. Quando recebe `401` com a mensagem `Troca de senha inicial obrigatória.`, a tela navega para `/first-access` com o e-mail informado. O primeiro acesso envia `POST /api/users/change-initial-password` e retorna para `/login` após sucesso. Essas rotas públicas não possuem redirecionamento automático quando já existe sessão autenticada.

O perfil consome o `User` mantido em `AuthStateService` e busca `Person` por `GET /api/users/me/person`. A separação é intencional: e-mail e nickname pertencem a `User`; nome, sexo e data de nascimento pertencem a `Person`. A alteração de nickname usa `PUT /api/users/me/change-nickname` e atualiza o estado de sessão. A edição dos dados pessoais usa `PATCH /api/users/me/person`. A alteração normal de senha, distinta do primeiro acesso, usa `POST /api/users/me/change-password`.

O logout é acionado no header por `POST /api/auth/logout`. Após sucesso, o estado em memória é limpo e a aplicação navega para `/login`; o frontend não manipula cookies `HttpOnly` diretamente. Se o logout retornar `401`, a navegação para login também ocorre; outros erros mantêm o usuário na tela e exibem feedback.

## Tema, Responsividade e Componentes Compartilhados

Os tokens e temas SCSS centralizam paleta, cores semânticas, espaçamentos, bordas, foco e tipografia. Há temas claro (`data-theme='light'`) e escuro, com integração ao Angular Material. `ThemeService` oferece preferências `light`, `dark` e `system`, persistidas no `localStorage` pela chave `Ironcore-theme`; o header permite alterná-las. Sem escolha explícita de claro/escuro, a aplicação acompanha `prefers-color-scheme`, usando escuro como fallback quando essa informação não está disponível. O script em `index.html` aplica o tema antes do bootstrap e permanece alinhado à inicialização do serviço. Mudanças do sistema são acompanhadas enquanto a preferência é `system`.

A estratégia responsiva centraliza os breakpoints mobile (`até 600px`), tablet (`601px–960px`) e desktop (`a partir de 961px`), além do container com largura máxima de `1200px`. Os mixins de `_actions.scss` organizam cabeçalhos, grupos de ícones e rodapés de formulário no mobile, conforme [Disposição de ações no mobile](mobile-actions.md). Ícones de ações preservam `aria-label` e tooltips; gráficos e tabelas corporais permitem rolagem horizontal quando necessária.

Os componentes base entregues são:

- `ButtonComponent`, com variantes primary, secondary, danger e cancel;
- `InputComponent`, integrado a `ControlValueAccessor` e Angular Material;
- `LoadingComponent` e `EmptyStateComponent`;
- `DialogComponent` e `DialogService` para confirmações;
- `ToastComponent` e `ToastService` para sucesso, erro, aviso e informação.

`SummaryCardComponent` pertence à composição da Home. `BodyMetricsFormFieldsComponent`, a factory do formulário e seus validadores pertencem ao domínio da feature e são reutilizados por cadastro e edição, sem mover regras corporais para `shared`.

## Estado das Avaliações Corporais

`BodyMetricsService` centraliza a comunicação HTTP e não mantém cache ou store global de avaliações. As páginas usam signals locais. Cadastro navega para o detalhe; edição substitui os dados pela resposta do PUT; exclusão limpa e recarrega o histórico. As demais consultas são refeitas ao visitar as telas novamente, comportamento protegido por testes de integração entre rotas.

Evolução e comparativo compartilham um período aplicado e cancelam requisições anteriores ao mudar a consulta ou destruir a página. Gráficos usam SVG e transformações de apresentação; indicadores, agregação mensal e variações permanecem sob responsabilidade do backend. Os fluxos e contratos estão descritos em [Avaliação corporal](../body-metrics/README.md).

## Estado do Catálogo de Exercícios

`ExerciseService` centraliza consultas de exercícios e classificações auxiliares em `/api/exercise-catalog`, sem cache de respostas. Listagem e detalhe mantêm dados e estados locais em signals. `ExerciseCatalogStateService`, fornecido na raiz, guarda os filtros aplicados, a página e o tamanho em memória: abrir um detalhe e voltar refaz a consulta com esse contexto; recarregar a aplicação reinicia a busca. Essa preservação é intencional e não acrescenta persistência em storage ou query string.

O formulário mantém alterações pendentes separadas dos filtros aplicados. A paginação usa a busca aplicada; aplicar ou limpar todos os filtros reinicia na página zero. A dependência entre grupo e subgrupo organiza as opções visíveis no formulário, enquanto busca e filtragem dos exercícios permanecem no backend.

As consultas auxiliares têm carregamento e recuperação próprios. No detalhe, o nome do grupo muscular é resolvido por consulta auxiliar independente; uma falha nessa consulta preserva os dados do exercício e permite retry. Os contratos, estados e a representação de papéis musculares estão em [Catálogo de Exercícios](../exercises/README.md).

`ExerciseCatalogComponent` também expõe modo `select`, com seleção múltipla ou única, IDs indisponíveis e eventos de confirmação/cancelamento. O detalhe do ciclo compõe essa API pública e fornece uma instância local de `ExerciseCatalogStateService`, isolando os filtros da seleção em relação ao catálogo normal. O catálogo não grava atividades nem conhece as regras de lifecycle do ciclo.

## Estado do Workout Planning

`WorkoutPlanningService` centraliza contratos de `TrainingGoal`, `WorkoutCycle`, `WorkoutDay` e `WorkoutActivity`, sem cache de respostas. Catálogo, criação e detalhe mantêm signals locais; `WorkoutCycleCatalogStateService` preserva filtros e paginação em memória. Formulários e componentes de campos pertencem ao domínio, reutilizando os elementos visuais de `shared`.

Os objetivos ativos vêm da API. A seleção de exercícios reutiliza o catálogo e prepara inclusões individuais com prescrição híbrida, sem exclusividade artificial por tipo de atividade. Após mutações de dias e atividades, uma nova consulta apresenta a composição e as posições normalizadas pelo backend. Reorder envia somente a posição desejada e, para dias, o `weekDay` de destino.

A UI reflete permissões por status: edição e composição em `NOT_STARTED`/`IN_PROGRESS`, estados terminais somente para consulta e exclusão de ciclo apenas em `NOT_STARTED`. O backend é autoridade para ownership, pré-condições de início e transições; a interface apresenta suas recusas. Não há execução de sessões ou cálculo de progresso do ciclo. Contratos, feedbacks e decisões estão em [Workout Planning](../workout-planning/README.md).

## Recortes Atuais

Não fazem parte da v1.0.0: execução ou histórico de sessões de treino, geração por IA/agent, métricas de aderência, progresso percentual de ciclos, deploy ou publicação de artefatos. Os três cards da Home usam dados reais do backend. Não há sincronização entre abas ou confirmação de alterações não salvas; formulários corporais e de planejamento não possuem guard de saída próprio. A regra de troca obrigatória de senha é direcionada pela resposta do login; o `authGuard` verifica somente a existência de usuário no estado local.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
