import moment from "moment";
import { strapiApi } from "./strapi.js";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiaWF0IjoxNzQyOTI4NTg4LCJleHAiOjE3NDU1MjA1ODh9.DpE5P_ww9bYRafNd4qv2mLKyPRWNnsJg5QbHEokNQxU";

const getFaixasDeConsumo = async () => {
  const { data: { data: faixasDeConsumo } } = await strapiApi.get(`/faixa-de-consumos`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      "sort": "from:asc"
    }
  });

  return faixasDeConsumo;
} 

const fatorMultiplicador = 2.3;
const precoConcessionaria = 14.65;

const calcularValorIndividualGas = (leituraAtual, leituraAnterior) => {
  let dif = leituraAtual - leituraAnterior;

  if(dif < 0) dif = dif * -1;

  return (dif * fatorMultiplicador * precoConcessionaria);
}

function calculateFaixa(fator, faixas) {
  let total = 0;

  faixas.forEach(faixa => {
    if(faixa.nome === "TARIFA BÁSICA"){
      return total += faixa.value;
    }

    if(fator >= faixa.from && fator >= faixa.to){
      return total += (faixa.value * (faixa.to - faixa.from) );
    }
    
    if(fator >= faixa.from && fator < faixa.to){
      return total += (faixa.value * (fator - faixa.from));
    }
  });

  return Number(total.toFixed(2));
}

const calcularValorIndividualHidro = (leituraAtual, leituraAnterior, invertido, faixas) => {
  let fatorCalculo = invertido
    ? leituraAnterior - leituraAtual
    : leituraAtual - leituraAnterior;

  if(fatorCalculo < 0) fatorCalculo = fatorCalculo * -1;

  const result = calculateFaixa(fatorCalculo, faixas);

  return (result);
}

async function getCondominioById(id) {
  
  const { data: { data: condominios } } = await strapiApi.get(`/condominios`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      "filters[id][$eq]": id,
      "populate[blocos][populate][imovels][populate]": "leituras",
      "sort": "blocos.imovels.leituras.id:desc"
    }
  });

  return condominios[0];
}

async function getSomaM3Condominio(blocos, data) {
  
  const faixas = await getFaixasDeConsumo();

  let total_leitura_hidro_condominio = 0;
  let total_leitura_hidro_quente_condominio = 0;
  let total_leitura_hidro_gas_condominio = 0;

  let valor_total_leitura_hidro_condominio = 0; 
  let valor_total_leitura_hidro_quente_condominio = 0;
  let valor_total_leitura_gas_condominio = 0;

  const formatedBlocos = blocos.map(bloco => {

    let total_leitura_hidro = 0; 
    let total_leitura_hidro_quente = 0;
    let total_leitura_gas = 0;
    
    let valor_total_leitura_hidro = 0; 
    let valor_total_leitura_hidro_quente = 0;
    let valor_total_leitura_gas = 0; 

    const formatedImovels = bloco.imovels.map(imovel => {

      const filteredLeituras = imovel.leituras.filter(leitura => moment(leitura.createdAt).format("YYYY-MM") === data);

      const leituraHidrometro = filteredLeituras.find(leitura => leitura.tipo === "hidrometro")?.leitura ?? 0;
      const leituraHidrometroQuente = filteredLeituras.find(leitura => leitura.tipo === "hidrometro_quente")?.leitura ?? 0;
      const leituraGas = filteredLeituras.find(leitura => leitura.tipo === "gas")?.leitura ?? 0;

      const valor_individual_hidrometro = calcularValorIndividualHidro(leituraHidrometro, imovel.leitura_hidrometro_anterior ?? 0, !!imovel.is_hidrometro_invertido, faixas);

      const valor_individual_hidrometro_quente = calcularValorIndividualHidro(leituraHidrometroQuente, imovel.leitura_hidrometro_quente_anterior ?? 0, !!imovel.is_hidrometro_invertido, faixas);
      
      const valor_individual_gas = calcularValorIndividualGas(leituraGas, imovel.leitura_gas_anterior ?? 0);

      total_leitura_hidro += leituraHidrometro;
      total_leitura_hidro_quente += leituraHidrometroQuente;
      total_leitura_gas += leituraGas;

      valor_total_leitura_hidro += valor_individual_hidrometro;
      valor_total_leitura_hidro_quente += valor_individual_hidrometro_quente;
      valor_total_leitura_gas += valor_individual_gas; 

      return {
        ...imovel,
        leitura_atual_hidrometro: leituraHidrometro?.leitura ?? 0,
        leitura_atual_hidrometro_quente: leituraHidrometroQuente?.leitura ?? 0,
        leitura_atual_gas: leituraGas?.leitura ?? 0,
        valor_individual_hidrometro,
        valor_individual_hidrometro_quente,
        valor_individual_gas
      }
    });

    total_leitura_hidro_condominio += total_leitura_hidro;
    total_leitura_hidro_quente_condominio += total_leitura_hidro_quente;
    total_leitura_hidro_gas_condominio += total_leitura_gas;

    valor_total_leitura_hidro_condominio += valor_total_leitura_hidro; 
    valor_total_leitura_hidro_quente_condominio += valor_total_leitura_hidro_quente;
    valor_total_leitura_gas_condominio += valor_total_leitura_gas;

    return {
      ...bloco,
      total_leitura_hidro,
      total_leitura_hidro_quente,
      total_leitura_gas,
      valor_total_leitura_hidro,
      valor_total_leitura_hidro_quente,
      valor_total_leitura_gas,
      imovels: formatedImovels,
    }
  });

  return {  
    total_leitura_hidro_condominio,
    total_leitura_hidro_quente_condominio,
    total_leitura_hidro_gas_condominio,
  
    valor_total_leitura_hidro_condominio, 
    valor_total_leitura_hidro_quente_condominio,
    valor_total_leitura_gas_condominio,

    blocos: formatedBlocos
  };
}

export default async function calcularMacroCondomínio({ condominio_id, mes_referencia }) {
  const condominio = await getCondominioById(condominio_id);

  if(!condominio) throw { status: 404, message: "Condomínio não encontrado" };

  const somaM3Aferidos = await getSomaM3Condominio(condominio.blocos, mes_referencia);

  return { ...condominio, ...somaM3Aferidos };
};