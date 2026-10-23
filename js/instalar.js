// Botão "Instalar app": no Android/Chrome abre o pedido de instalação;
// no iPhone mostra como adicionar à tela de início (o Safari não tem botão automático).
import { html, useState, useEffect } from "./lib.js";

let pedidoGuardado = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoGuardado = e; dispatchEvent(new Event("echo-pode-instalar")); });

const jaInstalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function BotaoInstalar() {
  const [podeInstalar, setPodeInstalar] = useState(!!pedidoGuardado);
  const [dicaIphone, setDicaIphone] = useState(false);

  useEffect(() => {
    const ok = () => setPodeInstalar(true);
    addEventListener("echo-pode-instalar", ok);
    addEventListener("appinstalled", () => setPodeInstalar(false));
    return () => removeEventListener("echo-pode-instalar", ok);
  }, []);

  if (jaInstalado()) return null;

  async function instalar() {
    if (!pedidoGuardado) return;
    pedidoGuardado.prompt();
    await pedidoGuardado.userChoice;
    pedidoGuardado = null;
    setPodeInstalar(false);
  }

  if (podeInstalar) return html`
    <button class="cartao-instalar" onClick=${instalar}>
      <img src="icons/icon-192.png" alt="" width="44" height="44" />
      <span><strong>Instalar o app da Echo</strong><small>Acesse direto da tela inicial do celular</small></span>
      <span class="instalar-seta">📲</span>
    </button>`;

  if (ehIphone()) return html`
    <div>
      <button class="cartao-instalar" onClick=${() => setDicaIphone(!dicaIphone)}>
        <img src="icons/apple-touch-icon.png" alt="" width="44" height="44" />
        <span><strong>Adicionar à tela de início</strong><small>Use o portal como um app no iPhone</small></span>
        <span class="instalar-seta">${dicaIphone ? "▲" : "▼"}</span>
      </button>
      ${dicaIphone && html`
        <ol class="dica-iphone">
          <li>Toque no botão <strong>Compartilhar</strong> <span aria-hidden="true">(quadrado com seta ↑)</span> na barra do Safari</li>
          <li>Escolha <strong>Adicionar à Tela de Início</strong></li>
          <li>Toque em <strong>Adicionar</strong></li>
        </ol>`}
    </div>`;

  return null;
}
