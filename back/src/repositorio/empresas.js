// src/repositorio/empresas.js
const { consulta, paraId } = require("../db");

// descricao e site são opcionais no banco (NULL); a API os devolve como texto vazio.
const SELECT_EMPRESA = `
  SELECT id, nome, email, senha, setor, cidade,
         COALESCE(descricao, '') AS descricao,
         COALESCE(site, '')      AS site
    FROM empresa`;

async function buscarPorId(id) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;
  const resposta = await consulta(`${SELECT_EMPRESA} WHERE id = $1`, [idNumerico]);
  return resposta.rows[0] || null;
}

async function buscarPorEmail(email) {
  const resposta = await consulta(`${SELECT_EMPRESA} WHERE lower(email) = lower($1)`, [String(email).trim()]);
  return resposta.rows[0] || null;
}

async function criar(dados) {
  const resposta = await consulta(
    `INSERT INTO empresa (nome, email, senha, setor, cidade, descricao, site)
     VALUES ($1, lower($2), $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''))
     RETURNING id`,
    [dados.nome, String(dados.email).trim(), dados.senha, dados.setor, dados.cidade,
     dados.descricao || "", dados.site || ""]
  );
  return buscarPorId(resposta.rows[0].id);
}

// campos opcionais: nome, setor, cidade, descricao, site
async function atualizar(id, campos) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;

  const alteracoes = [];
  const valores = [];
  const definir = (coluna, valor) => {
    valores.push(valor);
    alteracoes.push(`${coluna} = $${valores.length}`);
  };
  if (campos.nome !== undefined) definir("nome", campos.nome);
  if (campos.setor !== undefined) definir("setor", campos.setor);
  if (campos.cidade !== undefined) definir("cidade", campos.cidade);
  if (campos.descricao !== undefined) definir("descricao", campos.descricao === "" ? null : campos.descricao);
  if (campos.site !== undefined) definir("site", campos.site === "" ? null : campos.site);

  if (alteracoes.length) {
    valores.push(idNumerico);
    const resposta = await consulta(`UPDATE empresa SET ${alteracoes.join(", ")} WHERE id = $${valores.length}`, valores);
    if (!resposta.rowCount) return null;
  }
  return buscarPorId(idNumerico);
}

module.exports = { buscarPorId, buscarPorEmail, criar, atualizar };
