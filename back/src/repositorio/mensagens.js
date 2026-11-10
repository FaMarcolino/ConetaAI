// src/repositorio/mensagens.js
const { mensagens, gerarId } = require("../data");

async function listarPorMatch(matchId) {
  return mensagens
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
}

async function criar(matchId, de, texto) {
  const mensagem = { id: gerarId("msg"), matchId, de, texto, criadoEm: new Date().toISOString() };
  mensagens.push(mensagem);
  return mensagem;
}

module.exports = { listarPorMatch, criar };
