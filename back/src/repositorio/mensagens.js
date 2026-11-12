// src/repositorio/mensagens.js
// Entidade Mensagem do ER: { id, matchId, enviadoPor, texto, criadoEm }
// enviadoPor = 'estudante' ou 'empresa'
const { consulta, paraId } = require("../db");

const COLUNAS = `id, match_id AS "matchId", enviado_por AS "enviadoPor", texto, criado_em AS "criadoEm"`;

async function listarPorMatch(matchId) {
  const id = paraId(matchId);
  if (id === null) return [];
  const resposta = await consulta(
    `SELECT ${COLUNAS} FROM mensagem WHERE match_id = $1 ORDER BY criado_em, id`,
    [id]
  );
  return resposta.rows;
}

async function criar(matchId, enviadoPor, texto) {
  const resposta = await consulta(
    `INSERT INTO mensagem (match_id, enviado_por, texto)
     VALUES ($1, $2, $3)
     RETURNING ${COLUNAS}`,
    [paraId(matchId), enviadoPor, texto]
  );
  return resposta.rows[0];
}

module.exports = { listarPorMatch, criar };
