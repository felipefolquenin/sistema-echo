// Aba "Ajustes": trocar senha e importar dados do sistema antigo.
import { html, useState } from "../lib.js";
import * as api from "../api.js";
import { msgErro } from "../util.js";
import { Botao, Campo, Erro, Sucesso } from "../components.js";

export function AbaAjustes({ recarregar }) {
  // Decide uma vez só: o aviso de importação continua na tela depois de importar
  const [mostrarImportar] = useState(api.temDadosAntigos);
  return html`
    <div class="pilha">
      <${TrocarSenha} />
      ${mostrarImportar && html`<${Importar} recarregar=${recarregar} />`}
      <div class="cartao">
        <h3>🌿 Portal público</h3>
        <p class="suave mb">Moradores acessam com o código de cada condomínio, cadastrado na aba Condomínios.</p>
        <a class="btn btn-primario" href="#/">Ver portal público →</a>
      </div>
    </div>`;
}

function TrocarSenha() {
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  async function salvar(e) {
    e.preventDefault();
    setOk(""); setErro("");
    if (senha.length < 8) return setErro("Use pelo menos 8 caracteres.");
    if (senha !== senha2) return setErro("As senhas não coincidem.");
    setCarregando(true);
    try { await api.trocarSenha(senha); setSenha(""); setSenha2(""); setOk("✅ Senha alterada!"); }
    catch (err) { setErro(msgErro(err)); }
    finally { setCarregando(false); }
  }

  return html`
    <form class="cartao pilha" onSubmit=${salvar}>
      <h3>🔑 Alterar senha</h3>
      <${Campo} rotulo="Nova senha"><input type="password" autocomplete="new-password" value=${senha} onInput=${(e) => setSenha(e.target.value)} /><//>
      <${Campo} rotulo="Confirmar"><input type="password" autocomplete="new-password" value=${senha2} onInput=${(e) => setSenha2(e.target.value)} /><//>
      <${Erro}>${erro}<//>
      <${Sucesso}>${ok}<//>
      <${Botao} tipo="submit" carregando=${carregando} largo>Alterar senha<//>
    </form>`;
}

function Importar({ recarregar }) {
  const [status, setStatus] = useState("");
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");
  const [fim, setFim] = useState(null);

  async function importar() {
    if (!confirm("Importar os dados do sistema antigo salvos neste navegador para o banco?")) return;
    setRodando(true); setErro("");
    try { setFim(await api.importarDadosAntigos(setStatus)); recarregar(); }
    catch (err) { setErro(msgErro(err) + " — pode tentar de novo, os condomínios já importados não serão duplicados."); }
    finally { setRodando(false); setStatus(""); }
  }

  return html`
    <div class="cartao pilha destaque">
      <h3>📦 Dados do sistema antigo encontrados</h3>
      <p class="suave">Este navegador tem condomínios, reclamações ou publicações do sistema antigo, que ficavam salvos só aqui. Importe para o banco para não perder nada.</p>
      ${status && html`<p class="suave">⏳ ${status}</p>`}
      <${Erro}>${erro}<//>
      ${fim && html`<${Sucesso}>✅ Importados: ${fim.condominios} condomínios, ${fim.reclamacoes} reclamações, ${fim.publicacoes} publicações.<//>`}
      ${!fim && html`<${Botao} onClick=${importar} carregando=${rodando} largo>Importar agora<//>`}
    </div>`;
}
