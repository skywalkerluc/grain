# Requisitos Não Funcionais — Photo Editor App (MVP)

## RNF-01 · Performance

- O editor deve renderizar ajustes em tempo real com latência máxima de 100ms para imagens até 8MP em dispositivo mobile mid-range
- O tempo de carregamento inicial (first meaningful paint) deve ser inferior a 3s em conexão 4G
- O export de uma imagem deve completar em menos de 5s no cliente para imagens até 12MP
- LUTs e overlays devem ser processados via WebGL quando disponível, com fallback para Canvas 2D

---

## RNF-02 · Compatibilidade

- Suporte obrigatório: Safari iOS 16+, Chrome Android 108+, Chrome Desktop, Safari macOS
- Suporte desejável: Firefox 110+, Samsung Internet
- O layout deve ser funcional em telas de 375px de largura (iPhone SE) a 430px (iPhone 15 Pro Max)
- Resolução de desktop suportada: 1280px+

---

## RNF-03 · Offline / PWA

- O app deve ser instalável como PWA em iOS e Android (manifest + service worker)
- O Service Worker deve implementar cache-first para assets estáticos e network-first com fallback para rotas de navegação
- O app deve funcionar sem conexão após o primeiro carregamento completo
- O IndexedDB local deve ser a única fonte de persistência de dados

---

## RNF-04 · Experiência Mobile

- Toda a UI de edição deve ser operável com o polegar em uma mão (bottom-sheet, controles na metade inferior da tela)
- Áreas de toque interativas devem ter tamanho mínimo de 44x44px (Apple HIG / WCAG)
- Animações de transição devem respeitar `prefers-reduced-motion`
- O teclado virtual não deve ocultar controles críticos de edição

---

## RNF-05 · Armazenamento Local

- O app não deve exceder 50MB de uso de storage no cliente (assets cacheados incluídos)
- Imagens de projetos salvos devem ser armazenadas como Blob no IndexedDB (não como base64)
- Ao atingir o limite de 20 projetos, o app deve avisar e impedir novo save sem deletar um existente

---

## RNF-06 · Segurança e Privacidade

- Nenhuma imagem do usuário deve ser enviada a qualquer servidor externo
- Nenhum tracker ou analytics de terceiros no MVP
- O app não solicita permissões desnecessárias (câmera, localização, etc.)

---

## RNF-07 · Manutenibilidade

- O código deve seguir estrutura modular com separação clara entre: lógica de edição, estado global, UI e assets
- A pipeline de ajustes deve ser representada como lista de operações serializável (permite undo, preset save e eventual sync futura)
- Nenhuma lógica de processamento de imagem deve estar acoplada a componentes React

---

## RNF-08 · Qualidade de Código

- TypeScript estrito em todo o projeto (`strict: true`)
- Linting via ESLint + Prettier com config padronizada
- Testes unitários para a pipeline de ajustes (Jest ou Vitest)
- Sem dependência de bibliotecas com licença não comercial ou copyleft forte (GPL)

---

## RNF-09 · Deploy

- Build estático exportável (`next export`) para hospedagem em Vercel, Cloudflare Pages ou similar
- Nenhuma rota de API é necessária no MVP
- CI básico: build + lint + testes a cada push na branch principal
