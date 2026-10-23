// Vídeo de introdução: aparece ao abrir o site e some ao terminar
// ou quando a pessoa toca/clica na tela (ou aperta qualquer tecla).
import { html, useState, useEffect, useRef } from "./lib.js";

const VIDEO = "media/intro.mp4";
const CHAVE = "echo-intro-vista";

// Mostra uma vez por visita (se fechar o navegador e voltar, aparece de novo)
function jaViu() {
  try { return sessionStorage.getItem(CHAVE) === "1"; } catch { return false; }
}

export function Intro({ children }) {
  const pular = jaViu() || /type=recovery/.test(location.hash);
  const [visivel, setVisivel] = useState(!pular);
  const [saindo, setSaindo] = useState(false);
  const video = useRef();

  function fechar() {
    if (saindo) return;
    try { sessionStorage.setItem(CHAVE, "1"); } catch { /* ignora */ }
    setSaindo(true);
    setTimeout(() => setVisivel(false), 400); // tempo do esmaecer
  }

  useEffect(() => {
    if (!visivel) return;
    const tecla = () => fechar();
    addEventListener("keydown", tecla);
    // Alguns celulares bloqueiam o play automático: tenta e, se não der, fecha
    const v = video.current;
    v && v.play().catch(() => fechar());
    return () => removeEventListener("keydown", tecla);
  }, [visivel]);

  return html`
    ${children}
    ${visivel && html`
      <div class=${"intro " + (saindo ? "saindo" : "")} onClick=${fechar} role="button" aria-label="Pular introdução">
        <video ref=${video} src=${VIDEO} muted autoplay playsinline preload="auto"
               onEnded=${fechar} onError=${fechar}></video>
        <span class="intro-pular">Toque na tela para pular ›</span>
      </div>`}`;
}
