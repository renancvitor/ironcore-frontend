# v0.3.0 - Body Metrics

## Resumo

`v0.3.0` registra a entrega frontend de avaliação corporal sobre os fluxos de autenticação e conta da `v0.2.0`. Ela consolida cadastro, histórico paginado, detalhe, última avaliação, edição, exclusão, evolução e comparação de avaliações corporais, com validações de interface e integração com os contratos do backend.

Esta não é uma release de MVP completo de catálogo de exercícios ou planejamento e execução de treinos.

## Principais Mudanças

- Avaliação corporal com modelos TypeScript e serviço HTTP centralizado em `/api/users/me/body-metrics`.
- Rotas protegidas para histórico, última avaliação, evolução, cadastro e detalhe, carregadas sob demanda dentro do AppShell.
- Histórico por GET paginado, com metadados do backend, paginator em português, loading, empty state, erro e navegação por mouse ou teclado.
- Detalhe por `GET /{id}`, com medidas, indicadores calculados, observações e datas disponibilizadas pela API.
- Última avaliação por `GET /latest`, com página independente e resumo na Home reutilizando o mesmo carregamento.
- Resumo real de evolução na Home por `/progress/changes`, com diferenças de peso e composição corporal, período, datas por medida, loading, empty state e retry.
- Evolução por `/progress/body-composition`, `/progress/circumferences` e `/progress/body-fat`, com período selecionável, gráficos SVG e tabela mensal complementar.
- Acesso da Home e histórico à mesma página `/body-metrics/progress`, com retorno contextual e histórico como fallback para acesso direto ou origem inválida.
- Comparativo por `/progress/changes`, com referências por medida e diferenças absolutas e percentuais recebidas do backend.
- Cadastro por POST, com validações, bloqueio de reenvio durante a requisição, feedback de erro e navegação ao detalhe após sucesso.
- Edição por `PUT /{id}` dentro do detalhe, com formulário compartilhado, loading, preservação dos valores em erro e apresentação da resposta recalculada.
- Exclusão por `DELETE /{id}` no histórico, com confirmação, bloqueio de navegação durante a operação, toast e recarga da listagem.
- Actions com ícones, labels acessíveis e tooltips, além de disposição mobile centralizada para cabeçalhos e formulários.
- Preferência de tema claro, escuro ou do sistema, com aplicação antecipada e acompanhamento das mudanças do sistema.
- Testes unitários e de integração entre rotas para os contratos, estados, formulários, gráficos, comparação e atualização das consultas após mutações.
- Documentação da feature, arquitetura, estrutura e navegação atualizadas para o estado entregue.

## Notas Técnicas

- `BodyMetricsService` utiliza `API_BASE_URL` e a infraestrutura HTTP existente. A sessão continua baseada no cookie do backend, sem persistência de token no frontend.
- O backend resolve a pessoa vinculada ao usuário autenticado. Requests não enviam ownership, datas ou indicadores calculados.
- Peso e altura são obrigatórios; circunferências e observações são opcionais. Os formulários antecipam os limites de 500 kg para peso e 300 cm para altura/circunferências, sem substituir a validação do backend.
- Cadastro e edição reutilizam `createBodyMetricsForm`, validadores e `BodyMetricsFormFieldsComponent`. O PUT envia os campos editáveis completos, incluindo opcionais removidos, e preserva `measuredAt`.
- Detalhe por ID e última avaliação permanecem independentes. O card da Home usa `contentTemplate` de `BodyMetricsLatestComponent`, mantendo um único carregamento e direcionando `Ver detalhes` para `/body-metrics/latest`.
- O card de evolução consulta `/progress/changes` com o período padrão compartilhado, selecionando peso, percentual de gordura, massa gorda e massa magra disponíveis. Preserva as diferenças retornadas e apresenta a diferença absoluta de percentual de gordura em pontos percentuais, separada da variação relativa em `%`.
- `Ver evolução completa` abre `/body-metrics/progress?from=home`, com retorno ao início. O histórico envia `from=history`; acesso direto, origem ausente/inválida e sidebar retornam ao histórico. O contexto é lido da URL, inclusive após recarregamento, sem duplicar a página ou aceitar destinos arbitrários.
- O estado das avaliações corporais é local às páginas, com signals e sem cache global. Consultas são refeitas ao navegar novamente; a edição utiliza a resposta do PUT e a exclusão remove a lista antiga antes de recarregá-la.
- Evolução e comparativo compartilham o período aplicado e cancelam requisições anteriores. A janela inicial cobre seis meses de calendário até hoje; o máximo aceito corresponde a 12 meses a partir da data inicial, menos um dia.
- Os gráficos recebem o último valor válido de cada medida por mês. O comparativo recebe o primeiro e último valor válido por medida no período, com suas próprias datas. O frontend não recalcula indicadores ou variações.
- A apresentação usa locale `pt-BR`, cores estáveis por medida e rolagem horizontal em gráficos e tabelas pequenas. Meses sem dados não geram valores artificiais.
- `MatPaginatorIntl` em português é fornecido pelo AppShell. Rotas estáticas de avaliação corporal precedem a rota dinâmica `:id`.
- `bodyMetricsHistoryGuard` bloqueia a saída da página durante DELETE. O bloqueio é liberado ao término, inclusive em erro.
- O tema usa a preferência `system` quando não há escolha explícita de claro/escuro, persistida pela chave `Ironcore-theme`. A aplicação antecipada em `index.html` acompanha a inicialização do serviço.
- Estrutura, fluxos e contratos utilizados estão detalhados em [Avaliação corporal](../../body-metrics/README.md); as actions responsivas seguem [Disposição de ações no mobile](../../architecture/mobile-actions.md).

## Limitações Conhecidas

- O resumo de evolução da Home usa o período padrão e quatro medidas de composição corporal; outros períodos, circunferências e gráficos ficam na página completa. O card de treinos em andamento permanece sem integração.
- Cadastro e edição bloqueiam ações locais durante gravação, mas não impedem saída pela navegação global nem confirmam alterações não salvas.
- Não há sincronização entre abas ou atualização automática de dados alterados fora da página. A consistência entre telas depende das novas consultas ao visitá-las.
- Erros de validação do backend são apresentados em diálogo, sem mapeamento individual para os controles do formulário.
- A integração depende da disponibilidade e configuração de sessão/cookies/CORS do backend.

## Não Incluído Nesta Release

- Catálogo de exercícios, ciclos, sessões ou histórico de treino na interface.
- Projeções, exportação de avaliações ou comparação por seleção arbitrária de dois IDs.
- Cadastro retroativo ou edição da data de medição, ausentes dos requests utilizados.
- Store global de avaliações corporais, atualização em tempo real ou confirmação de alterações não salvas.
- Deploy, publicação de artefatos, criação de tag ou publicação de GitHub Release.

## Validação Local

Para executar os testes locais:

```bash
npm test -- --watch=false
```

Para validar o build de produção:

```bash
npm run build
```

<p align="right"><a href="../README.md">Voltar para releases</a></p>
