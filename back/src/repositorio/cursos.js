// src/repositorio/cursos.js
const { cursos } = require("../data");
const { criarRepositorioCatalogo } = require("./catalogo");

module.exports = criarRepositorioCatalogo(cursos);
