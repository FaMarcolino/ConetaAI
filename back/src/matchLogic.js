// src/matchLogic.js
// Cálculo de compatibilidade entre um estudante e uma vaga.
// A mesma lógica é usada tanto para o feed de vagas do estudante
// quanto para o feed de candidatos da empresa (só invertendo quem é "pessoa" e quem é "vaga").

const PESOS = {
  curso: 30,
  habilidades: 25,
  localizacao: 15,
  modalidade: 15,
  disponibilidade: 15,
};

function calcularScoreCurso(pessoa, vaga) {
  const cursosAceitos = vaga.cursoDesejado.map((c) => c.toLowerCase().trim());
  return cursosAceitos.includes(pessoa.curso.toLowerCase().trim()) ? 100 : 0;
}

function calcularScoreHabilidades(pessoa, vaga) {
  const tecnologias = vaga.tecnologias.map((t) => t.toLowerCase().trim());
  const habilidades = pessoa.habilidades.map((h) => h.toLowerCase().trim());
  if (tecnologias.length === 0) return { score: 100, emComum: [] };
  const emComum = tecnologias.filter((t) => habilidades.includes(t));
  return { score: Math.round((emComum.length / tecnologias.length) * 100), emComum };
}

function calcularScoreLocalizacao(pessoa, vaga) {
  if (vaga.modalidade === "remoto" || pessoa.modalidade === "remoto") return 100;
  return pessoa.cidade.toLowerCase() === vaga.cidade.toLowerCase() ? 100 : 0;
}

function calcularScoreModalidade(pessoa, vaga) {
  return pessoa.modalidade === vaga.modalidade ? 100 : 40;
}

function calcularScoreDisponibilidade(pessoa, vaga) {
  return pessoa.disponibilidadeMeses >= vaga.periodoMinimoMeses ? 100 : 0;
}

/**
 * Calcula a compatibilidade entre um estudante e uma vaga.
 * @param {object} pessoa - dados do estudante (curso, habilidades, cidade, modalidade, disponibilidadeMeses)
 * @param {object} vaga - dados da vaga (cursoDesejado[], tecnologias[], cidade, modalidade, periodoMinimoMeses)
 */
function calcularCompatibilidade(pessoa, vaga) {
  const scoreCurso = calcularScoreCurso(pessoa, vaga);
  const habilidades = calcularScoreHabilidades(pessoa, vaga);
  const scoreLocal = calcularScoreLocalizacao(pessoa, vaga);
  const scoreModalidade = calcularScoreModalidade(pessoa, vaga);
  const scoreDisponibilidade = calcularScoreDisponibilidade(pessoa, vaga);

  const final = Math.round(
    (scoreCurso * PESOS.curso +
      habilidades.score * PESOS.habilidades +
      scoreLocal * PESOS.localizacao +
      scoreModalidade * PESOS.modalidade +
      scoreDisponibilidade * PESOS.disponibilidade) /
      100
  );

  return {
    final,
    detalhamento: {
      curso: scoreCurso,
      habilidades: habilidades.score,
      localizacao: scoreLocal,
      modalidade: scoreModalidade,
      disponibilidade: scoreDisponibilidade,
    },
    tecnologiasEmComum: habilidades.emComum,
  };
}

module.exports = { calcularCompatibilidade, PESOS };
