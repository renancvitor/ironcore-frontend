# v1.2.0 - Workout Session, Experiência e Sessão Autenticada

## Resumo

Documentação preparada para a próxima release proposta, ainda não publicada. Consolida o delta [`v1.1.0...main`](https://github.com/renancvitor/ironcore-frontend/compare/v1.1.0...main), revisado em 04/11/2026 até `4cadbc47af4db4ebcbca4cac1655f599ae72fa22`, HEAD local e remoto no início da revisão. O fechamento corresponde à [Issue #101](https://github.com/renancvitor/ironcore-frontend/issues/101).

A última release oficial é [v1.1.0](https://github.com/renancvitor/ironcore-frontend/releases/tag/v1.1.0), publicada em 24/10/2026. A sequência publicada `v1.0.0`, `v1.0.1`, `v1.1.0` distingue correções/integração e evolução funcional; por acrescentar Workout Session, `v1.2.0` é a proposta incremental minor. `package.json` permanece em `0.0.0` e não define a numeração pública. O milestone `v1.0.0` de Workout Session é independente da release; a orientação inicial de pre-release da Issue não representa publicação ou uma tag já decidida.

## Principais Mudanças

- Workout Session: início, recuperação, encerramento, execução parcial, relatos opcionais, histórico, detalhamento e edição posterior.
- Evolução de força e cardio por exercício, com gráficos e tabelas de dados reais, preservando zeros e lacunas.
- Edição inline de séries, seções recolhíveis, referências persistentes, ações e ícones padronizados.
- Sidebar com grupo Treinos, atalhos no planejamento e retorno contextual entre sessões, histórico e evolução.
- Home com treinos de hoje, início/continuidade de sessão e revalidação da sessão ao retomar o aplicativo.
- Recuperação de autenticação com refresh token, coordenação entre abas, tratamento de `401`/`429`, integração CSRF e política de conteúdo.

## Inventário das Entregas

O inventário foi feito antes das alterações documentais, com `git log v1.1.0..main`, `git diff --stat v1.1.0...main` e revisão dos arquivos Angular, templates, estilos e specs afetados. São 23 commits e 107 arquivos no delta funcional/documental original. A revisão inclui commits diretos, sem restringir o escopo às Issues do milestone.

| Commits / PR                                                                                  | Entregas e áreas revisadas                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2002f32` — PR #96                                                                            | Documentação de `weekStartsOn`, já entregue na release anterior; o commit documental está após a tag `v1.1.0`. Não é nova funcionalidade desta versão.                                         |
| `74bf9e4` — [PR #102](https://github.com/renancvitor/ironcore-frontend/pull/102)              | Modelos/serviço de sessões, início pelo detalhe do ciclo, recuperação, encerramento, rotas e navegação.                                                                                        |
| `db4b665` — [PR #103](https://github.com/renancvitor/ironcore-frontend/pull/103)              | Formulários de execução, editor, atividades/séries, relatos, `TOTAL`/`PER_SIDE`, reconciliação e proteção de rascunhos.                                                                        |
| `a1841a7` — [PR #104](https://github.com/renancvitor/ironcore-frontend/pull/104)              | Histórico, busca/datas/paginação, contexto em memória, detalhe e edição posterior, snapshots e vínculos opcionais.                                                                             |
| `c66fc5b` — [PR #105](https://github.com/renancvitor/ironcore-frontend/pull/105)              | Analytics de força/cardio, SVG/tabela, período e navegação contextual; catálogo em seleção única e utilitários de período compartilhados com Body Metrics.                                     |
| `9c74003`, `6d14324`, `9b34d43`                                                               | Edição inline mobile, cancelamento correto e testes das seções recolhíveis.                                                                                                                    |
| `bdaeaa5`, `181cd76`, `00f50d3`                                                               | Informações persistentes de sessão/exercício, rótulos amigáveis do modo de carga e hierarquia das seções de execução.                                                                          |
| `138878b`, `fa04300`, `a9b524f`, `041c79c`, `c5dced0`, `8e3d279`                              | Agrupamento de treinos na sidebar, quebra de texto, ícones do header/planejamento e ações de início/encerramento de sessão.                                                                    |
| `5209d26`, `36dc19e`                                                                          | Histórico em grade e tabela de evolução concentrada em início, treino e indicador selecionado.                                                                                                 |
| `24aa1ef`, `86c8ed0`                                                                          | `TodayWorkoutsCardComponent`, Home, atalhos de sessão, conferência de resultado incerto e revalidação ao receber foco/visibilidade.                                                            |
| `1a1c4db` — Issue #106 / [PR #107](https://github.com/renancvitor/ironcore-frontend/pull/107) | `SessionService`, autenticação, perfil/senha, interceptors, CSRF, Web Locks/BroadcastChannel, limite UTF-8 de senha, `_headers`, script externo de tema e configuração de otimização do build. |
| `4cadbc4` — Issue #108 / [PR #109](https://github.com/renancvitor/ironcore-frontend/pull/109) | Ajuste exclusivamente visual dos ícones `check`/`close` de aplicar/cancelar modo de carga. Não altera semântica, handlers, confirmação ou bloqueios.                                           |

Os componentes de detalhe/atividade/série, histórico, evolução/gráfico e os serviços da feature estão descritos em [Workout Session](../../workout-session/README.md). Home, rotas, header/sidebar, testes de integração e infraestrutura transversal também foram conferidos. As mudanças nos utilitários de Body Metrics extraem funções de período para `shared/utils`, preservando sua utilização pelo módulo corporal.

## Funcionalidades e Experiência do Usuário

Planejamento continua definindo ciclos, dias, atividades e prescrição. Sessões guardam snapshots e execução informada: repetições, carga e relato por série; duração, distância e relato por atividade; relato geral separado. Dados são opcionais, preenchimento parcial é aceito e a prescrição não preenche execução. Encerrar não confirma exercícios planejados.

O início usa dias com atividades em ciclos `IN_PROGRESS`; resultados incertos levam à consulta da sessão existente antes de outra abertura. O detalhe atualiza a sessão ao voltar à visibilidade, preservando rascunhos por reconciliação. Encerramento exige confirmação, informa o descarte de pendências e apresenta a razão recebida (`MANUAL`/`AUTO_EXPIRED`). A expiração é definida pela API.

Séries usam edição inline e salvamento individual. Seções recolhíveis mantêm pendências e erros visíveis; descarte e exclusão têm confirmação própria. `TOTAL` e `PER_SIDE` aparecem como Carga total/Carga por lado. Aplicar outro modo reinterpreta números mantidos, sem acrescentar peso presumido ou salvar rascunhos de séries. A interface permite corrigir registros de sessões encerradas conforme a API, sem reabertura.

Histórico oferece busca por nome, datas e paginação, com contexto em memória. Snapshots permitem leitura mesmo sem os vínculos atuais; evolução contextual exige `exerciseId` válido. Força mostra carga normalizada máxima e volume; cardio mostra distância, duração, pace e velocidade, com resumo da API. Nulos interrompem linhas e aparecem como `—`; zero continua sendo dado registrado. Período, exercício e indicador são preservados na URL ao consultar sessões históricas.

A Home acrescenta todos os treinos previstos para o dia local entre os ciclos em andamento, além da sessão ativa consultada separadamente. Não escolhe um treino principal nem classifica automaticamente um treino como realizado. Foco/visibilidade revalidam a sessão; a composição completa dos ciclos não é recarregada por esse evento. A navegação global e a responsividade seguem os componentes e tokens existentes.

## Notas Técnicas

- Arquitetura Angular standalone e rotas lazy sob AppShell preservadas; nova feature em `features/workout-sessions`, sem store global de execução.
- `WorkoutSessionsService` centraliza HTTP de execução e analytics. O editor mantém rascunhos locais, reconcilia valores confirmados e exige revisão em conflitos. Guards e `beforeunload` protegem pendências, sem oferecer armazenamento offline.
- Mutações confirmadas renovam a consulta; escritas de resultado incerto não são repetidas automaticamente. Séries são identificadas por registros e posição ao recuperar.
- Os gráficos são SVG e recebem os indicadores calculados pela API. Não há agregação mensal artificial de sessões nem substituição de nulos por prescrição/zero.
- Validações de interface antecipam inteiros positivos para repetições/duração e decimais não negativos para carga/distância. Domínio, integridade, ownership e permissões permanecem no backend.

## Integração e Segurança

`SessionService` consulta `/api/users/me` antes de usar `/api/auth/refresh`. Compartilha recuperação na aba e usa Web Locks para serializar operações entre abas. BroadcastChannel comunica alterações/logout e resultados incertos sem transportar credenciais. Sem Web Locks, o refresh automático não é enviado. Revisões de autenticação evitam aceitar respostas obsoletas após mudanças de sessão.

Após recuperação de um `401`, somente `GET`/`HEAD` elegíveis são repetidos uma vez. Escritas exigem nova ação do usuário. Login, logout, refresh, troca inicial e obtenção de CSRF não entram em recuperação recursiva. A alteração normal de senha possui recuperação específica sem repetir sua escrita. Falhas de logout apresentam feedback e não garantem limpeza local.

`429` de autenticação com `Retry-After` válido bloqueia novas tentativas locais por endpoint até o prazo. CSRF cobre escritas, incluindo autenticação, e compartilha somente a obtenção pendente de token. O estado do usuário fica em memória; tokens são transportados em cookies gerenciados pelo navegador/backend. Angular não define expiração, emissão, rotação ou ownership.

`public/_headers` declara CSP e headers de proteção; tema inicial foi movido para script externo e o build desativa `inlineCritical`. Scripts usam a própria origem; estilos inline continuam permitidos. Bindings Angular apresentam os dados de usuário sem introduzir bypass de sanitização. Primeiro acesso e alteração de senha antecipam 72 bytes UTF-8 para nova senha/confirmação. Detalhes e limites estão em [Arquitetura](../../architecture/README.md) e [Deploy](../../deploy/README.md).

## Testes e Validações

Executados em 04/11/2026 (America/Sao_Paulo), sobre o código funcional `4cadbc47`, durante a revisão documental:

| Verificação                 | Resultado                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`             | Aprovado; bundle inicial de 351,88 kB. Aviso existente: SCSS de `workout-cycle-detail` com 5,61 kB, 611 bytes acima do budget de aviso de 5 kB. |
| `npm test -- --watch=false` | Aprovado: 1.181 testes em 79 arquivos, sem falhas.                                                                                              |

A suíte cobre infraestrutura, autenticação, domínios anteriores, sessões, execução parcial, recuperação/conflitos, histórico, analytics, Home e navegação. HTTP é simulado; esses resultados não comprovam integração autenticada com produção.

A conferência de 20 documentos e 183 referências locais não encontrou destinos ou âncoras ausentes. O diff contém 14 arquivos exclusivamente documentais, preservando os documentos de `v1.0.0` e anteriores. Prettier foi aplicado aos documentos correntes e à preparação; `git diff --check` passou. As notas oficiais incorporadas preservam seu texto. O inventário acima cobre todos os commits do delta revisado.

Não houve nova bateria visual em navegador, auditoria completa de acessibilidade, verificação dos headers/CSP servidos em produção ou validação da automação do GitHub Project nesta tarefa. Nenhum código funcional foi alterado para corrigir o aviso de build.

## Limitações Conhecidas

- API e configuração compatível de cookies, CORS, CSRF e refresh são necessárias. Coordenação entre abas depende das APIs do navegador; não equivale a atualização em tempo real de dados de domínio.
- Rascunhos e contexto de filtros do histórico ficam em memória. Recarregar/sair descartando não preserva alterações ainda não gravadas.
- Edição posterior continua sujeita a permissões e respostas do backend. Vínculos excluídos preservam snapshots, mas podem impedir evolução por exercício.
- Treinos de hoje usam o calendário local do navegador; evolução usa datas de referência de São Paulo. O card não resolve atrasos, aderência ou uma sequência automática de treinos.
- O aviso de orçamento SCSS e as validações de produção/visuais não executadas acima permanecem registrados para revisão, sem correção funcional nesta Issue.

## Não Incluído Nesta Release

- Geração de treinos por IA/agent, prescrição automática ou recomendações a partir dos gráficos.
- Métricas de aderência e progresso percentual de ciclos inferidos do planejamento.
- Campos estruturados novos de RIR, energia ou dor, persistência offline ou sincronização em tempo real de execução.
- Avisos antecipados de expiração de autenticação, contadores visuais ou novas regras de autenticação.
- Publicação de GitHub Release, tag, merge automático ou deploy manual nesta tarefa.

## Documentação e Reconciliação Histórica

As notas oficiais de `v1.0.1` e `v1.1.0` foram incorporadas às suas próprias pastas, com fonte/data registradas. Os documentos de `v1.0.0` e anteriores permanecem preservados. O [índice de releases](../README.md) separa versões publicadas desta preparação.

Documentos correntes: [README principal](../../../README.md), [índice técnico](../../README.md), [Arquitetura](../../architecture/README.md), [ações mobile](../../architecture/mobile-actions.md), [estrutura](../../project-structure/README.md), [Workout Planning](../../workout-planning/README.md), [Workout Session](../../workout-session/README.md), [Home](../../card-resume/README.md), [Exercícios](../../exercises/README.md) e [Deploy](../../deploy/README.md).

<p align="right"><a href="../README.md">Voltar para releases</a></p>
