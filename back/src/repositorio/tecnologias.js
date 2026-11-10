// src/repositorio/tecnologias.js
const { tecnologias } = require("../data");
const { criarRepositorioCatalogo } = require("./catalogo");

module.exports = criarRepositorioCatalogo(tecnologias);
