// src/repositorio/likes.js
const { likes, gerarId } = require("../data");

// filtros opcionais: tipo, estudanteId, vagaId
async function listar(filtros = {}) {
  const { tipo, estudanteId, vagaId } = filtros;
  return likes
    .filter((l) => !tipo || l.tipo === tipo)
    .filter((l) => !estudanteId || l.estudanteId === estudanteId)
    .filter((l) => !vagaId || l.vagaId === vagaId);
}

async function existe(tipo, estudanteId, vagaId) {
  return likes.some((l) => l.tipo === tipo && l.estudanteId === estudanteId && l.vagaId === vagaId);
}

// idempotente: curtir duas vezes não cria duas linhas
async function criar(tipo, estudanteId, vagaId) {
  if (await existe(tipo, estudanteId, vagaId)) return null;
  const like = { id: gerarId("like"), tipo, estudanteId, vagaId, criadoEm: new Date().toISOString() };
  likes.push(like);
  return like;
}

module.exports = { listar, existe, criar };
