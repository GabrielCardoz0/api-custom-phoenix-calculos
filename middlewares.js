import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const { STRAPI_URL } = process.env;

function getTokenHeader(req) {
  const authHeader = req.header("Authorization");

  if (!authHeader) return undefined;

  return authHeader.split(" ")[1];
}


async function validateStrapiToken(token) {
  try {
    const { data } = await axios.get(`${STRAPI_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return !!data;
  } catch {
    return false;
  }
}

export default async function validateToken(req, res, next) {
  try {
    const token = getTokenHeader(req);

    if(!token) return res.status(401).send({ message: "Unauthorized" });

    const isValid = await validateStrapiToken(token);

    if(!isValid) return res.status(401).send({ message: "Unauthorized" });

    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized", error });
  }
}