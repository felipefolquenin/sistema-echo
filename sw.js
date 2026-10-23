// Service worker mínimo: só existe para o site poder ser instalado como app.
// Ele NÃO guarda cópia das páginas, então toda atualização no GitHub
// aparece na hora para quem instalou (nada de versão velha presa no celular).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* deixa o navegador buscar normalmente */ });
