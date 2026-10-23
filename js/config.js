// =====================================================================
// CONFIGURAÇÃO — o único arquivo que você precisa editar.
// =====================================================================

// Supabase → Project Settings → API (ou "Connect")
// A chave "anon"/"publishable" é pública por natureza: quem protege os
// dados são as regras do banco (supabase/schema.sql), não o segredo dela.
export const SUPABASE_URL = "https://nrsvxfogrznfzmziekwo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc3Z4Zm9ncnpuZnptemlla3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjU2OTcsImV4cCI6MjEwODMwMTY5N30.LuYD-SAgnZ_fDJ5jSugcZyMX2Wqbzvyo4rrsLI96WmY";

// WhatsApp da Echo (só números, com 55 + DDD)
export const WHATSAPP = "5542988408840";

// EmailJS — usado nos lembretes de visita enviados pelo painel
export const EMAILJS = {
  publicKey: "lqI0oJGFLIs8N6eq_",
  serviceId: "service_u2qllop",
  templateId: "template_4fdj8fo",
};

// Catálogo de serviços e planos
export const SERVICOS = [
  "Corte de Grama ✂️", "Poda de Árvore 🌳", "Irrigação Inteligente 💧",
  "Iluminação de Jardim 💡", "Limpeza Geral 🧹", "Adubação 🌱",
  "Controle de Pragas 🐛", "Paisagismo 🌸",
];

export const PLANOS = {
  Essencial:    { ico: "🌱", cls: "plano-essencial" },
  Profissional: { ico: "⚙️", cls: "plano-profissional" },
  Premium:      { ico: "⭐", cls: "plano-premium" },
};

export const STATUS = {
  pendente:  { l: "Aguardando",   i: "⏳", cls: "st-pendente" },
  andamento: { l: "Em andamento", i: "🔧", cls: "st-andamento" },
  resolvida: { l: "Resolvida",    i: "✅", cls: "st-resolvida" },
};
