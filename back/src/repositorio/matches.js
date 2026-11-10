// src/repositorio/matches.js
const { matches, vagas, estudantes, gerarId } = require("../data");
const { comEmpresa } = require("./vagas");

async function buscarPorId(id) {
  return matches.find((m) => m.id === id) || null;
}

async function buscarPorEstudanteEVaga(estudanteId, vagaId) {
  return matches.find((m) => m.estudanteId === estudanteId && m.vagaId === vagaId) || null;
}

async function criar(estudanteId, vagaId) {
  const existente = await buscarPorEstudanteEVaga(estudanteId, vagaId);
  if (existente) return existente;
  const match = { id: gerarId("match"), estudanteId, vagaId, criadoEm: new Date().toISOString() };
  matches.push(match);
  return match;
}

// filtros opcionais: estudanteId, vagaId, empresaId (todas as vagas da empresa),
// desde (objeto Date: só matches criados a partir dessa data, usando criadoEm).
// Já devolve os dados resumidos de vaga e estudante (no SQL será um JOIN).
async function listarDetalhado(filtros = {}) {
  const { estudanteId, vagaId, empresaId, desde } = filtros;
  const idsVagasDaEmpresa = empresaId ? vagas.filter((v) => v.empresaId === empresaId).map((v) => v.id) : null;

  return matches
    .filter((m) => !estudanteId || m.estudanteId === estudanteId)
    .filter((m) => !vagaId || m.vagaId === vagaId)
    .filter((m) => !idsVagasDaEmpresa || idsVagasDaEmpresa.includes(m.vagaId))
    .filter((m) => !desde || new Date(m.criadoEm) >= desde)
    .map((m) => {
      const vagaBruta = vagas.find((v) => v.id === m.vagaId);
      const vaga = vagaBruta ? comEmpresa(vagaBruta) : null;
      const estudante = estudantes.find((e) => e.id === m.estudanteId);
      return {
        ...m,
        vaga: vaga ? { id: vaga.id, cargo: vaga.cargo, empresa: vaga.empresa } : null,
        estudante: estudante ? { id: estudante.id, nome: estudante.nome, curso: estudante.curso } : null,
      };
    });
}

module.exports = { buscarPorId, buscarPorEstudanteEVaga, criar, listarDetalhado };
