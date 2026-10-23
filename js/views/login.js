// Login do administrador, "esqueci minha senha" e definição de nova senha.
import { html, useState } from "../lib.js";
import * as api from "../api.js";
import { msgErro } from "../util.js";
import { Botao, Voltar, Erro, Sucesso, Campo } from "../components.js";

export function Login() {
  const [modo, setModo] = useState("entrar"); // entrar | esqueci
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setCarregando(true); setErro("");
    try { await api.entrar(email, senha); } // o app troca de tela sozinho ao logar
    catch (err) { setErro(msgErro(err)); }
    finally { setCarregando(false); }
  }

  async function esqueci(e) {
    e.preventDefault();
    if (!email.trim()) return setErro("Digite seu e-mail.");
    setCarregando(true); setErro("");
    try {
      await api.recuperarSenha(email);
      setOk("Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.");
    } catch (err) { setErro(msgErro(err)); }
    finally { setCarregando(false); }
  }

  return html`
    <main class="estreito centro">
      <${Voltar} />
      <form class="cartao pilha" onSubmit=${modo === "entrar" ? entrar : esqueci}>
        <div class="ico-grande">${modo === "entrar" ? "🔑" : "📧"}</div>
        <h2>${modo === "entrar" ? "Área Administrativa" : "Recuperar senha"}</h2>
        <${Campo} rotulo="E-mail">
          <input type="email" autocomplete="username" value=${email} onInput=${(e) => { setEmail(e.target.value); setErro(""); }} required />
        <//>
        ${modo === "entrar" && html`
          <${Campo} rotulo="Senha">
            <input type="password" autocomplete="current-password" value=${senha} onInput=${(e) => { setSenha(e.target.value); setErro(""); }} required />
          <//>`}
        <${Erro}>${erro}<//>
        <${Sucesso}>${ok}<//>
        <${Botao} tipo="submit" carregando=${carregando} largo>${modo === "entrar" ? "Entrar" : "Enviar link"}<//>
        <button type="button" class="link-suave"
                onClick=${() => { setModo(modo === "entrar" ? "esqueci" : "entrar"); setErro(""); setOk(""); }}>
          ${modo === "entrar" ? "🔒 Esqueci minha senha" : "Voltar ao login"}
        </button>
      </form>
    </main>`;
}

// Aberta pelo link do e-mail de recuperação
export function NovaSenha({ concluir }) {
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e) {
    e.preventDefault();
    if (senha.length < 8) return setErro("Use pelo menos 8 caracteres.");
    if (senha !== senha2) return setErro("As senhas não coincidem.");
    setCarregando(true); setErro("");
    try { await api.trocarSenha(senha); concluir(); }
    catch (err) { setErro(msgErro(err)); }
    finally { setCarregando(false); }
  }

  return html`
    <main class="estreito centro">
      <form class="cartao pilha" onSubmit=${salvar}>
        <div class="ico-grande">🔐</div>
        <h2>Criar nova senha</h2>
        <${Campo} rotulo="Nova senha"><input type="password" autocomplete="new-password" value=${senha} onInput=${(e) => setSenha(e.target.value)} /><//>
        <${Campo} rotulo="Confirmar"><input type="password" autocomplete="new-password" value=${senha2} onInput=${(e) => setSenha2(e.target.value)} /><//>
        <${Erro}>${erro}<//>
        <${Botao} tipo="submit" carregando=${carregando} largo>Salvar nova senha<//>
      </form>
    </main>`;
}
