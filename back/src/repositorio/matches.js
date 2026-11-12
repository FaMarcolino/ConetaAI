// src/repositorio/matches.js
const { consulta, paraId } = require("../db");

const COLUNAS = `id, criado_em AS "criadoEm", estudante_id AS "estudanteId", vaga_id AS "vagaId"`;

async function buscarPorId(id) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;
  const resposta = await consulta(`SELECT ${COLUNAS} FROM match WHERE id = $1`, [idNumerico]);
  return resposta.rows[0] || null;
}

async function buscarPorEstudanteEVaga(estudanteId, vagaId) {
  const resposta = await consulta(
    `SELECT ${COLUNAS} FROM match WHERE estudante_id = $1 AND vaga_id = $2`,
    [paraId(estudanteId), paraId(vagaId)]
  );
  return resposta.rows[0] || null;
}

// Cria o match do par. O banco só aceita se existirem as duas curtidas (trigger
// trg_match_exige_curtidas) e, depois de criar, liga as curtidas ao match
// (trigger trg_match_vincula_curtidas). Se o match já existe, devolve o existente.
async function criar(estudanteId, vagaId) {
  const existente = await buscarPorEstudanteEVaga(estudanteId, vagaId);
  if (existente) return existente;

  const resposta = await consulta(
    `INSERT INTO match (estudante_id, vaga_id)
     VALUES ($1, $2)
     ON CONFLICT (vaga_id, estudante_id) DO NOTHING
     RETURNING ${COLUNAS}`,
    [paraId(estudanteId), paraId(vagaId)]
  );
  // se duas requisições criaram ao mesmo tempo, a segunda não recebe linha: busca a existente
  return resposta.rows[0] || buscarPorEstudanteEVaga(estudanteId, vagaId);
}

// filtros opcionais: estudanteId, vagaId, empresaId (todas as vagas da empresa),
// desde (objeto Date: só matches criados a partir dessa data, usando criado_em).
// Já devolve os dados resumidos de vaga e estudante (JOIN de 5 tabelas).
async function listarDetalhado(filtros = {}) {
  const { estudanteId, vagaId, empresaId, desde } = filtros;
  const condicoes = [];
  const valores = [];
  const adicionar = (valor) => { valores.push(valor); return `$${valores.length}`; };

  for (const [coluna, valor] of [["m.estudante_id", estudanteId], ["m.vaga_id", vagaId], ["v.empresa_id", empresaId]]) {
    if (valor === undefined) continue;
    const id = paraId(valor);
    if (id === null) return [];
    condicoes.push(`${coluna} = ${adicionar(id)}`);
  }
  if (desde) condicoes.push(`m.criado_em >= ${adicionar(desde)}`);

  const onde = condicoes.length ? ` WHERE ${condicoes.join(" AND ")}` : "";
  const resposta = await consulta(
    `SELECT m.id,
            m.criado_em     AS "criadoEm",
            m.estudante_id  AS "estudanteId",
            m.vaga_id       AS "vagaId",
            v.cargo         AS vaga_cargo,
            emp.nome        AS vaga_empresa,
            es.nome         AS estudante_nome,
            cu.nome         AS estudante_curso
       FROM match m
       JOIN vaga      v   ON v.id   = m.vaga_id
       JOIN empresa   emp ON emp.id = v.empresa_id
       JOIN estudante es  ON es.id  = m.estudante_id
       JOIN curso     cu  ON cu.id  = es.curso_id${onde}
      ORDER BY m.id`,
    valores
  );

  return resposta.rows.map((linha) => ({
    id: linha.id,
    criadoEm: linha.criadoEm,
    estudanteId: linha.estudanteId,
    vagaId: linha.vagaId,
    vaga: { id: linha.vagaId, cargo: linha.vaga_cargo, empresa: linha.vaga_empresa },
    estudante: { id: linha.estudanteId, nome: linha.estudante_nome, curso: linha.estudante_curso },
  }));
}

module.exports = { buscarPorId, buscarPorEstudanteEVaga, criar, listarDetalhado };
