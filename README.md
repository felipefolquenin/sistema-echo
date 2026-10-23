# sistema-echo

Site e Portal dos Condomínios da **Echo Jardinagem** — https://echojardinagem.com.br

| Endereço | O que é |
|---|---|
| `/` | Portal dos Condomínios (reclamações, portal dos moradores, painel admin) |
| `/agendamento/` | Página de agendamento de serviços |
| `/visita/` | Landing page de visita técnica |

## Como o portal funciona

- **Sem compilação**: é só HTML, CSS e JavaScript. O GitHub Pages publica direto.
- **Banco de dados**: Supabase (Postgres + login + fotos). Tudo fica num lugar só, então
  qualquer celular ou computador vê os mesmos dados.
- **Bibliotecas** (React, htm, Supabase) ficam em `js/vendor/`, então o site não depende de CDN externa.

```
index.html            página do portal
css/portal.css        todo o visual
js/config.js          ← ÚNICO arquivo de configuração (chaves do Supabase, WhatsApp, EmailJS)
js/api.js             toda conversa com o banco passa por aqui
js/agenda.js          regras de agenda (semanal / quinzenal / mensal)
js/util.js            datas, compressão de foto, e-mail
js/components.js      botões, selos, seletor de foto…
js/views/             telas públicas e login
js/admin/             abas do painel administrativo
supabase/schema.sql   estrutura do banco + regras de segurança
```

## Colocar no ar (primeira vez)

1. **Criar o projeto** em https://supabase.com/dashboard → *New project* (região São Paulo).
2. **Criar o banco**: *SQL Editor* → *New query* → colar `supabase/schema.sql` inteiro → *Run*.
   (Se for usar outro e-mail de admin, troque na última linha antes de rodar.)
3. **Criar seu login**: *Authentication* → *Users* → *Add user* → *Create new user*, com o mesmo
   e-mail da última linha do schema e uma senha forte. Marque *Auto Confirm User*.
4. **Bloquear cadastros estranhos**: *Authentication* → *Sign In / Providers* → desligue
   *Allow new users to sign up*.
5. **Link de "esqueci a senha"**: *Authentication* → *URL Configuration* → *Site URL* =
   `https://echojardinagem.com.br` e adicione o mesmo em *Redirect URLs*.
6. **Chaves**: *Project Settings* → *API* (ou botão *Connect*) → copie a *Project URL* e a chave
   *anon / publishable* para `js/config.js`.
7. Envie os arquivos para o GitHub. Em 1–2 minutos o site atualiza.

## Dados do sistema antigo

O sistema antigo guardava tudo **só no navegador** onde foi usado. Abra o painel novo
**no mesmo navegador/computador** que você usava antes → aba *Ajustes* → *Importar agora*.
O botão só aparece se houver dados antigos naquele navegador.

## Segurança, em resumo

- Visitantes não leem nem alteram tabelas: só usam funções específicas (enviar reclamação,
  ver o portal com o código do condomínio, consultar a própria reclamação com o código dela).
- Só e-mails da tabela `admins` entram no painel.
- A chave *anon* no `config.js` é pública por natureza; quem protege os dados são as regras do banco.
