// src/repositorio/likes.js
// Entidade Curtida do ER: { id, origem, estudanteId, vagaId, criadoEm }
// origem = 'estudante' (estudante curtiu a vaga) ou 'empresa' (empresa curtiu o estudante para a vaga).
// O match que nasce das duas curtidas guarda os ids delas (veja repositorio/matches.js).
const { consulta, paraId } = require("../db");

const COLUNAS = `id, origem, estudante_id AS "estudanteId", vaga_id AS "vagaId",
                 criado_em AS "criadoEm"`;

// filtros opcionais: origem, estudanteId, vagaId
async function listar(filtros = {}) {
  const { origem, estudanteId, vagaId } = filtros;
  const condicoes = [];
  const valores = [];
  const adicionar = (valor) => { valores.push(valor); return `$${valores.length}`; };

  if (origem) condicoes.push(`origem = ${adicionar(origem)}`);
  if (estudanteId !== undefined) {
    const id = paraId(estudanteId);
    if (id === null) return [];
    condicoes.push(`estudante_id = ${adicionar(id)}`);
  }
  if (vagaId !== undefined) {
    const id = paraId(vagaId);
    if (id === null) return [];
    condicoes.push(`vaga_id = ${adicionar(id)}`);
  }

  const onde = condicoes.length ? ` WHERE ${condicoes.join(" AND ")}` : "";
  const resposta = await consulta(`SELECT ${COLUNAS} FROM curtida${onde} ORDER BY id`, valores);
  return resposta.rows;
}

async function existe(origem, estudanteId, vagaId) {
  const resposta = await consulta(
    "SELECT 1 FROM curtida WHERE origem = $1 AND estudante_id = $2 AND vaga_id = $3",
    [origem, paraId(estudanteId), paraId(vagaId)]
  );
  return resposta.rowCount > 0;
}

// Idempotente: curtir duas vezes não cria duas linhas. O próprio banco impede a repetição
// (UNIQUE (estudante_id, vaga_id, origem)); ON CONFLICT DO NOTHING só evita o erro.
async function criar(origem, estudanteId, vagaId) {
  const resposta = await consulta(
    `INSERT INTO curtida (origem, estudante_id, vaga_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (estudante_id, vaga_id, origem) DO NOTHING
     RETURNING ${COLUNAS}`,
    [origem, paraId(estudanteId), paraId(vagaId)]
  );
  return resposta.rows[0] || null;
}

module.exports = { listar, existe, criar };
