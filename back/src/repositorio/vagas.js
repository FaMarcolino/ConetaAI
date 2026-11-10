// src/repositorio/vagas.js
const { vagas, empresas, likes, matches, mensagens, gerarId } = require("../data");
const { normalizar } = require("../validacao");

// O nome da empresa não é guardado na vaga: ele vem da empresa dona dela
// (no SQL isso será um JOIN com a tabela empresa).
function comEmpresa(vaga) {
  const empresa = empresas.find((e) => e.id === vaga.empresaId);
  return { ...vaga, empresa: empresa ? empresa.nome : "" };
}

// filtros opcionais: empresaId, status, cidade, modalidade, tecnologia, q (cargo ou empresa)
async function listar(filtros = {}) {
  const { empresaId, status, cidade, modalidade, tecnologia, q } = filtros;
  return vagas
    .map(comEmpresa)
    .filter((v) => !empresaId || v.empresaId === empresaId)
    .filter((v) => !status || v.status === status)
    .filter((v) => !cidade || normalizar(v.cidade).includes(normalizar(cidade)))
    .filter((v) => !modalidade || v.modalidade === modalidade)
    .filter((v) => !tecnologia || v.tecnologias.some((t) => normalizar(t) === normalizar(tecnologia)))
    .filter((v) => !q || normalizar(`${v.cargo} ${v.empresa}`).includes(normalizar(q)));
}

async function buscarPorId(id) {
  const vaga = vagas.find((v) => v.id === id);
  return vaga ? comEmpresa(vaga) : null;
}

async function criar(dados) {
  const nova = {
    id: gerarId("v"),
    empresaId: dados.empresaId,
    cargo: dados.cargo,
    cursoDesejado: dados.cursoDesejado,
    tecnologias: dados.tecnologias,
    cidade: dados.cidade,
    modalidade: dados.modalidade,
    faixaSalarial: dados.faixaSalarial,
    periodoMinimoMeses: dados.periodoMinimoMeses,
    status: "Ativa",
  };
  vagas.push(nova);
  return comEmpresa(nova);
}

async function atualizarStatus(id, status) {
  const vaga = vagas.find((v) => v.id === id);
  if (!vaga) return null;
  vaga.status = status;
  return comEmpresa(vaga);
}

// Exclui a vaga e tudo que depende dela (curtidas, matches e mensagens).
// No SQL isso será feito por ON DELETE CASCADE.
async function excluir(id) {
  const indice = vagas.findIndex((v) => v.id === id);
  if (indice === -1) return false;
  vagas.splice(indice, 1);

  const idsMatchesRemovidos = matches.filter((m) => m.vagaId === id).map((m) => m.id);
  removerDoArray(likes, (l) => l.vagaId === id);
  removerDoArray(matches, (m) => m.vagaId === id);
  removerDoArray(mensagens, (m) => idsMatchesRemovidos.includes(m.matchId));
  return true;
}

function removerDoArray(array, deveRemover) {
  for (let i = array.length - 1; i >= 0; i--) {
    if (deveRemover(array[i])) array.splice(i, 1);
  }
}

module.exports = { listar, buscarPorId, criar, atualizarStatus, excluir, comEmpresa };
