// Regras de agenda: em quais dias cada serviço acontece.
import { chaveDia } from "./util.js";
// Serviço: { frequencia: "Semanal"|"Quinzenal"|"Mensal", dias_semana: [0..6], semana: "par"|"impar", dia_mes }

export const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Número da semana ISO (1–53)
export function semanaISO(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const inicioAno = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - inicioAno) / 86400000 + 1) / 7);
}

export function aconteceEm(servico, data) {
  if (servico.frequencia === "Mensal") return servico.dia_mes === data.getDate();
  const dias = servico.dias_semana || [];
  if (!dias.includes(data.getDay())) return false;
  if (servico.frequencia === "Semanal") return true;
  const par = semanaISO(data) % 2 === 0;
  return servico.semana === "par" ? par : !par;
}

export function descreverAgenda(servico) {
  if (servico.frequencia === "Mensal") return servico.dia_mes ? `Dia ${servico.dia_mes}` : "";
  const dias = (servico.dias_semana || []).map((d) => DIAS[d]).join(", ");
  if (!dias) return "";
  if (servico.frequencia === "Quinzenal") return `${dias} · semanas ${servico.semana === "par" ? "pares" : "ímpares"}`;
  return dias;
}

// Visitas dos próximos N dias (a partir de amanhã), em ordem de data
export function proximasVisitas(condominios, dias = 7) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const lista = [];
  for (const cond of condominios) {
    if (!cond.ativo) continue;
    for (let i = 1; i <= dias; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      for (const servico of cond.servicos || []) {
        if (aconteceEm(servico, data)) lista.push({ cond, servico, data, emDias: i });
      }
    }
  }
  return lista.sort((a, b) => a.data - b.data);
}

// Chave do lembrete por e-mail: um por serviço por dia
export const chaveLembrete = (visita) => `${visita.servico.id}|${chaveDia(visita.data)}`;
