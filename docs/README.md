# Documentação Técnica

Este diretório centraliza a documentação técnica do IronCore Frontend.

Os documentos descrevem estruturas já implementadas. Convenções e evoluções futuras são identificadas como planejadas e não devem ser interpretadas como funcionalidades entregues.

## Índice

### Fundação e arquitetura

- [Arquitetura](architecture/README.md): bootstrap, HTTP, autenticação, sessão, routing, layout, tema e convenções da aplicação.
- [Estrutura do projeto](project-structure/README.md): diretórios existentes, responsabilidades e regras de dependência.
- [Disposição de ações no mobile](architecture/mobile-actions.md): padrões compartilhados de cabeçalhos, ícones e ações de formulário.

### Produção e operação

- [Deploy e Produção](deploy/README.md): Cloudflare Pages, domínio, environments, CI, publicação automática e integração com a API.

### Features

- [Home e Cards-Resumo](card-resume/README.md): composição, conteúdo, estados, navegação e diretrizes de produto para os cards da Home.
- [Avaliação corporal](body-metrics/README.md): contratos, histórico, detalhe, resumos na Home, cadastro, edição, exclusão, evolução, comparativo e navegação contextual.
- [Catálogo de Exercícios](exercises/README.md): contratos, classificações auxiliares, busca, filtros combinados, paginação, contexto de navegação, detalhe e músculos-alvo.
- [Workout Planning](workout-planning/README.md): objetivos, ciclos, dias, atividades, seleção de exercícios, prescrição híbrida, reorder, lifecycle e integração com a Home.
- [Workout Session](workout-session/README.md): início, recuperação, execução, relatos, modos de carga, histórico, edição e evolução de força/cardio.

### Releases

- [Releases](releases/README.md): índice histórico das releases técnicas.
- [v1.2.0 — preparação](releases/v1.2.0/README.md): delta `v1.1.0...main`, inventário de commits e validações da Issue #101.
- [v1.1.0](releases/v1.1.0/README.md): início da semana configurável; publicada em 24/10/2026.
- [v1.0.1](releases/v1.0.1/README.md): integração segura e deploy em produção; publicada em 22/10/2026.
- [v1.0.0](releases/v1.0.0/README.md): primeira versão funcional e estável do frontend, consolidando a primeira fase do produto.
- [v0.4.0](releases/v0.4.0/README.md): Exercise Catalog, com documentação preparada para o pre-release.
- [v0.3.0](releases/v0.3.0/README.md): Body Metrics.
- [v0.2.0](releases/v0.2.0/README.md): autenticação, sessão e conta.
- [v0.1.0](releases/v0.1.0/README.md): foundation técnica e visual inicial do frontend.

## Observações

- A documentação usa termos técnicos em inglês quando eles representam código, diretórios, ferramentas ou conceitos comuns no desenvolvimento frontend.
- Autenticação, conta, avaliação corporal, catálogo de exercícios, planejamento, execução, histórico e evolução de treinos estão implementados. Geração de treino por IA permanece planejada. A numeração do milestone Workout Session (`v1.0.0`) não define a próxima release.
- Releases anteriores preservam a história do projeto e não devem ser reescritas para refletir o estado atual.

<p align="right"><a href="../README.md">Voltar para a documentação principal</a></p>
