import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import validateStrapiToken from "./middlewares.js";
import calcularMacroCondomínio from "./macroCondominio.js";

dotenv.config();

const { PORT } = process.env;

const app = express();

app
.use(cors())
.use(express.json())
.use(express.urlencoded({ extended: true }))
.get("/health", (req, res) => {
  res.send("Server is running!");
})
.use("/*", validateStrapiToken)
.get("/macros", async (req, res) => {
  try {
    const { condominio_id, mes_referencia } = req.query;

    const result = await calcularMacroCondomínio({ condominio_id: Number(condominio_id), mes_referencia });

    return res.send(result);

  } catch (error) {
    return res.status(error.status ?? 500).send({ error: error });
  }
})



.listen(PORT ?? 3000, () => {
  console.log(`Server running on port ${PORT ?? 3000}`);
});