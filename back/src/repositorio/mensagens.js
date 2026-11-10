// src/repositorio/mensagens.js
// Entidade Mensagem do ER: { id, matchId, enviadoPor, texto, criadoEm }
// enviadoPor = 'estudante' ou 'empresa'
const { mensagens, gerarId } = require("../data");

async function listarPorMatch(matchId) {
  return mensagens
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
}

async function criar(matchId, enviadoPor, texto) {
  const mensagem = { id: gerarId("msg"), matchId, enviadoPor, texto, criadoEm: new Date().toISOString() };
  mensagens.push(mensagem);
  return mensagem;
}

module.exports = { listarPorMatch, criar };
