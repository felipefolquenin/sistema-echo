// Peças de interface reutilizáveis.
import { html, useState, useRef, useEffect } from "./lib.js";
import { PLANOS, STATUS } from "./config.js";
import { comprimirImagem } from "./util.js";

export function Botao({ onClick, children, variante = "primario", tipo = "button", carregando = false, largo = false, desativado = false, titulo }) {
  return html`
    <button type=${tipo} class=${"btn btn-" + variante + (largo ? " largo" : "")} onClick=${onClick}
            disabled=${carregando || desativado} title=${titulo}>
      ${carregando ? "Aguarde…" : children}
    </button>`;
}

export function Voltar({ para = "#/" }) {
  return html`<a class="voltar" href=${para}>← Voltar</a>`;
}

export function Vazio({ icone = "📋", titulo, sub }) {
  return html`
    <div class="vazio">
      <div class="vazio-ico">${icone}</div>
      <div class="vazio-titulo">${titulo}</div>
      ${sub && html`<div class="vazio-sub">${sub}</div>`}
    </div>`;
}

export function Erro({ children }) {
  return children ? html`<div class="alerta alerta-erro" role="alert">${children}</div>` : null;
}

export function Sucesso({ children }) {
  return children ? html`<div class="alerta alerta-ok">${children}</div>` : null;
}

export function Carregando({ texto = "Carregando…" }) {
  return html`<div class="carregando">🌿 ${texto}</div>`;
}

export function SeloPlano({ plano = "Essencial" }) {
  const p = PLANOS[plano] || PLANOS.Essencial;
  return html`<span class=${"selo " + p.cls}>${p.ico} ${plano}</span>`;
}

export function SeloStatus({ status }) {
  const s = STATUS[status] || STATUS.pendente;
  return html`<span class=${"selo " + s.cls}>${s.i} ${s.l}</span>`;
}

export function Campo({ rotulo, children }) {
  return html`<label class="campo"><span class="rotulo">${rotulo}</span>${children}</label>`;
}

// Escolhe uma foto, comprime e devolve o Blob (onChange(blob | null))
export function SeletorFoto({ valor, onChange, rotulo = "Adicionar foto", etiqueta }) {
  const input = useRef();
  const [preview, setPreview] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!valor) { setPreview(null); return; }
    const url = URL.createObjectURL(valor);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [valor]);

  async function escolher(e) {
    const arquivo = e.target.files[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro("");
    setProcessando(true);
    try { onChange(await comprimirImagem(arquivo)); }
    catch (err) { setErro(err.message); }
    finally { setProcessando(false); }
  }

  return html`
    <div>
      <input ref=${input} type="file" accept="image/*" hidden onChange=${escolher} />
      <button type="button" class=${"foto " + (preview ? "foto-cheia" : "")}
              onClick=${() => !processando && input.current.click()}>
        ${processando && html`<span class="foto-msg">Comprimindo…</span>`}
        ${!processando && preview && html`
          <img src=${preview} alt=${rotulo} />
          ${etiqueta && html`<span class=${"foto-tag " + (etiqueta === "ANTES" ? "tag-antes" : "tag-depois")}>${etiqueta}</span>`}
          <span class="foto-trocar">📷 Trocar</span>`}
        ${!processando && !preview && html`
          <span class="foto-vazia">
            <span class="foto-ico">📷</span>
            <strong>${rotulo}</strong>
            <small>Toque para abrir a galeria</small>
          </span>`}
      </button>
      ${valor && html`<button type="button" class="link-perigo" onClick=${() => onChange(null)}>✕ Remover foto</button>`}
      <${Erro}>${erro}<//>
    </div>`;
}

// Mensagem rápida no canto da tela
export function useAviso() {
  const [msg, setMsg] = useState("");
  const timer = useRef();
  function avisar(texto) {
    setMsg(texto);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 3500);
  }
  const Aviso = () => (msg ? html`<div class="aviso" role="status">${msg}</div>` : null);
  return [avisar, Aviso];
}

// Antes/depois lado a lado
export function FotosAntesDepois({ antes, depois }) {
  if (!antes && !depois) return null;
  return html`
    <div class=${"antes-depois " + (antes && depois ? "duas" : "")}>
      ${antes && html`<figure><img src=${antes} alt="Antes" loading="lazy" /><span class="foto-tag tag-antes">ANTES</span></figure>`}
      ${depois && html`<figure><img src=${depois} alt="Depois" loading="lazy" /><span class="foto-tag tag-depois">DEPOIS</span></figure>`}
    </div>`;
}
