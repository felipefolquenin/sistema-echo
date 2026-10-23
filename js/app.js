// Ponto de entrada: decide qual tela mostrar (pelo endereço #/...) e cuida do login.
import { html, useState, useEffect, createRoot } from "./lib.js";
import * as api from "./api.js";
import { Carregando } from "./components.js";
import { WHATSAPP } from "./config.js";
import { Inicio, NovaReclamacao, PortalMoradores } from "./views/publico.js";
import { Login, NovaSenha } from "./views/login.js";
import { Painel } from "./admin/painel.js";

// "#/admin/reclamacoes" → ["admin", "reclamacoes"]
function lerRota() {
  const h = location.hash;
  if (/^#(access_token|error)=/.test(h)) return ["admin"]; // volta do link de e-mail do Supabase
  return h.replace(/^#\/?/, "").split("/").filter(Boolean);
}

function useRota() {
  const [rota, setRota] = useState(lerRota);
  useEffect(() => {
    const mudar = () => { setRota(lerRota()); window.scrollTo(0, 0); };
    addEventListener("hashchange", mudar);
    return () => removeEventListener("hashchange", mudar);
  }, []);
  return rota;
}

function AreaAdmin({ aba }) {
  const [estado, setEstado] = useState("verificando"); // verificando | fora | dentro | nova-senha

  useEffect(() => {
    let vivo = true;
    async function verificar(sessao) {
      if (!sessao) return vivo && setEstado("fora");
      const admin = await api.souAdmin().catch(() => false);
      if (!admin) { await api.sair(); return vivo && setEstado("fora"); }
      const querNovaSenha = (e) => e === "nova-senha" || (api.veioDoLinkDeSenha && e === "verificando");
      vivo && setEstado((e) => (querNovaSenha(e) ? "nova-senha" : "dentro"));
    }
    api.sessaoAtual().then(verificar).catch(() => setEstado("fora"));
    const parar = api.aoMudarLogin((evento, sessao) => {
      if (evento === "PASSWORD_RECOVERY") return setEstado("nova-senha");
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") verificar(sessao);
    });
    return () => { vivo = false; parar(); };
  }, []);

  if (estado === "verificando") return html`<${Carregando} />`;
  if (estado === "nova-senha") return html`<${NovaSenha} concluir=${() => { setEstado("dentro"); location.hash = "#/admin"; }} />`;
  if (estado === "fora") return html`<${Login} />`;
  return html`<${Painel} aba=${aba} />`;
}

function NaoConfigurado() {
  return html`
    <main class="estreito centro">
      <div class="cartao">
        <div class="ico-grande">🔧</div>
        <h2>Sistema em manutenção</h2>
        <p class="suave mb">Voltamos em breve. Para falar com a Echo Jardinagem agora, chame no WhatsApp.</p>
        <a class="btn btn-primario" href=${"https://wa.me/" + WHATSAPP} target="_blank" rel="noopener">💬 WhatsApp</a>
      </div>
    </main>`;
}

function App() {
  const [pagina, sub] = useRota();
  if (!api.configurado) return html`<${NaoConfigurado} />`;
  switch (pagina) {
    case "reclamacao": return html`<${NovaReclamacao} />`;
    case "moradores": return html`<${PortalMoradores} />`;
    case "admin": return html`<${AreaAdmin} aba=${sub} />`;
    default: return html`<${Inicio} />`;
  }
}

createRoot(document.getElementById("app")).render(html`<${App} />`);
