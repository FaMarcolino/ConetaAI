# ConetaAI - Frontend

Interface web (HTML + CSS + JavaScript puro) do ConetaAI, que conecta estudantes e empresas para vagas de estágio.

| Arquivo      | O que faz                                                                  |
|--------------|----------------------------------------------------------------------------|
| `index.html` | Todas as telas: login, cadastro, área do estudante, área da empresa, chat  |
| `styles.css` | Estilos (tema claro/escuro automático)                                     |
| `script.js`  | Lógica da interface e chamadas à API                                       |

## Como rodar na sua máquina

Estas instruções são para rodar o projeto **somente no seu computador**. Para apenas usar o sistema, acesse o [site hospedado](../README.md#link-do-site-hospedado).

O backend precisa estar rodando (veja [Como rodar na sua máquina](../README.md#como-rodar-na-sua-máquina) no README da raiz). Depois, sirva esta pasta com um servidor local simples: `npx serve` dentro de `front/`, ou a extensão **Live Server** do VS Code. Evite abrir o `index.html` direto como `file://`: alguns navegadores bloqueiam `fetch` nesse modo.

Entre com um dos [logins de teste](../README.md#logins-de-teste) ou crie uma conta em **Cadastre-se**.

O endereço da API está na constante `API_BASE`, no topo do `script.js`. Na versão publicada ele aponta para a API hospedada no Render (`https://conecta-ai.onrender.com/api`). Para usar a API da sua máquina, troque-o por `http://localhost:3000/api` (só no seu computador; não envie essa troca para o repositório, senão o site hospedado deixa de funcionar). Para abrir o app em outro dispositivo da mesma rede (um celular, por exemplo), use o IP do computador que roda o backend no lugar de `localhost` (ex.: `http://192.168.x.x:3000/api`).

## O que dá para fazer

**Estudante**
- Criar conta escolhendo curso e habilidades em listas fechadas
- Deslizar vagas (feed) com score de compatibilidade; vagas já curtidas não reaparecem
- **Buscar** vagas por cargo/empresa, cidade, modalidade e tecnologia, e curtir direto pela busca
- Ver matches, conversar no chat e editar o perfil

**Empresa**
- Criar conta e editar a página da empresa
- Publicar vagas escolhendo cursos aceitos e tecnologias em listas fechadas
- Encerrar, reativar e excluir vagas
- Deslizar candidatos compatíveis, ver matches e conversar no chat
