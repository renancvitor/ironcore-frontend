# v1.0.0 - Primeira versão estável do IronCore Frontend

## Resumo

`v1.0.0` é a primeira versão funcional e estável do IronCore Frontend. Ela consolida a primeira implementação funcional completa da interface e encerra a primeira fase do produto no lado cliente: autenticação e conta, avaliação e evolução corporal, consulta de exercícios e planejamento completo de treinos, integrados à Home e à navegação global.

Esta release reúne as entregas acumuladas desde a foundation `v0.1.0`, passando por autenticação/conta (`v0.2.0`), Body Metrics (`v0.3.0`) e Exercise Catalog (`v0.4.0`), e conclui o milestone de Workout Planning. Não é um pre-release. A estabilidade aqui caracteriza o escopo entregue da primeira fase; execução de sessões e geração de treinos com IA continuam como evoluções futuras.

O backend possui sua [própria release estável v1.0.0](https://github.com/renancvitor/ironcore-backend/blob/main/docs/releases/v1.0.0/README.md). O frontend consolida a experiência de uso desses domínios, preservando a API como autoridade de regras, autorização e integridade.

## Principais Mudanças

- Aplicação Angular standalone com rotas carregadas sob demanda, área pública e AppShell autenticado.
- Login, primeiro acesso, troca da senha inicial, restauração de sessão por cookie, logout e proteção das rotas funcionais.
- Perfil com separação de `User` e `Person`, edição de nickname e dados pessoais e alteração de senha.
- Body Metrics com cadastro, histórico paginado, detalhe, última avaliação, edição e exclusão confirmada.
- Evolução corporal com gráficos, seleção de período e comparativo, usando indicadores e diferenças fornecidos pelo backend.
- Exercise Catalog com busca, filtros combinados, classificações auxiliares, paginação, preservação do contexto e detalhe com músculos-alvo e papéis musculares.
- Catálogo de `TrainingGoal` consumido da API, sem duplicação de objetivos no frontend.
- Workout Planning com listagem filtrada e paginada, criação, detalhe, edição e exclusão de ciclos conforme status.
- Composição completa de ciclos com criação, edição, exclusão e reorder de dias e atividades.
- Reutilização do Exercise Catalog em modo contextual, seleção múltipla na inclusão, troca de exercício na edição e representação/prevenção de duplicidade por dia.
- Prescrição híbrida com séries, faixa de repetições, carga numérica/textual, duração, distância, intensidade, descanso e observações combináveis.
- Lifecycle com início, conclusão e cancelamento, refletindo permissões de composição e edição em cada status.
- Home com três cards-resumo reais e independentes: última avaliação corporal, evolução corporal e planejamento de treinos.
- Card de planejamento com prioridade a `IN_PROGRESS`, fallback a `NOT_STARTED`, até três ciclos, indicação de outros resultados, links individuais e `Ver todos`.
- Navegação global pelo header/sidebar e retorno contextual da evolução corporal e do detalhe de ciclo para a Home.
- Temas claro, escuro e do sistema; tokens, breakpoints, formulários e ações responsivos, tabelas/gráficos com rolagem quando necessária.
- Ações com labels acessíveis e tooltips, navegação por teclado, checkboxes rotulados e indicações de estado em templates.
- Testes automatizados de infraestrutura, serviços, componentes, formulários e integração de navegação com HTTP simulado; CI existente para build e testes em `main`.

## Notas Técnicas

- Angular 21, TypeScript, RxJS, Angular Material, SCSS e Vitest sustentam a implementação standalone. `loadComponent` mantém o carregamento sob demanda das páginas dentro do shell protegido por `authGuard`.
- A sessão é restaurada por `GET /api/users/me`. O usuário fica em memória; o frontend não persiste o token de login. O interceptor envia `withCredentials` somente à API e trata `401` globalmente. Cookies e CORS dependem da configuração do backend.
- `core`, `shared`, `layout` e `features` preservam as responsabilidades existentes. Workout Planning concentra seus modelos, HTTP, formulários, catálogo, criação e detalhe em `features/workout-planning`; não cria outro catálogo de exercícios ou infraestrutura global.
- Os serviços não mantêm cache global de dados de domínio. Filtros e paginação dos catálogos são preservados em memória; dados são consultados novamente ao retornar. O seletor de exercícios possui contexto local no detalhe do ciclo.
- O backend resolve ownership a partir da pessoa autenticada. Requests de planejamento não enviam `personId`, status, origem ou datas de lifecycle como campos editáveis.
- `TrainingGoal` é carregado de `/api/training-goals`, com os objetivos ativos expostos pela API. Criação e edição compartilham o formulário de ciclo; o fluxo REST cria ciclos `MANUAL` em `NOT_STARTED`.
- Dias usam `weekDay` e `sortOrder`; atividades usam `orderIndex`. Reorder envia apenas o item e a posição desejada, incluindo o dia da semana de destino quando aplicável. Normalização e renumeração pertencem ao backend, e a composição é consultada novamente após mutações.
- A seleção múltipla prepara uma sequência de inclusões individuais, cada uma com sua prescrição e POST. Não representa gravação em lote atômica. Exercícios já vinculados ao mesmo dia ficam identificados e indisponíveis no seletor; a API garante a unicidade.
- Os dez campos opcionais de prescrição podem coexistir: `sets`, `repRangeMin`, `repRangeMax`, `targetLoadKg`, `targetLoadText`, `durationMinutes`, `distanceKm`, `intensityText`, `restSeconds` e `notes`. A interface não impõe exclusividade por tipo de atividade.
- Lifecycle: `NOT_STARTED -> IN_PROGRESS`, `NOT_STARTED -> CANCELLED`, `IN_PROGRESS -> COMPLETED` e `IN_PROGRESS -> CANCELLED`. Ciclo, dias e atividades são editáveis em `NOT_STARTED` e `IN_PROGRESS`; estados terminais bloqueiam edição e composição. A exclusão do ciclo é permitida somente em `NOT_STARTED`; dias e atividades podem ser excluídos também em `IN_PROGRESS`.
- O início é validado pelo backend: objetivo ativo, pelo menos um dia e ao menos uma atividade em cada dia. O frontend apresenta as recusas retornadas pela API. Conclusão, cancelamento e exclusões possuem confirmação; sucesso usa toast e falhas usam os padrões de feedback existentes.
- A Home compõe `SummaryCardComponent` e APIs públicas das features. Última avaliação reutiliza `contentTemplate`; evolução consulta `/progress/changes`; planejamento consulta a primeira página com tamanho 3 e status `IN_PROGRESS`, recorrendo a `NOT_STARTED` somente quando não há itens. Nenhum ciclo é escolhido como principal; a ordem da API é preservada e `totalElements` informa a existência de mais resultados.
- O insight de tempo em andamento deriva apenas de `startDate`, sem representar sessões, aderência ou progresso. O detalhe aberto pela Home usa `from=home` para retornar ao início; acesso direto ou origem inválida retorna ao catálogo. A evolução corporal mantém seu próprio retorno contextual.
- Loading, erro e vazio são tratados por consulta, sem um estado global que condicione todos os cards. As estratégias específicas de feedback permanecem nas features. Responsividade reutiliza tokens e mixins existentes, sem um novo sistema de layout.

## Limitações Conhecidas

- A integração exige backend disponível e configuração compatível de sessão, cookies e CORS.
- Não há sincronização entre abas nem atualização em tempo real. As páginas renovam consultas ao serem revisitadas; os contextos em memória são reiniciados ao recarregar a aplicação.
- Formulários de planejamento bloqueiam operações locais concorrentes, mas não possuem confirmação de alterações não salvas ou guard de saída próprio. O guard de exclusão do histórico corporal continua específico desse fluxo.
- A validação final desta etapa é automatizada, com HTTP simulado, acompanhada de revisão estática dos contratos e da implementação. Não foi executada nova bateria visual em navegador, auditoria completa de acessibilidade ou integração autenticada contra a API real nesta revisão documental.

## Não Incluído Nesta Release

- Workout Session e execução/acompanhamento real de sessões.
- Histórico de treinos executados, volume real e métricas de aderência.
- Progresso percentual de ciclos ou inferência de sessões concluídas a partir de planejamento.
- Geração de treino por IA/agent; a existência de `AGENT` no contrato não expõe esse recurso na interface.
- Seleção automática de treino de hoje/próximo treino sem regras de execução e dados reais.
- Manutenção do catálogo global de exercícios e classificações pela interface.
- Deploy, publicação de artefatos, criação de tag ou publicação de GitHub Release nesta Issue.

Essas ausências delimitam o escopo da primeira fase e não são classificadas como bugs.

## Documentação e Fechamento

- [Workout Planning](../../workout-planning/README.md): contratos, composição, seleção, prescrição, reorder, lifecycle e revisão dos PRs #79 a #85.
- [Home e Cards-Resumo](../../card-resume/README.md): conteúdo, estados independentes, prioridade de ciclos e navegação contextual.
- [Avaliação corporal](../../body-metrics/README.md) e [Catálogo de Exercícios](../../exercises/README.md): fluxos completos dos demais domínios.
- [Arquitetura](../../architecture/README.md), [Estrutura do projeto](../../project-structure/README.md) e [Ações mobile](../../architecture/mobile-actions.md): organização e padrões implementados.

O fechamento documental corresponde à [Issue #78](https://github.com/renancvitor/ironcore-frontend/issues/78), considerando o código funcional mergeado até `b615a9c` (PR #85). A orientação de release estável v1.0.0 substitui o direcionamento original de pre-release da Issue. Os registros de `v0.1.0` a `v0.4.0` preservam seus recortes históricos.

## Validação Local

Validação final executada em 17/10/2026, no fuso America/Sao_Paulo, com Node.js `v24.19.0` e npm `11.17.0`:

| Comando                     | Resultado                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm test -- --watch=false` | Aprovado: 699 testes em 59 arquivos, sem falhas.                                                                       |
| `npm run build`             | Aprovado: configuração padrão de produção, sem avisos. Bundle inicial de 340,72 kB; saída em `dist/ironcore-frontend`. |

A suíte cobre também os fluxos acumulados de autenticação, conta, Body Metrics e Exercise Catalog. Os testes usam respostas HTTP simuladas e não alteram dados reais. A conferência do backend ocorreu por leitura da documentação e dos contratos REST locais. A automação do GitHub Project não foi validada nesta etapa; o workflow de CI existente permanece responsável por build e testes em pushes e pull requests para `main`.

Nenhum problema funcional que exigisse alteração de código foi identificado nesta revisão. O repositório fica documentalmente preparado para publicar IronCore Frontend v1.0.0; esta preparação não publica a release no GitHub.

<p align="right"><a href="../README.md">Voltar para releases</a></p>
