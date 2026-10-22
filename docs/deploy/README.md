# Deploy e Produção

## Visão Geral

A primeira versão funcional do IronCore está publicada e integrada ao backend. A implantação inicial e os deploys automáticos foram validados em outubro de 2026. Este documento registra a operação de produção; os documentos históricos da v1.0.0 e anteriores preservam o contexto de suas entregas.

As informações do Cloudflare Pages foram fornecidas pelo responsável pela implantação. Os workflows, scripts npm e environments versionados foram conferidos para esta documentação, sem acesso a produção.

## Hospedagem

| Item | Configuração de produção |
|---|---|
| Aplicação | Angular 21 |
| Endereço público | `https://ironcore.dev.br` |
| Hospedagem | Cloudflare Pages, plano gratuito |
| Repositório integrado | `renancvitor/ironcore-frontend` |
| Branch de produção | `main` |
| Node.js | 24 |
| Comando de build | `npm run build` |
| Diretório publicado | `dist/ironcore-frontend/browser` |
| API consumida | `https://api.ironcore.dev.br` |
| Domínio e DNS | Registro.br e Cloudflare, respectivamente |

O Cloudflare Pages publica os arquivos do build Angular. O navegador executa a interface e envia as requisições de dados à API por HTTPS. A API está em uma VPS OVHcloud no Canadá, atrás do Caddy, e acessa o PostgreSQL no Supabase em São Paulo com TLS. O frontend não se conecta diretamente ao banco.

Detalhes da VPS, systemd, banco e publicação do JAR pertencem à [documentação de deploy do backend](https://github.com/renancvitor/ironcore-backend/blob/main/docs/deploy/README.md).

## Build e Environments

O script `build` do [`package.json`](../../package.json) executa `ng build`. O [`angular.json`](../../angular.json) define `production` como configuração padrão de build e `development` como padrão de `serve`.

| Arquivo | Uso | URL da API |
|---|---|---|
| [`environment.ts`](../../src/environments/environment.ts) | Build padrão de produção | `https://api.ironcore.dev.br` |
| [`environment.development.ts`](../../src/environments/environment.development.ts) | Desenvolvimento, por substituição configurada no Angular | `http://localhost:8080` |

`API_BASE_URL` é fornecido pelo environment ativo. Essa configuração é incorporada ao build; alterar o environment exige gerar e publicar um novo build. A URL da API é pública e os environments não devem conter credenciais ou segredos.

## CI e Publicação

### GitHub Actions

O workflow [`CI - Build & Test`](../../.github/workflows/ci.yml) executa em `push` e `pull_request` para a `main`, com Node.js 24 e cache npm. Suas etapas são:

1. Checkout do repositório.
2. Instalação das dependências com `npm ci`.
3. Build com `npm run build`.
4. Testes com `npm test`.

O job usa `ubuntu-latest`, tem limite de 15 minutos e cancela execuções anteriores do mesmo grupo de concorrência. Ele verifica o frontend; não é responsável por publicar no Cloudflare Pages.

### Cloudflare Pages

1. Um commit ou merge chega à `main`.
2. A integração própria entre Cloudflare Pages e GitHub inicia o build de produção com Node.js 24 e `npm run build`.
3. O Pages publica a saída `dist/ironcore-frontend/browser` em `https://ironcore.dev.br`.

Essa integração dispensa um `cd.yml` no repositório frontend. O CI do GitHub e a publicação do Pages são fluxos separados; não há neste repositório um encadeamento que condicione o Pages à conclusão do CI. Não se deve presumir essa dependência ou regras de proteção da branch não documentadas.

O deploy automático do frontend foi validado na implantação inicial, conforme informado pelo responsável pelo projeto.

## Integração e Segurança

- Frontend e API utilizam HTTPS em seus domínios oficiais.
- O backend configura CORS para `https://ironcore.dev.br` em produção, permitindo credenciais.
- O `authInterceptor` envia `withCredentials: true` somente às chamadas identificadas como API. A autenticação utiliza o JWT no cookie `access_token`, com `HttpOnly`, `Secure` e `SameSite=Lax` em produção.
- O `csrfInterceptor` obtém token em `GET /api/auth/csrf` e inclui o header indicado pela resposta antes das chamadas de escrita. Essa proteção também é aplicada aos fluxos de autenticação que usam métodos de escrita.
- A sessão é restaurada por `GET /api/users/me`; o frontend não precisa persistir o JWT em armazenamento do navegador.

As responsabilidades dos interceptors e da sessão estão detalhadas em [Arquitetura](../architecture/README.md).

## Limitações Operacionais

- Publicar os arquivos estáticos não garante disponibilidade do backend ou do banco. Os fluxos autenticados dependem da API.
- Frontend e backend são publicados independentemente. Alterações de contratos devem permanecer compatíveis com as versões em produção durante a atualização.
- O rollback do JAR do backend não reverte o frontend e não desfaz migrations Flyway. A limitação está descrita no documento do backend.
- A origem oficial confirmada é `https://ironcore.dev.br`. Não se presume liberação de CORS para domínios de preview do Pages.
- Não foram fornecidas configurações de preview, regras adicionais de DNS/proxy, política de cache ou um procedimento validado de rollback no Pages. Esses detalhes não são apresentados como implementados.

## Referências

- [Arquitetura](../architecture/README.md).
- [Estrutura do Projeto](../project-structure/README.md).
- [Deploy do Backend](https://github.com/renancvitor/ironcore-backend/blob/main/docs/deploy/README.md).

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
