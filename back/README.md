# ConetaAI - Backend

API em Node.js + Express que dá suporte ao app ConetaAI (cadastro, login, perfis, vagas, busca, curtidas/matches e chat).

## Como os dados são guardados

Os dados ficam no **PostgreSQL** (banco `conetaai`). Os scripts que criam e povoam o banco estão em [`sql/`](sql/) e o passo a passo está no README da raiz do repositório.

```
rotas (src/routes)  →  repositório (src/repositorio)  →  PostgreSQL
```

- As rotas validam a requisição e chamam funções `async` do repositório.
- O repositório contém **todo o SQL, escrito à mão**: `SELECT` com `JOIN`, subconsultas, `INSERT`, `UPDATE`, `DELETE` e transações. Não há ORM nem gerador de consultas.
- O driver `pg` é usado **apenas** para abrir a conexão e enviar os comandos ([`src/db.js`](src/db.js)). Os valores vão como parâmetros (`$1`, `$2`, ...) e nunca são colados no texto do SQL, o que evita *SQL injection*.
- Regras de integridade são do próprio banco: `UNIQUE`, `CHECK`, chaves estrangeiras, `ON DELETE CASCADE` e as chaves estrangeiras compostas do match (a regra "só existe match com as duas curtidas" não usa triggers). A API também valida antes, para devolver mensagens claras.

## Como rodar

O passo a passo (PostgreSQL ligado, banco criado, senha em `PGPASSWORD`, `npm install` e `npm start`) está em [Como rodar](../README.md#como-rodar), no README da raiz. Ao iniciar, o servidor confere a conexão com o banco e, se algo estiver errado (serviço parado, senha incorreta, banco inexistente), explica o que fazer e encerra.

Variáveis de ambiente que a API lê:

| Variável | Para que serve | Padrão |
|----------|----------------|--------|
| `PGPASSWORD` | senha do usuário do banco (**nunca** fica no código) | – |
| `PGUSER` | usuário | `postgres` |
| `PGDATABASE` | nome do banco | `conetaai` |
| `PGHOST` | endereço do PostgreSQL | `localhost` |
| `PGPORT` | porta do PostgreSQL | `5432` |
| `PORT` | porta da API | `3000` |
| `SEGREDO_TOKEN` | segredo que assina os tokens de login (veja [Segurança](../README.md#segurança)) | (temporário) |

O servidor sobe em `http://localhost:3000/api`. Depois de qualquer alteração no código, reinicie o servidor (ou use `npm run dev`, que reinicia sozinho). Os dados **não se perdem** ao reiniciar.

## Usuários de teste

Os seis perfis de demonstração (4 estudantes e 2 empresas, todos com a senha `123456`) estão descritos em [Logins de teste](../README.md#logins-de-teste), no README da raiz. Também é possível criar contas novas pela tela de cadastro.

## Autenticação e autorização

O login devolve um **token** (como senhas e tokens funcionam está em [Segurança](../README.md#segurança), no README da raiz). Todas as outras rotas, exceto as públicas, exigem:

```
Authorization: Bearer <token>
```

Quem está chamando vem **do token**: ids digitados no corpo ou na URL nunca dão acesso ao que é de outra pessoa.

| Resposta | Quando |
|----------|--------|
| `401` | token ausente, adulterado, expirado ou assinado com outro segredo; também no login com e-mail ou senha errados |
| `403` | o token é válido, mas a ação é de outra pessoa (por exemplo, editar o perfil de outro estudante) |

**Rotas públicas** (sem token): `GET /api`, `POST /api/auth/login`, `POST /api/estudantes` (cadastro), `POST /api/empresas` (cadastro), `GET /api/cursos`, `GET /api/tecnologias`.

**Quem pode o quê:**

| Rota | Regra |
|------|-------|
| `GET/PUT /api/estudantes/:id` | só o próprio estudante |
| `GET/PUT /api/empresas/:id` | só a própria empresa |
| `GET /api/vagas`, `GET /api/vagas/:id` | qualquer pessoa logada. `?estudanteId=` só o próprio estudante; `?empresaId=` só a própria empresa |
| `POST /api/vagas` | só empresa. A dona é sempre a empresa logada |
| `PUT /api/vagas/:id/status`, `DELETE /api/vagas/:id`, `GET /api/vagas/:id/candidatos` | só a empresa dona da vaga |
| `POST /api/likes` | `origem: "estudante"` só pelo próprio estudante; `origem: "empresa"` só pela empresa dona da vaga |
| `GET /api/matches` | cada um vê só os próprios (estudante: os dele; empresa: os das vagas dela) |
| `GET/POST /api/mensagens` | só os participantes do match: o estudante dele e a empresa dona da vaga. `enviadoPor` precisa ser o tipo de quem está logado |

## Endpoints

Os ids de estudantes, empresas, vagas, matches e mensagens são **números inteiros** gerados pelo banco (`1`, `2`, `3`...).

### Autenticação
- `POST /api/auth/login` — `{ email, senha, tipo: "estudante" | "empresa" }`. Resposta: `{ tipo, usuario, token }`

### Listas fechadas
- `GET /api/cursos` — cursos disponíveis (`[{ id, nome }]`)
- `GET /api/tecnologias` — tecnologias disponíveis (`[{ id, nome }]`)

Cursos e tecnologias **não são texto livre**: o backend recusa nomes fora dessas listas (ignorando maiúsculas e acentos) e guarda sempre o nome oficial.

### Estudante
- `POST /api/estudantes` — cadastro: `{ nome, email, senha, curso, cidade, modalidade, disponibilidadeMeses, habilidades?, areasInteresse?, previsaoConclusao? }` (e-mail único, senha de 6 a 100 caracteres). A resposta traz o perfil e o `token`: quem se cadastra já entra
- `GET /api/estudantes/:id`
- `PUT /api/estudantes/:id` — atualiza o perfil

Validações do perfil:
- `areasInteresse` (atributo multivalorado do ER): lista de textos não vazios, com até 60 caracteres. Repetições são removidas (ignorando maiúsculas e acentos).
- `previsaoConclusao`: texto vazio ou ano-mês no formato `AAAA-MM` (ex.: `2027-12`).

### Empresa
- `POST /api/empresas` — cadastro: `{ nome, email, senha, setor, cidade }` (e-mail único). A resposta traz o perfil e o `token`
- `GET /api/empresas/:id`
- `PUT /api/empresas/:id` — atualiza a página da empresa

### Vagas
- `GET /api/vagas` — lista vagas. Filtros opcionais (combináveis):
  - `empresaId`, `status` (`Ativa` ou `Encerrada`), `cidade` (contém), `modalidade`, `tecnologia`, `q` (cargo ou empresa)
  - `estudanteId=1` — cada vaga vem com o score de compatibilidade e a flag `curtida`
  - `feed=1` — modo swipe: só vagas ativas que o estudante ainda não curtiu
  - `ordenar=compatibilidade` — do maior para o menor score
- `GET /api/vagas/:id` — detalhe de uma vaga
- `POST /api/vagas` — empresa publica uma vaga: `{ cargo, cursoDesejado[], tecnologias[], modalidade, cidade, faixaSalarial, periodoMinimoMeses }` (a dona é a empresa logada)
- `PUT /api/vagas/:id/status` — `{ status: "Ativa" | "Encerrada" }`
- `DELETE /api/vagas/:id` — exclui a vaga e suas curtidas, matches e mensagens
- `GET /api/vagas/:id/candidatos` — estudantes compatíveis, do maior para o menor score. Opções: `?scoreMinimo=50`, `?ocultarCurtidos=1`

Alterar status, excluir e ver os candidatos só é permitido para a empresa dona da vaga (`403` caso contrário).

### Curtidas e matches
- `POST /api/likes` — `{ origem: "estudante" | "empresa", estudanteId, vagaId }`
  - `origem: "estudante"`: o estudante logado curtiu a vaga (o `estudanteId` precisa ser o dele).
  - `origem: "empresa"`: a empresa logada curtiu o estudante **para uma vaga que é dela** (`403` caso contrário).
  - Se os dois lados já curtiram, o match é criado na hora (`houveMatch: true`). Vagas encerradas não aceitam curtidas. Curtir duas vezes não duplica.
- `GET /api/matches` — os matches de quem está logado: do estudante, ou de todas as vagas da empresa
- `GET /api/matches?vagaId=1` — só os de uma vaga
- `GET /api/matches?...&desde=2026-11-01T00:00:00.000Z` — só os matches criados a partir da data (é o que o painel da empresa usa para "Matches este mês")

### Chat
- `GET /api/mensagens/:matchId` — histórico de mensagens de um match
- `POST /api/mensagens` — `{ matchId, enviadoPor: "estudante" | "empresa", texto }` (`enviadoPor` fora desses dois valores retorna `400`)

## Exemplo de fluxo completo (curl)

```bash
# 1. entrar como estudante (Luan) e como empresa (Nortel); cada resposta traz um "token"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luan@email.com","senha":"123456","tipo":"estudante"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contato@nortelsistemas.com.br","senha":"123456","tipo":"empresa"}'

# 2. o estudante curte a vaga 1 (troque TOKEN_DO_LUAN pelo token recebido)
curl -X POST http://localhost:3000/api/likes \
  -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN_DO_LUAN" \
  -d '{"origem":"estudante","estudanteId":1,"vagaId":1}'

# 3. a empresa dona da vaga curte o mesmo estudante para a mesma vaga -> dá match
curl -X POST http://localhost:3000/api/likes \
  -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN_DA_NORTEL" \
  -d '{"origem":"empresa","estudanteId":1,"vagaId":1}'

# 4. enviar mensagem no match criado (troque o 1 pelo id do match retornado acima)
curl -X POST http://localhost:3000/api/mensagens \
  -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN_DO_LUAN" \
  -d '{"matchId":1,"enviadoPor":"estudante","texto":"Olá! Vamos conversar sobre a vaga?"}'
```

## Limitações conhecidas e próximos passos

- Limite de tentativas de login (hoje é possível tentar senhas sem restrição).
- HTTPS (a comunicação entre front e API é HTTP).
- Revogação de tokens antes da validade (por exemplo, ao trocar a senha) e renovação automática da sessão.
- Recuperação e troca de senha.
- Restringir o CORS: hoje a API aceita chamadas de qualquer origem (os dados continuam protegidos pelo token).
