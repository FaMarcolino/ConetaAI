// src/repositorio/estudantes.js
// Acesso à tabela estudante e às tabelas ligadas a ela (estudante_tecnologia e
// estudante_area_interesse). Todo o SQL é escrito à mão.
const { consulta, transacao, paraId } = require("../db");

// Monta o estudante no formato que a API devolve: o curso vem pelo nome (JOIN com curso)
// e as habilidades e áreas de interesse vêm como listas (subconsultas).
const SELECT_ESTUDANTE = `
  SELECT e.id,
         e.nome,
         e.email,
         e.senha,
         e.cidade,
         e.modalidade,
         e.disponibilidade_meses              AS "disponibilidadeMeses",
         COALESCE(e.previsao_conclusao, '')   AS "previsaoConclusao",
         c.nome                               AS curso,
         COALESCE((SELECT array_agg(t.nome ORDER BY t.nome)::text[]
                     FROM estudante_tecnologia et
                     JOIN tecnologia t ON t.id = et.tecnologia_id
                    WHERE et.estudante_id = e.id), ARRAY[]::text[])   AS habilidades,
         COALESCE((SELECT array_agg(a.area ORDER BY a.area)::text[]
                     FROM estudante_area_interesse a
                    WHERE a.estudante_id = e.id), ARRAY[]::text[])    AS "areasInteresse"
    FROM estudante e
    JOIN curso c ON c.id = e.curso_id`;

async function listar() {
  const resposta = await consulta(`${SELECT_ESTUDANTE} ORDER BY e.id`);
  return resposta.rows;
}

async function buscarPorId(id) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;
  const resposta = await consulta(`${SELECT_ESTUDANTE} WHERE e.id = $1`, [idNumerico]);
  return resposta.rows[0] || null;
}

async function buscarPorEmail(email) {
  const resposta = await consulta(`${SELECT_ESTUDANTE} WHERE lower(e.email) = lower($1)`, [String(email).trim()]);
  return resposta.rows[0] || null;
}

// Grava as habilidades (nomes já validados contra o catálogo) trocando as antigas pelas novas.
async function gravarHabilidades(cliente, estudanteId, nomes) {
  await cliente.query("DELETE FROM estudante_tecnologia WHERE estudante_id = $1", [estudanteId]);
  await cliente.query(
    `INSERT INTO estudante_tecnologia (estudante_id, tecnologia_id)
     SELECT $1, id FROM tecnologia WHERE nome = ANY($2::text[])`,
    [estudanteId, nomes]
  );
}

async function gravarAreasInteresse(cliente, estudanteId, areas) {
  await cliente.query("DELETE FROM estudante_area_interesse WHERE estudante_id = $1", [estudanteId]);
  await cliente.query(
    `INSERT INTO estudante_area_interesse (estudante_id, area)
     SELECT $1, unnest($2::text[])`,
    [estudanteId, areas]
  );
}

async function criar(dados) {
  const id = await transacao(async (cliente) => {
    const resposta = await cliente.query(
      `INSERT INTO estudante (nome, email, senha, cidade, modalidade,
                              disponibilidade_meses, previsao_conclusao, curso_id)
       VALUES ($1, lower($2), $3, $4, $5, $6, NULLIF($7, ''),
               (SELECT id FROM curso WHERE nome = $8))
       RETURNING id`,
      [dados.nome, String(dados.email).trim(), dados.senha, dados.cidade, dados.modalidade,
       dados.disponibilidadeMeses, dados.previsaoConclusao || "", dados.curso]
    );
    const novoId = resposta.rows[0].id;
    await gravarHabilidades(cliente, novoId, dados.habilidades || []);
    await gravarAreasInteresse(cliente, novoId, dados.areasInteresse || []);
    return novoId;
  });
  return buscarPorId(id);
}

// campos opcionais: nome, cidade, modalidade, disponibilidadeMeses, previsaoConclusao,
// curso (nome), habilidades (nomes), areasInteresse (textos)
async function atualizar(id, campos) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;

  const encontrou = await transacao(async (cliente) => {
    const existe = await cliente.query("SELECT 1 FROM estudante WHERE id = $1", [idNumerico]);
    if (!existe.rowCount) return false;

    // monta o UPDATE só com os campos enviados (as colunas são fixas; só os valores variam)
    const alteracoes = [];
    const valores = [];
    const definir = (coluna, valor) => {
      valores.push(valor);
      alteracoes.push(`${coluna} = $${valores.length}`);
    };
    if (campos.nome !== undefined) definir("nome", campos.nome);
    if (campos.cidade !== undefined) definir("cidade", campos.cidade);
    if (campos.modalidade !== undefined) definir("modalidade", campos.modalidade);
    if (campos.disponibilidadeMeses !== undefined) definir("disponibilidade_meses", campos.disponibilidadeMeses);
    if (campos.previsaoConclusao !== undefined) definir("previsao_conclusao", campos.previsaoConclusao === "" ? null : campos.previsaoConclusao);
    if (campos.curso !== undefined) {
      valores.push(campos.curso);
      alteracoes.push(`curso_id = (SELECT id FROM curso WHERE nome = $${valores.length})`);
    }
    if (alteracoes.length) {
      valores.push(idNumerico);
      await cliente.query(`UPDATE estudante SET ${alteracoes.join(", ")} WHERE id = $${valores.length}`, valores);
    }
    if (campos.habilidades !== undefined) await gravarHabilidades(cliente, idNumerico, campos.habilidades);
    if (campos.areasInteresse !== undefined) await gravarAreasInteresse(cliente, idNumerico, campos.areasInteresse);
    return true;
  });

  return encontrou ? buscarPorId(idNumerico) : null;
}

module.exports = { listar, buscarPorId, buscarPorEmail, criar, atualizar };
