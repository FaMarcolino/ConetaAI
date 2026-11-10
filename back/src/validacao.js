// src/validacao.js
// Pequenas funções de validação/normalização usadas pelas rotas.

const MODALIDADES = ["presencial", "remoto", "hibrido"];
const STATUS_VAGA = ["Ativa", "Encerrada"];

function textoPreenchido(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

function emailValido(valor) {
  return typeof valor === "string" && /^\S+@\S+\.\S+$/.test(valor.trim());
}

// aceita array ou string separada por vírgula e devolve array de strings limpas
function paraLista(valor) {
  if (Array.isArray(valor)) return valor.map((s) => String(s).trim()).filter(Boolean);
  if (valor === undefined || valor === null) return [];
  return String(valor).split(",").map((s) => s.trim()).filter(Boolean);
}

// minúsculas e sem acento, para comparar textos ("Informação" == "informacao")
function normalizar(texto) {
  return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function semSenha(usuario) {
  const { senha, ...resto } = usuario;
  return resto;
}

module.exports = { MODALIDADES, STATUS_VAGA, textoPreenchido, emailValido, paraLista, normalizar, semSenha };
