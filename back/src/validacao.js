// src/validacao.js
// Pequenas funções de validação/normalização usadas pelas rotas.

const MODALIDADES = ["presencial", "remoto", "hibrido"];
const STATUS_VAGA = ["Ativa", "Encerrada"];
// Os dois lados da plataforma. Usado em Curtida.origem e Mensagem.enviadoPor.
const LADOS = ["estudante", "empresa"];

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

// previsaoConclusao: texto vazio (sem previsão) ou ano-mês no formato AAAA-MM
function previsaoConclusaoValida(valor) {
  return typeof valor === "string" && (valor === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(valor));
}

// areasInteresse: lista de textos não vazios. Remove repetições (ignorando maiúsculas e acentos).
// Devolve { areas } ou { erro }.
function normalizarAreasInteresse(valor) {
  if (!Array.isArray(valor)) return { erro: "areasInteresse precisa ser uma lista de textos." };
  const areas = [];
  for (const item of valor) {
    if (typeof item !== "string" || !item.trim()) {
      return { erro: "areasInteresse não pode ter itens vazios nem que não sejam texto." };
    }
    const area = item.trim();
    if (area.length > 60) return { erro: "Cada área de interesse pode ter no máximo 60 caracteres." };
    if (!areas.some((a) => normalizar(a) === normalizar(area))) areas.push(area);
  }
  return { areas };
}

module.exports = {
  MODALIDADES,
  STATUS_VAGA,
  LADOS,
  textoPreenchido,
  emailValido,
  paraLista,
  normalizar,
  semSenha,
  previsaoConclusaoValida,
  normalizarAreasInteresse,
};
