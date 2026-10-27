# Histórico e correções de sessões — Issue #99

## Integração

A rota lazy `/workout-sessions/history` consulta sessões encerradas. Ela está registrada antes de `/workout-sessions/:id`. A recuperação da sessão ativa em `/workout-sessions` e o detalhe por ID continuam disponíveis dentro do App Shell autenticado.

A Sidebar oferece “Sessão de treino em andamento” e “Histórico de sessões”. Ao abrir uma ficha pelo histórico, `from=history` identifica o retorno e mantém o destaque dessa entrada. Filtros aplicados e paginação ficam em `WorkoutSessionHistoryState`, seguindo o padrão em memória do catálogo de planejamento. São restaurados ao voltar pelo botão da ficha ou pelo navegador; não persistem após recarregar a aplicação.

O detalhe histórico reutiliza `WorkoutSessionDetailComponent`, `WorkoutSessionEditorState`, os componentes de atividade e série e os guards da #98. Não há outro editor ou outra página de detalhe.

## Contrato HTTP

Contrato conferido nos DTOs da `main` do backend e no [PR #322](https://github.com/renancvitor/ironcore-backend/pull/322):

```text
GET /api/users/me/workout-sessions
  ?page=0&size=20
  &workoutCycleId=9&workoutDayId=30
  &startDate=2026-10-01&endDate=2026-10-27
```

Todos os filtros são opcionais e combinados por AND. A resposta é `{ sessions: PageResult<WorkoutSessionHistoryItem> }`, com `content`, `page`, `size`, `totalElements`, `totalPages` e `last`. Os itens têm somente os campos de resumo disponibilizados pelo backend, inclusive snapshots e referências de origem anuláveis. O servidor lista apenas `CLOSED`, com motivos `MANUAL` ou `AUTO_EXPIRED`, e ordena por `performedOn DESC, startedAt DESC, id DESC`. O frontend preserva essa ordem.

As datas são strings `yyyy-MM-dd`, inclusivas e referentes a `performedOn`. Não há conversão dos filtros para instantes UTC. IDs precisam ser inteiros positivos seguros; datas impossíveis e intervalos invertidos impedem a consulta. O paginator usa os metadados da resposta e oferece tamanhos de 10, 20, 50 e 100.

O serviço adiciona somente `listWorkoutSessions`. Detalhe e seis operações de manutenção existentes continuam nos mesmos endpoints. As operações não enviam status, `finishedAt` ou `closeReason`.

## Seleção das origens

A busca por nome consulta páginas de 20 ciclos no serviço de planejamento, sob ação explícita, informa a quantidade encontrada e oferece carregar mais. Uma página de opções não é apresentada como um catálogo completo. A pesquisa vazia permite percorrer todos os ciclos disponíveis.

Somente o detalhe do ciclo escolhido é consultado para oferecer seus dias por nome. Trocar o ciclo limpa o dia anterior e cancela a consulta anterior. A seleção de planejamento serve exclusivamente para obter IDs de filtro; nunca reconstrói nomes, prescrição ou execução históricos.

O serviço atual não oferece um catálogo independente de dias por nome. Para filtrar apenas pelo dia, sem buscar todos os ciclos e seus detalhes, há entrada opcional do código do treino. Selecionar um ciclo permite escolher seu dia por nome. Falhas na busca de origens têm recuperação própria e não impedem consultar o histórico.

Origens removidas continuam apresentadas pelos snapshots, mas IDs anulados não são opções de filtro. Não há filtro por nome histórico na API. Nenhuma dessas limitações exclui tais sessões da consulta sem filtro de origem.

## Correções históricas

Sessões encerradas permitem relato geral, duração/distância/relato de atividade, inclusão explícita de série, edição de repetições/carga/relato, exclusão confirmada e mudança coletiva de `TOTAL/PER_SIDE`. A mudança de modo preserva os números informados. Os campos opcionais continuam independentes e os valores planejados são somente referência.

Abrir uma sessão encerrada não cria placeholders planejados nem registra séries automaticamente. Linhas adicionadas explicitamente são identificadas no estado do editor e preservadas durante a reconciliação, inclusive quando ainda estão vazias. Na expiração de uma sessão em edição, rascunhos são preservados; placeholders intocados são removidos da ficha histórica. Séries não salvas continuam identificadas como rascunhos.

As proteções existentes permanecem: bloqueio de escritas concorrentes, GET após gravação, preservação de rascunhos em falhas, revisão de conflitos, recuperação de POST incerto e confirmação antes de uma nova tentativa com o mesmo número. Não há repetição automática de POST. Exclusão e descarte continuam exigindo confirmação.

O encerramento nunca é reaberto ou alterado pelo editor. A ação “Encerrar sessão” continua restrita a `IN_PROGRESS`. Os guards protegem saída, sidebar, navegador e troca de IDs; autenticação mantém seu redirecionamento. Acesso direto ao detalhe independe de navegação prévia e uma ficha encerrada oferece retorno ao histórico.

## Interface e validação

Cards responsivos mostram data, treino, ciclo, dia da semana, início, término, motivo e acesso à ficha. Loading, ausência geral de sessões, ausência por filtros, página vazia e falha HTTP têm apresentações próprias. A lista cancela consultas anteriores, evita GET simultâneo idêntico e limpa subscriptions ao destruir a página.

Controles possuem labels e IDs únicos; busca por nome aceita Enter, botões são controles nativos, estados usam mensagens acessíveis e o paginator segue a tradução do App Shell. Estilos são locais e usam tokens e mixins existentes. Não foram alteradas dependências, lockfile ou CI.

Validação local em 27/10/2026:

- `npm.cmd run build`: produção aprovada. Aviso existente de 536 bytes acima do orçamento de warning no SCSS do detalhe de planejamento, arquivo não alterado.
- `npm.cmd test -- --watch=false`: 978 testes aprovados em 69 arquivos; inclui contratos HTTP, histórico, editor, componentes, rotas, Sidebar e integração de navegação. O histórico também passou isoladamente com 22 testes.
- Chrome headless com API simulada: histórico, paginação, filtro por data, correção de relato, inclusão explícita de série parcial, retorno com estado, erros e empty states em 1440, 800, 390 e 320 px. Sem transbordamento horizontal ou exceções de runtime.
- `git diff --check`: aprovado.

Os testes HTTP e de navegador usam respostas simuladas coerentes com o contrato. Não foi realizada integração autenticada com uma API real. Capturas e o resultado da verificação de navegador ficam em `dist/session-history-*.png`, `dist/session-detail-*.png` e `dist/session-history-browser-results.json`, ignorados pelo Git.

## Arquivos da entrega

- Novos: componente de histórico (`.ts`, `.html`, `.scss`, `.spec.ts`), serviço de estado do histórico e este documento.
- Alterados: `app.routes.ts` e seu spec; models, serviço HTTP, spec e fixtures de sessões; detalhe (`.ts`, `.html`, `.spec.ts`); estado do editor e spec; template e spec da atividade; integração de navegação; Sidebar (`.ts`, `.html`, `.spec.ts`); índice da documentação.
- Sem mudança: formulário de série, guards, serviço de navegação, App Shell e infraestrutura HTTP. São reutilizados diretamente.

Nenhum commit, push, merge, PR, edição da Issue ou alteração do GitHub Project faz parte desta execução.
