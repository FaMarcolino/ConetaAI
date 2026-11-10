// src/repositorio/likes.js
// Entidade Curtida do ER: { id, origem, estudanteId, vagaId, criadoEm }
// origem = 'estudante' (estudante curtiu a vaga) ou 'empresa' (empresa curtiu o estudante para a vaga).
const { likes, gerarId } = require("../data");

// filtros opcionais: origem, estudanteId, vagaId
async function listar(filtros = {}) {
  const { origem, estudanteId, vagaId } = filtros;
  return likes
    .filter((l) => !origem || l.origem === origem)
    .filter((l) => !estudanteId || l.estudanteId === estudanteId)
    .filter((l) => !vagaId || l.vagaId === vagaId);
}

async function existe(origem, estudanteId, vagaId) {
  return likes.some((l) => l.origem === origem && l.estudanteId === estudanteId && l.vagaId === vagaId);
}

// idempotente: curtir duas vezes não cria duas linhas (no SQL: UNIQUE (estudante_id, vaga_id, origem))
async function criar(origem, estudanteId, vagaId) {
  if (await existe(origem, estudanteId, vagaId)) return null;
  const like = { id: gerarId("like"), origem, estudanteId, vagaId, criadoEm: new Date().toISOString() };
  likes.push(like);
  return like;
}

module.exports = { listar, existe, criar };
