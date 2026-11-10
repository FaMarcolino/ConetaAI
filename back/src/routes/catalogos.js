// src/routes/catalogos.js
// Listas fechadas usadas nos formulários (cadastro, perfil, nova vaga e busca).
const express = require("express");
const cursos = require("../repositorio/cursos");
const tecnologias = require("../repositorio/tecnologias");
const assincrono = require("../assincrono");

const cursosRouter = express.Router();
cursosRouter.get("/", assincrono(async (req, res) => res.json(await cursos.listar())));

const tecnologiasRouter = express.Router();
tecnologiasRouter.get("/", assincrono(async (req, res) => res.json(await tecnologias.listar())));

module.exports = { cursosRouter, tecnologiasRouter };
