# ConetaAI - Frontend

Interface web (HTML + CSS + JavaScript puro) do ConetaAI, que conecta estudantes e empresas para vagas de estágio.

| Arquivo      | O que faz                                                                  |
|--------------|----------------------------------------------------------------------------|
| `index.html` | Todas as telas: login, cadastro, área do estudante, área da empresa, chat  |
| `styles.css` | Estilos (tema claro/escuro automático)                                     |
| `script.js`  | Lógica da interface e chamadas à API                                       |

## Como rodar

O backend precisa estar rodando (veja [Como rodar](../README.md#como-rodar) no README da raiz). Depois, sirva esta pasta com um servidor local simples: `npx serve` dentro de `front/`, ou a extensão **Live Server** do VS Code. Evite abrir o `index.html` direto como `file://`: alguns navegadores bloqueiam `fetch` nesse modo.

Entre com um dos [logins de teste](../README.md#logins-de-teste) ou crie uma conta em **Cadastre-se**.

O endereço da API está na constante `API_BASE`, no topo do `script.js` (`http://localhost:3000/api`). Para abrir o app em outro dispositivo da mesma rede (um celular, por exemplo), troque `localhost` pelo IP do computador que roda o backend (ex.: `http://192.168.x.x:3000/api`).

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
