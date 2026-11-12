// src/autenticacao.js
// Segurança da API: hash de senhas e tokens de login.
// Usa apenas o módulo "crypto" que já vem com o Node (nenhuma biblioteca extra).
//
// SENHAS: nunca são guardadas em texto puro. Guarda-se um hash scrypt, que é uma função
// própria para senhas: lenta de propósito e com um "sal" aleatório por senha, então duas
// pessoas com a mesma senha têm hashes diferentes.
//
// TOKENS: ao entrar, o usuário recebe um token assinado (formato JWT, HS256) com o id, o
// tipo (estudante ou empresa) e a validade. Nas chamadas seguintes ele envia
//   Authorization: Bearer <token>
// e a API passa a saber QUEM está chamando sem confiar em ids digitados pelo cliente.
const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

// ---------------------------------------------------------------------------
// Senhas
// ---------------------------------------------------------------------------
const PARAMETROS_SCRYPT = { N: 16384, r: 8, p: 1 };
const TAMANHO_HASH = 32;
const TAMANHO_SAL = 16;

// Formato guardado no banco: scrypt$N$r$p$sal$hash (sal e hash em base64url)
async function gerarHash(senha) {
  const sal = crypto.randomBytes(TAMANHO_SAL);
  const derivada = await scrypt(String(senha), sal, TAMANHO_HASH, PARAMETROS_SCRYPT);
  const { N, r, p } = PARAMETROS_SCRYPT;
  return `scrypt$${N}$${r}$${p}$${sal.toString("base64url")}$${derivada.toString("base64url")}`;
}

async function verificarSenha(senha, hashGuardado) {
  if (typeof senha !== "string" || typeof hashGuardado !== "string") return false;
  const partes = hashGuardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const [, N, r, p, salTexto, hashTexto] = partes;
  const sal = Buffer.from(salTexto, "base64url");
  const esperado = Buffer.from(hashTexto, "base64url");
  const derivada = await scrypt(senha, sal, esperado.length, { N: Number(N), r: Number(r), p: Number(p) });
  // comparação em tempo constante: não revela, pelo tempo de resposta, quantos bytes batem
  return derivada.length === esperado.length && crypto.timingSafeEqual(derivada, esperado);
}

// Quando o e-mail não existe, o login ainda gasta o mesmo tempo de uma verificação real,
// para não revelar quais e-mails estão cadastrados.
let hashFalso = null;
function obterHashFalso() {
  if (!hashFalso) hashFalso = gerarHash(crypto.randomBytes(8).toString("hex"));
  return hashFalso;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
// O segredo que assina os tokens vem da variável SEGREDO_TOKEN. Se ela não existir, um
// segredo aleatório é criado a cada vez que a API inicia (então os tokens deixam de valer
// quando a API reinicia, e as pessoas precisam entrar de novo). Nunca fica no código.
const SEGREDO_DEFINIDO = Boolean(process.env.SEGREDO_TOKEN);
const SEGREDO = process.env.SEGREDO_TOKEN || crypto.randomBytes(32).toString("hex");
const VALIDADE_EM_SEGUNDOS = 8 * 60 * 60;
const TIPOS = ["estudante", "empresa"];

const paraBase64Url = (objeto) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
const assinar = (texto) => crypto.createHmac("sha256", SEGREDO).update(texto).digest("base64url");

function criarToken({ id, tipo }) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = paraBase64Url({ alg: "HS256", typ: "JWT" });
  const corpo = paraBase64Url({ sub: id, tipo, iat: agora, exp: agora + VALIDADE_EM_SEGUNDOS });
  return `${cabecalho}.${corpo}.${assinar(`${cabecalho}.${corpo}`)}`;
}

// Devolve { sub, tipo } se o token for autêntico e estiver na validade; senão, null.
function verificarToken(token) {
  const partes = String(token).split(".");
  if (partes.length !== 3) return null;

  // a assinatura é sempre conferida com o NOSSO algoritmo e o NOSSO segredo,
  // nunca com o que o cabeçalho do token alega (isso barra tokens "alg: none")
  const esperada = Buffer.from(assinar(`${partes[0]}.${partes[1]}`));
  const recebida = Buffer.from(partes[2]);
  if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) return null;

  let cabecalho, dados;
  try {
    cabecalho = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
    dados = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch (_) {
    return null;
  }
  if (!cabecalho || cabecalho.alg !== "HS256") return null;
  if (!dados || typeof dados !== "object") return null;
  const agora = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(dados.exp) || dados.exp <= agora) return null;
  if (!TIPOS.includes(dados.tipo) || !Number.isInteger(dados.sub)) return null;
  return { sub: dados.sub, tipo: dados.tipo };
}

// ---------------------------------------------------------------------------
// Middlewares do Express
// ---------------------------------------------------------------------------

// Exige um token válido. Depois dele, req.usuario = { id, tipo } é a identidade confiável.
function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization || "").split(" ");
  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Faça login para continuar." });
  }
  const dados = verificarToken(token);
  if (!dados) {
    return res.status(401).json({ erro: "Sessão expirada ou inválida. Entre novamente." });
  }
  req.usuario = { id: dados.sub, tipo: dados.tipo };
  next();
}

// Só deixa passar quem é do tipo indicado ("estudante" ou "empresa").
function exigirTipo(tipo) {
  return (req, res, next) => {
    if (req.usuario.tipo === tipo) return next();
    res.status(403).json({ erro: `Esta ação é exclusiva de ${tipo === "empresa" ? "empresas" : "estudantes"}.` });
  };
}

// Para rotas /:id do próprio perfil: o id da URL precisa ser o de quem está logado.
function exigirProprioPerfil(tipo) {
  return (req, res, next) => {
    if (req.usuario.tipo === tipo && String(req.usuario.id) === String(req.params.id)) return next();
    res.status(403).json({ erro: "Você só pode acessar o seu próprio perfil." });
  };
}

const mesmoId = (a, b) => String(a) === String(b);

module.exports = {
  gerarHash,
  verificarSenha,
  obterHashFalso,
  criarToken,
  verificarToken,
  autenticar,
  exigirTipo,
  exigirProprioPerfil,
  mesmoId,
  SEGREDO_DEFINIDO,
};
