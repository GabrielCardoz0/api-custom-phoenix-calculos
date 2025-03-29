import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const { STRAPI_URL } = process.env;

export const strapiApi = axios.create({
  baseURL: process.env.STRAPI_URL
})