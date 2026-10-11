# Disposição de ações no mobile

## Inventário da revisão

| Tela/componente                                      | Áreas revisadas                                                 | Resultado                                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Login                                                | Enviar formulário                                               | Ação única ocupa a largura do formulário no mobile.                                                   |
| Primeiro acesso                                      | Enviar formulário                                               | Mesmo padrão do login.                                                                                |
| Perfil                                               | Alterar senha; editar, salvar e cancelar campos                 | Cabeçalho com ação à direita; edição com quebra conforme espaço; ícones permanecem agrupados.         |
| Alterar senha                                        | Salvar e cancelar                                               | Distribuição flexível, com duas ações por linha quando couberem.                                      |
| Histórico corporal                                   | Evolução, nova avaliação, excluir, paginação e linhas clicáveis | Cabeçalho horizontal à direita; ações da tabela e paginação preservadas.                              |
| Última avaliação                                     | Voltar ao histórico                                             | Ação na coluna direita do cabeçalho.                                                                  |
| Detalhes/edição de avaliação                         | Editar, voltar, salvar e cancelar                               | Cabeçalho horizontal; rodapé com quebra conforme espaço.                                              |
| Criar avaliação                                      | Salvar e cancelar                                               | Mesmo padrão de rodapé da edição.                                                                     |
| Evolução corporal                                    | Voltar, aplicar período, tipos de visão e tentar novamente      | Cabeçalho à direita; datas e opções flexíveis; aplicar e tentar novamente alinhados à direita.        |
| Home e seus três cards                               | Link de detalhes e rodapé compartilhado                         | Preservados: rodapé já usa flex com wrap e alinhamento à direita. Os outros dois cards não têm ações. |
| Cabeçalho global                                     | Menu, início, tema, sair e perfil                               | Preservado: grupo de ações horizontal já adequado.                                                    |
| Sidebar/app-shell                                    | Links, grupo expansível e navegação                             | Preservados: navegação vertical tem função própria.                                                   |
| Dialog                                               | Confirmar e cancelar, inclusive diálogos de ação única          | Mesmo padrão dos rodapés, sem inversão visual da ordem do DOM.                                        |
| Button                                               | Largura, rótulos e alvo de toque                                | Largura contextual por variável CSS; mínimo de 44px de altura; texto pode quebrar.                    |
| Input e campos corporais compartilhados              | Controles de formulário                                         | Preservados; não definem grupos de ações.                                                             |
| Empty-state, loading, toast, gráficos e comparativos | Conteúdo e estados auxiliares                                   | Sem grupos de botões próprios a ajustar.                                                              |

## Padrão adotado

Os mixins em `src/styles/_actions.scss` são usados dentro de `responsive.mobile`
(até 600px), reaproveitando os tokens de espaçamento existentes:

- `header`: texto flexível e coluna de ações à direita, com quebra do texto.
- `icons`: ícones em linha, sem encolher ou separar ações relacionadas.
- `form`: flex com wrap e base de 9rem por ação. Botões dividem a linha ou
  ocupam uma linha cada quando o espaço interno não comporta o par.

A variável `--ic-action-button-width` controla a largura do botão interno sem
alterar inputs Angular, templates, handlers, validação, estados ou acessibilidade.
As variantes primária/secundária/cancelar continuam responsáveis pela hierarquia.
Não há reordenação por CSS; a ordem visual e a de teclado seguem o DOM existente.
As regras novas não se aplicam a tablet/desktop.

## Validação realizada

- `npm.cmd run build`: aprovado. Permanecem os avisos NG8113 de imports de
  ButtonComponent não utilizados em ProfileComponent e BodyMetricsLatestComponent.
- `npm.cmd test -- --watch=false`: 309 aprovados e 25 falhas em 4 arquivos.
  Uma cópia isolada com os estilos originais de HEAD reproduziu exatamente as
  mesmas 25 falhas: testes de rotas, integração de edição, detalhes e histórico
  ainda procuram ações por texto visível quando os templates usam ícones.
  Esses testes não foram alterados nesta revisão visual.
- Chrome headless com respostas de API simuladas: 10 rotas em 320, 390, 600,
  768 e 1440px, mais edição de perfil, edição de avaliação e diálogo de exclusão
  em cada largura (65 cenários). Checados overflow da página, alinhamento dos
  cabeçalhos, ausência de corte nos botões e distribuição dos rodapés.
- Inspeção de screenshots de 390px: perfil em edição, diálogo, avaliação em
  edição e filtros/estado de erro da evolução.
- `git diff --check`: aprovado.

Os scripts, logs e screenshots da verificação local estão em `dist/`
(diretório ignorado pelo Git). A verificação do navegador não usa dados reais
nem envia alterações ao backend.
