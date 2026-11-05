# Workout Session

## Propósito

A feature `features/workout-sessions` implementa início, recuperação, execução, encerramento, histórico e evolução de treinos. [Workout Planning](../workout-planning/README.md) mantém a composição e a prescrição; Workout Session registra o que a pessoa efetivamente informou. Encerrar uma sessão não confirma execução das atividades planejadas.

## Estrutura e Responsabilidades

| Área                                                                | Responsabilidade                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `workout-sessions.models.ts`, `workout-session-analytics.models.ts` | Contratos de sessão, execução e evolução.                                                |
| `workout-sessions.service.ts`                                       | HTTP de sessões e analytics por `API_BASE_URL`, sem cache de respostas.                  |
| `workout-session-start.service.ts`                                  | Abertura e recuperação de resultado incerto, reutilizadas pelo planejamento e pela Home. |
| `workout-session-execution.form.ts`                                 | Formulários, validações e patches dos campos alterados.                                  |
| `detail`                                                            | Página, estado local do editor, reconciliação e guards de navegação.                     |
| `detail/activity`, `detail/set`                                     | Execução por exercício e edição inline das séries.                                       |
| `history`                                                           | Consulta paginada e contexto de filtros em memória.                                      |
| `progress`                                                          | Seleção de exercício, período, indicadores, gráfico SVG e tabela.                        |

## Rotas e Navegação

As rotas são protegidas pelo `authGuard` do AppShell e carregadas com `loadComponent`:

| Rota                         | Comportamento                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `/workout-sessions`          | Consulta a sessão em andamento e redireciona para seu ID; apresenta estado vazio quando não existe. |
| `/workout-sessions/history`  | Histórico de sessões encerradas.                                                                    |
| `/workout-sessions/progress` | Evolução por exercício e período.                                                                   |
| `/workout-sessions/:id`      | Detalhe e edição dos registros da sessão identificada.                                              |

As rotas estáticas precedem `:id`. A sidebar agrupa Planejamento de treinos, Sessão de treino em andamento, Histórico de sessões e Evolução de treinos em `Treinos`. O destaque do detalhe acompanha `from=history` ou `from=progress`; sem essas origens, acompanha a sessão em andamento.

O detalhe retorna à evolução quando aberto com `from=progress`; retorna ao histórico quando aberto com `from=history` ou quando a sessão está encerrada; nos demais casos retorna ao planejamento. O ciclo de origem pode ser aberto quando seu vínculo existe. Não há retorno específico à Home no detalhe da sessão.

## Integração com a API

Os caminhos abaixo são relativos a `/api/users/me/workout-sessions` e centralizados em `WorkoutSessionsService`:

| Método   | Caminho                                     | Uso                                                  |
| -------- | ------------------------------------------- | ---------------------------------------------------- |
| `POST`   | raiz                                        | Iniciar com `workoutCycleId` e `workoutDayId`.       |
| `GET`    | `/in-progress`                              | Recuperar a sessão em andamento.                     |
| `GET`    | `/:id`                                      | Consultar detalhe, snapshots e registros executados. |
| `PATCH`  | `/:id/close`                                | Encerrar, com corpo `null`.                          |
| `PATCH`  | `/:id/notes`                                | Atualizar relato da sessão.                          |
| `PATCH`  | `/:id/activities/:activityId/execution`     | Atualizar duração, distância e relato da atividade.  |
| `POST`   | `/:id/activities/:activityId/sets`          | Criar série com `setNumber` e dados opcionais.       |
| `PATCH`  | `/:id/activities/:activityId/sets/:setId`   | Editar dados da série.                               |
| `DELETE` | `/:id/activities/:activityId/sets/:setId`   | Excluir série com confirmação.                       |
| `PATCH`  | `/:id/activities/:activityId/load-mode`     | Reinterpretar o modo de carga da atividade.          |
| `GET`    | raiz                                        | Histórico com `page`, `size` e filtros.              |
| `GET`    | `/analytics/exercises/:exerciseId/strength` | Evolução de força com `startDate` e `endDate`.       |
| `GET`    | `/analytics/exercises/:exerciseId/cardio`   | Evolução de cardio com o mesmo período.              |

Cookies, CSRF, recuperação de autenticação e erros seguem [Arquitetura](../architecture/README.md). O cliente não envia `personId` para escolher o proprietário da sessão. Ownership, permissões, datas, snapshots, normalização e expiração pertencem à API.

## Início, Recuperação e Encerramento

O detalhe do planejamento oferece início nos dias com atividades de ciclos `IN_PROGRESS`, com bloqueios locais durante operações incompatíveis. A [Home](../card-resume/README.md) também oferece início pelos treinos do dia e continuidade da sessão existente.

Uma abertura bem-sucedida navega para o detalhe. Em `409`, falha de rede (`0`) ou erro `5xx`, `WorkoutSessionStartService` consulta `/in-progress` antes de permitir outra abertura. Quando encontra sessão, oferece `Continuar sessão`; se a consulta falha, mantém a necessidade de verificação. Não repete o POST automaticamente. Erros `400`/`404` também solicitam atualização do planejamento. Somente o `404` com a mensagem `Sessão de treino em andamento não encontrada.` é convertido em ausência de sessão pelo serviço.

O detalhe distingue loading, ausência de sessão ativa, ID inválido/não encontrado e erro com nova consulta. Ao voltar à visibilidade, consulta novamente uma sessão que ainda não esteja localmente `CLOSED`, respeitando os bloqueios de operação. Os dados recebidos são reconciliados com os rascunhos.

O encerramento exige confirmação e só está disponível em `IN_PROGRESS`, sem operação ou recuperação pendente. Havendo rascunhos, o diálogo permite voltar para salvá-los individualmente ou encerrar descartando-os. A resposta informa `CLOSED` e `MANUAL` ou `AUTO_EXPIRED`; a interface apresenta a razão recebida. Não há cronômetro de expiração no Angular. Se o encerramento falha, a tela consulta o estado atualizado antes de nova tentativa.

## Prescrição e Registro de Execução

Nome do ciclo, título/dia da semana e dados do exercício vêm dos snapshots. Séries, repetições-alvo, carga-alvo, duração, distância, intensidade, descanso e observações planejadas ficam em `Prescrição planejada — referência`. Não são copiados para os campos executados nem usados como substitutos de dados ausentes.

Durante uma sessão em andamento, posições sugeridas pela quantidade planejada de séries são apenas linhas locais vazias. Só uma gravação confirmada cria execução. É possível adicionar séries além da prescrição. No histórico, o editor apresenta os registros persistidos, sem fabricar séries planejadas executadas.

Os dados são opcionais e independentes:

- Série: `actualLoadKg`, `actualReps` e `notes`; uma série pode conter somente um desses dados, inclusive somente relato. Uma série totalmente vazia não é gravada; para remover um registro persistido usa-se exclusão.
- Atividade: `actualDurationMinutes`, `actualDistanceKm` e `notes`, sem exigir séries.
- Sessão: `notes`, salvo separadamente. Relatos vazios após trim são enviados como `null`.

Repetições e duração aceitam inteiros positivos até `2147483647`; carga e distância aceitam de `0` a `999999.99`, com até duas casas decimais. Zero permitido é dado real; campo ausente é `null`. Patches enviam campos alterados e usam `null` para remoção explícita, preservando os demais.

### Modo de Carga

`TOTAL` aparece como `Carga total`; `PER_SIDE`, como `Carga por lado`. É necessário escolher o modo ao registrar carga. Sem carga persistida, a seleção é local. O detalhe apresenta `normalizedLoadKg` retornado pela API; o cliente não inclui peso presumido de barra, corpo ou equipamento.

Na carga por lado, a interpretação considera dois lados equivalentes. Alterar um modo já confirmado exige aplicar a mudança com confirmação: os números digitados são mantidos e reinterpretados, sem conversão dos valores. O PATCH de modo não salva os rascunhos das séries. Conflitos de modo bloqueiam a gravação até revisão. A Issue #108/PR #109 altera exclusivamente a apresentação das ações `Aplicar modo` (`check`) e `Cancelar mudança de modo` (`close`), mantendo handlers, confirmação, labels, tooltips e bloqueios existentes.

## Edição, Preservação e Conflitos

Séries usam edição inline: a linha resumida abre campos no próprio lugar, move o foco para repetições e recolhe após confirmação do salvamento. Cancelar sem alterações fecha; descartar rascunhos modificados exige confirmação. Cancelar uma série adicional ainda vazia remove somente sua linha local. A exclusão de uma série persistida é uma operação própria e confirmada.

As seções recolhíveis separam `Registrar execução`, `Séries e cargas`, `Duração e distância`, relatos e explicação do modo. Pendências, erros e conflitos mantêm as seções pertinentes abertas. Informações da sessão, referências e valores já registrados continuam consultáveis.

O editor mantém rascunhos em memória e reconcilia cada nova consulta com o último valor confirmado. Mudanças concorrentes são sinalizadas para revisão, preservando a digitação local. Após gravação, consulta novamente o detalhe. Em resultados incertos ou `404`/`409`, exige conferência; a criação incerta de série é reconciliada pelo registro/posição e não reenviada automaticamente. A confirmação para tentar novamente usa o mesmo número de série.

`CLOSED` não torna toda execução somente leitura: a interface permite correção posterior de relatos, dados de atividade e séries, inclusive inclusão/exclusão, sujeita às respostas e permissões da API. Não permite reabrir ou encerrar novamente uma sessão fechada. Vínculos excluídos não apagam snapshots; sem `exerciseId`, a evolução contextual do exercício fica indisponível.

Os guards de entrada/saída confirmam o descarte de alterações locais, inclusive ao trocar de ID. Operações pendentes bloqueiam a saída; `beforeunload` solicita a proteção nativa do navegador quando há pendências. Isso não oferece persistência offline: recarregar ou sair descartando perde rascunhos, sem desfazer gravações no servidor.

## Histórico e Detalhamento

O histórico lista sessões `CLOSED`, com busca por nome e datas inicial/final opcionais, validação de datas e ordem do intervalo, aplicar/limpar filtros e paginação (inicialmente página 0, tamanho 20). O contrato também admite `workoutCycleId` e `workoutDayId`; a tela não oferece seletores desses IDs. Aplicar/limpar filtros ou alterar tamanho volta à primeira página.

`WorkoutSessionHistoryState` preserva filtros aplicados e paginação em memória durante a navegação interna; recarregar reinicia esse contexto. A consulta é refeita ao retornar. A grade apresenta treino, ciclo, dia da semana, data, início, fim e razão de encerramento, usando snapshots para manter a leitura histórica. Linhas abrem o detalhe por clique, Enter ou Espaço. Há loading, erro com retry e estados vazios com e sem filtros.

## Evolução de Força e Cardio

A página reutiliza o catálogo em seleção única com estado local de filtros. Pode ser aberta sem exercício ou a partir de uma atividade de sessão encerrada com vínculo válido. Consulta força e cardio independentemente, com loading, erro e retry por família, cancelando consultas anteriores ao trocar o contexto.

O período padrão vai do primeiro dia do mês de cinco meses atrás até hoje em `America/Sao_Paulo`. Datas inválidas/futuras, início posterior ao fim e períodos acima de 12 meses impedem consulta. Ao abrir uma sessão histórica anterior ao período padrão, `sourceDate` ajusta o período para incluí-la quando não há período explícito.

| Família | Indicadores da API                                                                               |
| ------- | ------------------------------------------------------------------------------------------------ |
| Força   | Maior carga normalizada executada (`maxNormalizedLoadKg`) e volume registrado (`volumeKgReps`).  |
| Cardio  | Distância, duração, pace médio e velocidade média; totais e médias do resumo retornado pela API. |

Os contratos incluem contagens de cobertura, mas a apresentação atual concentra os indicadores, sem recalcular volume, normalização, pace, velocidade ou médias a partir da prescrição. `null` aparece como `—` e interrompe a linha do gráfico; zero é preservado. Pontos isolados continuam visíveis, sem interpolação de lacunas. Se não há valor válido para o indicador, há explicação de ausência de dados; indicadores sem valores não podem ser selecionados.

O gráfico SVG e a tabela mantêm os pontos das sessões retornadas, inclusive várias sessões na mesma data, com navegação para o detalhe pelo botão do treino na tabela. A tabela de evolução concentra data, treino, indicador selecionado e ação de detalhe; as contagens técnicas de cobertura não são exibidas na tabela ou nos pontos atuais. Pace usa representação decimal nos valores da tabela e no tooltip dos pontos; o resumo de cardio também apresenta aproximação em minutos/segundos.

Exercício, período, família e indicador ficam na query string, com `sourceSessionId`/`sourceDate` quando aplicáveis. O retorno entre histórico, evolução e detalhe preserva esse contexto validado. Não depende da existência atual do ciclo para apresentar seus snapshots.

## Responsividade, Acessibilidade e Validação

As páginas usam tokens, breakpoints e componentes existentes. Histórico em grade, formulários flexíveis e edição inline reduzem o espaço necessário no mobile; gráfico e tabela de evolução permitem rolagem horizontal. Ações com ícones têm `aria-label` e tooltip, campos possuem rótulos, linhas do histórico e botões de treino na tabela de evolução permitem teclado e feedback usa `role="status"`, `role="alert"` e estados de carregamento nos templates. Isso não constitui auditoria completa de acessibilidade.

Os specs cobrem serviços HTTP, início/recuperação/encerramento, registros parciais, modo de carga, reconciliação, cancelamento, guards, histórico, gráficos, nulos/zeros, Home e navegação contextual com HTTP simulado. A execução desta revisão está registrada em [v1.2.0 — preparação](../releases/v1.2.0/README.md). Nenhum resultado automatizado representa validação autenticada contra produção.

## Fora do Escopo

Geração por IA/agent, prescrição automática a partir da evolução, aderência, progresso percentual de ciclos, sincronização em tempo real dos registros e persistência offline não são entregues. Não há campos próprios de RIR, energia ou dor: o relato permanece texto opcional. Regras de expiração e ownership são da API.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
