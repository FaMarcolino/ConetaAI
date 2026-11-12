// src/repositorio/vagas.js
// Acesso à tabela vaga e às ligações vaga_curso (aceita) e vaga_tecnologia (requer).
const { consulta, transacao, paraId } = require("../db");
const { normalizar } = require("../validacao");

// Monta a vaga no formato da API: o nome da empresa vem do JOIN com empresa, e os cursos
// aceitos e as tecnologias exigidas vêm como listas (subconsultas).
const SELECT_VAGA = `
  SELECT v.id,
         v.empresa_id                          AS "empresaId",
         e.nome                                AS empresa,
         v.cargo,
         COALESCE((SELECT array_agg(c.nome ORDER BY c.nome)::text[]
                     FROM vaga_curso vc
                     JOIN curso c ON c.id = vc.curso_id
                    WHERE vc.vaga_id = v.id), ARRAY[]::text[])       AS "cursoDesejado",
         COALESCE((SELECT array_agg(t.nome ORDER BY t.nome)::text[]
                     FROM vaga_tecnologia vt
                     JOIN tecnologia t ON t.id = vt.tecnologia_id
                    WHERE vt.vaga_id = v.id), ARRAY[]::text[])       AS tecnologias,
         COALESCE(v.cidade, '')                AS cidade,
         v.modalidade,
         COALESCE(v.faixa_salarial, '')        AS "faixaSalarial",
         v.periodo_minimo_meses                AS "periodoMinimoMeses",
         v.status
    FROM vaga v
    JOIN empresa e ON e.id = v.empresa_id`;

// Comparação sem acento e sem diferença de maiúsculas, feita no próprio SQL
// ("São Paulo" encontra "sao paulo"). O PostgreSQL tem a extensão unaccent para isso,
// mas ela exige instalação à parte; translate() já vem pronto.
const COM_ACENTO = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const SEM_ACENTO = "aaaaaeeeeiiiiooooouuuucn";
const semAcentoSql = (expressao) =>
  `lower(translate(${expressao}, '${COM_ACENTO + COM_ACENTO.toUpperCase()}', '${SEM_ACENTO + SEM_ACENTO.toUpperCase()}'))`;

// escapa os caracteres que têm significado especial dentro de um LIKE
const escaparLike = (texto) => texto.replace(/[\\%_]/g, "\\$&");

// filtros opcionais: empresaId, status, cidade, modalidade, tecnologia, q (cargo ou empresa)
async function listar(filtros = {}) {
  const { empresaId, status, cidade, modalidade, tecnologia, q } = filtros;
  const condicoes = [];
  const valores = [];
  const adicionar = (valor) => { valores.push(valor); return `$${valores.length}`; };

  if (empresaId !== undefined) {
    const id = paraId(empresaId);
    if (id === null) return [];
    condicoes.push(`v.empresa_id = ${adicionar(id)}`);
  }
  if (status) condicoes.push(`v.status = ${adicionar(status)}`);
  if (modalidade) condicoes.push(`v.modalidade = ${adicionar(modalidade)}`);
  if (cidade) {
    condicoes.push(`${semAcentoSql("COALESCE(v.cidade, '')")} LIKE ${adicionar("%" + escaparLike(normalizar(cidade)) + "%")}`);
  }
  if (tecnologia) {
    condicoes.push(`EXISTS (SELECT 1 FROM vaga_tecnologia vt
                             JOIN tecnologia t ON t.id = vt.tecnologia_id
                            WHERE vt.vaga_id = v.id AND lower(t.nome) = ${adicionar(normalizar(tecnologia))})`);
  }
  if (q) {
    condicoes.push(`${semAcentoSql("v.cargo || ' ' || e.nome")} LIKE ${adicionar("%" + escaparLike(normalizar(q)) + "%")}`);
  }

  const onde = condicoes.length ? ` WHERE ${condicoes.join(" AND ")}` : "";
  const resposta = await consulta(`${SELECT_VAGA}${onde} ORDER BY v.id`, valores);
  return resposta.rows;
}

async function buscarPorId(id) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;
  const resposta = await consulta(`${SELECT_VAGA} WHERE v.id = $1`, [idNumerico]);
  return resposta.rows[0] || null;
}

// dados: empresaId, cargo, cursoDesejado[] e tecnologias[] (nomes já validados),
// cidade, modalidade, faixaSalarial, periodoMinimoMeses
async function criar(dados) {
  const id = await transacao(async (cliente) => {
    const resposta = await cliente.query(
      `INSERT INTO vaga (cargo, modalidade, cidade, faixa_salarial, periodo_minimo_meses, empresa_id)
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6)
       RETURNING id`,
      [dados.cargo, dados.modalidade, dados.cidade || "", dados.faixaSalarial || "",
       dados.periodoMinimoMeses, paraId(dados.empresaId)]
    );
    const novoId = resposta.rows[0].id;
    await cliente.query(
      `INSERT INTO vaga_curso (vaga_id, curso_id)
       SELECT $1, id FROM curso WHERE nome = ANY($2::text[])`,
      [novoId, dados.cursoDesejado]
    );
    await cliente.query(
      `INSERT INTO vaga_tecnologia (vaga_id, tecnologia_id)
       SELECT $1, id FROM tecnologia WHERE nome = ANY($2::text[])`,
      [novoId, dados.tecnologias]
    );
    return novoId;
  });
  return buscarPorId(id);
}

async function atualizarStatus(id, status) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return null;
  const resposta = await consulta("UPDATE vaga SET status = $1 WHERE id = $2", [status, idNumerico]);
  return resposta.rowCount ? buscarPorId(idNumerico) : null;
}

// Exclui a vaga. As curtidas, os matches, as mensagens e as ligações com cursos e
// tecnologias são apagados pelo próprio banco (ON DELETE CASCADE).
async function excluir(id) {
  const idNumerico = paraId(id);
  if (idNumerico === null) return false;
  const resposta = await consulta("DELETE FROM vaga WHERE id = $1", [idNumerico]);
  return resposta.rowCount > 0;
}

module.exports = { listar, buscarPorId, criar, atualizarStatus, excluir };
