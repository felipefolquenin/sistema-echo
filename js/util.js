// Funções pequenas usadas em vários lugares.
import { EMAILJS } from "./config.js";

export const fmtData = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export const fmtDiaSemana = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// "2026-10" — chave do checklist mensal
export const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const mesAtualLabel = () =>
  capitalizar(new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

// "2026-10-23" no fuso local (toISOString usaria UTC e erraria o dia à noite)
export const chaveDia = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Reduz a foto antes de enviar (celular tira fotos de 4–10 MB)
export function comprimirImagem(file, larguraMax = 1200, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, larguraMax / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem"))),
        "image/jpeg",
        qualidade
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido"));
    };
    img.src = url;
  });
}

export async function enviarEmail(params) {
  const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templateId,
      user_id: EMAILJS.publicKey,
      template_params: params,
    }),
  });
  if (!r.ok) throw new Error(`EmailJS respondeu ${r.status}`);
}

// Mensagem de erro amigável a partir de qualquer erro do Supabase/rede
export function msgErro(e) {
  const m = (e && (e.message || e.error_description)) || String(e || "");
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Sem conexão. Verifique a internet e tente de novo.";
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  return m || "Algo deu errado. Tente de novo.";
}
