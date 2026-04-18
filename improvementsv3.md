# grain — Análise de Melhorias v3

> Revisão completa da implementação atual contra os requisitos funcionais e não-funcionais.
> Data: 2026-04-18

---

## Problemas de Identidade do Produto (o app não parece o que promete ser)

Esses problemas não quebram funcionalidade, mas fazem o app falhar na proposta central: ser um editor de fotos com estética analógica de qualidade, comparável ao Prequel. São os mais importantes para o produto como um todo.

### P1. LUTs não são LUTs — são matrizes de cor 3×3

**Arquivo:** `core/luts/luts.ts`

O que está implementado são transformações lineares de cor (9 coeficientes + offset), não LUTs reais. Uma LUT de verdade (formato `.cube`) é uma tabela tridimensional com 33³ ou 64³ pontos que remapeia qualquer valor RGB de forma **não-linear e por zona tonal** — exatamente o que cria o caráter visual do filme analógico: rolloff suave nos altos, sombras levantadas com cast colorido, relação de cor que varia por luminosidade.

Com a matrix atual é impossível reproduzir:
- Altos quentes com sombras frias (teal & orange cinematográfico)
- Shadow lift com cast azul/verde específico de cada emulsão
- Highlight rolloff diferente de uma clipagem linear
- Qualquer não-linearidade tonal

**Solução:** Implementar lookup 3D real via WebGL usando textura HaldCLUT (formato 2D que representa uma LUT 3D). Existem packs de HaldCLUTs gratuitas e de domínio público simulando Kodak, Fuji, Polaroid. O shader de aplicação é simples e de alta performance.

### P2. Grain de filme implementado como ruído digital aleatório

**Arquivo:** `core/pipeline/canvas2d.ts`

O app se chama **grain** e o efeito de grain usa `Math.random()` por pixel — ruído digital branco, o oposto estético do que o nome promete. Grain de filme analógico tem características físicas específicas:

- **Estrutura correlacionada**: nuvens de halogeto de prata, não pixels independentes
- **Dependência de luminosidade**: concentrado nas sombras, quase ausente nos altos
- **Frequência espacial calibrada**: grain de ISO 400 tem tamanho físico diferente de ISO 3200
- **Variação de cor entre canais**: grain de slide film tem cast roxo/verde nas sombras

O grain atual é indistinguível de compressão JPEG ruidosa. Pior: como usa `Math.random()` a cada render, o grain muda a cada preview — causando flickering visual em toda atualização de slider.

**Solução:** Gerar textura de grain via Perlin/Simplex noise com seed fixa por preset, aplicar curva de luminosidade para concentrar nas sombras, calibrar frequência e intensidade por "ISO" simulado. A textura pode ser pré-gerada uma vez e reutilizada.

### P3. Presets sem personalidade visual distinta

**Arquivo:** `core/presets/presets.ts`

Os 12 presets atuais são variações do mesmo tema: brilho ± pouco, contraste ± pouco, temperatura ± pouco, fade, grain. Sienna Dust, Linen Fade e Amber 35 são quase idênticos em resultado visual. ISO 160 e ISO 400 diferem apenas na quantidade de noise aleatório.

Nenhum preset tem a assinatura visual inconfundível que faz um app de filtros ser memorável:

| Estética | O que criaria o look | Status atual |
|---|---|---|
| Kodachrome | Vermelhos saturados, azuis densos, pretos profundos | Ausente |
| Fuji Velvia | Verdes agressivos, saturação elevada, sombras esverdeadas | Ausente |
| Portra 400 | Skin tones quentes, altos limpos, sombras neutras | "Faded Portra" é só uma matrix quase-identidade |
| Polaroid | Cyan shift, bordas queimadas, fade nos altos | Ausente |
| Slide crossado | Sombras esverdeadas, altos magenta, contraste extremo | "Cross Dev" mal muda a imagem |
| Bleach bypass | Prata nos meios-tons, dessaturação parcial, contraste alto | Ausente |
| Lomografia | Vinheta pesada, vazamento de luz nas bordas, color shift | Ausente |

**Solução:** Com HaldCLUTs reais (P1 resolvido) + grain analógico (P2 resolvido) + curvas tonais por canal por preset, é possível criar presets com identidade visual própria. Cada preset deveria ter uma assinatura que qualquer usuário reconhece sem ver o nome.

---

## Problemas Críticos (quebram funcionalidade)

### 1. Canvas com tamanho fixo (390×520)
**Arquivo:** `components/Editor/EditorCanvasClient.tsx`  
**RF afetado:** RF-02  
O Stage do Konva é hardcoded em 390px × 520px. Em telas menores (ex: iPhone SE) parte do canvas fica cortada. Em telas maiores (tablet, desktop) o canvas fica minúsculo com muito espaço vazio. Precisa de `ResizeObserver` no container para recalcular dimensões dinamicamente, mantendo a proporção da imagem.

### 2. Sem pinch-to-zoom / pan no canvas
**Arquivo:** `components/Editor/EditorCanvasClient.tsx`  
**RF afetado:** RF-02  
Não existe gesture de zoom ou arrasto para navegar pela imagem. Em imagens grandes o usuário não consegue ver detalhes ou verificar qualidade de ajustes. Deveria usar os eventos multitouch do Konva (`onTouchMove`) para implementar zoom e pan via transformação do Stage.

### 3. Crop não respeita aspect ratio durante o drag
**Arquivo:** `components/Editor/EditorCanvasClient.tsx`  
**RF afetado:** RF-05  
Quando o usuário seleciona uma proporção (ex: 1:1) e arrasta um handle de crop, a restrição de ratio não é aplicada. O resultado é uma seleção com proporção errada. A lógica de arrastar handle precisa corrigir o eixo livre com base no locked ratio.

### 4. Sharpness slider não faz nada
**Arquivos:** `core/pipeline/canvas2d.ts`, `components/Adjustments/AdjustmentsPanel.tsx`  
**RF afetado:** RF-03  
O tipo `AdjustmentsOperation` tem o campo `sharpness`, o slider é renderizado, mas `canvas2d.ts` nunca aplica o efeito. O usuário ajusta o slider sem resultado visual. Precisa implementar um kernel de convolução (unsharp mask) no Canvas 2D ou via WebGL.

### 5. `toDataURL` chamado a cada frame de preview
**Arquivo:** `core/pipeline/canvas2d.ts`  
**RNF afetado:** RNF-01 (performance)  
A pipeline usa `canvas.toDataURL('image/png')` para retornar o resultado como string base64, que é então carregada em outro elemento. Isso força encode PNG + decode a cada atualização de slider — operação bloqueante e extremamente custosa. Deve retornar `ImageBitmap` ou desenhar diretamente num canvas de output, sem serialização intermediária.

### 6. Contexto WebGL e shaders recompilados a cada aplicação de LUT
**Arquivo:** `core/luts/webgl-lut.ts`  
**RNF afetado:** RNF-01 (performance)  
A cada vez que uma LUT é aplicada, o código recria o programa WebGL, compila os shaders e faz upload da textura. Em tempo real isso gera stutters severos. O programa WebGL deve ser compilado uma vez e cacheado; apenas o uniform da imagem muda a cada frame.

### 7. Ícones do PWA são imagens 1×1 quebradas
**Arquivo:** `public/icons/`  
**RNF afetado:** RNF-03  
Os arquivos de ícone no manifest são placeholders de 1×1 pixel. A instalação como PWA no Android/iOS mostra ícone inválido. Precisa gerar ícones reais em pelo menos 192×192 e 512×512, com variante `maskable` para Android adaptativo.

### 8. Web Share API não implementada
**RF afetado:** RF-11  
O requisito de compartilhamento direto via Share Sheet do SO não existe. O export salva o arquivo mas não abre o seletor nativo de compartilhamento. Implementar com `navigator.share({ files: [blob] })` e fallback para download quando a API não estiver disponível.

---

## Problemas de Alta Prioridade (degradam experiência)

### 9. Cada movimento de slider cria entrada no histórico de undo
**Arquivo:** `store/editor/index.ts`  
O `setPipeline` adiciona ao histórico a cada chamada. Um único ajuste de brilho com o slider cria 20–50 entradas no histórico (uma por pixel de movimento). O undo fica inutilizável. A solução é distinguir "preview" (sem histórico) de "commit" (ao soltar o slider), usando `onPointerUp`/`onTouchEnd` para confirmar a operação.

### 10. Sem confirmação ao deletar projeto
**Arquivo:** `app/projects/page.tsx`, `store/projects/repository.ts`  
O botão "Deletar" executa imediatamente sem diálogo de confirmação. Com limite de 20 projetos e thumbnails como única referência, uma exclusão acidental é perda de trabalho sem recuperação. Adicionar modal de confirmação antes de deletar.

### 11. Texto pode sair completamente do canvas
**Arquivo:** `components/Editor/EditorCanvasClient.tsx`  
O drag do texto só restringe o ponto de ancoragem ao limite do canvas, mas não o bounding box do texto. Em fontes grandes o texto pode ficar cortado ou completamente fora da área visível. O clamp precisa considerar largura e altura estimada do texto.

### 12. HEIC listado como suportado sem fallback
**Arquivo:** `app/page.tsx`  
O helper text e o `accept` do input incluem HEIC, mas nenhum código faz decodificação. Chrome/Firefox não suportam HEIC nativamente. Remover HEIC do accept list ou integrar uma biblioteca de decodificação (ex: `heic2any`).

### 13. Geração de thumbnails de presets bloqueia a UI
**Arquivo:** `components/Presets/PresetsPanel.tsx`, `core/presets/`  
Ao abrir o painel de Presets pela primeira vez, todos os 12 thumbnails são gerados em sequência no thread principal. Em dispositivos lentos isso trava o app por 1–3 segundos. Usar geração lazy (um por vez, via `requestIdleCallback`) ou mover para um Web Worker.

### 14. Sistema de feedback por texto ephemeral sem consistência
**Arquivos:** `components/Editor/EditorToolbar.tsx`  
Mensagens de sucesso/erro aparecem como texto simples no header por 2 segundos e somem. Não existe feedback haptico, toast, ou indicação persistente. Implementar um componente de Toast centralizado que seja usado por toda a UI.

### 15. Projeto carregado não limpa o histórico de undo
**Arquivo:** `store/editor/index.ts`  
Ao abrir um projeto salvo, o estado é restaurado mas o histórico de undo conserva operações anteriores. O usuário pode desfazer para um estado de outra sessão de edição. O load de projeto deve resetar o histórico.

---

## Problemas de Média Prioridade (polimento)

### 16. Apenas 1 LUT disponível
**Arquivo:** `core/luts/catalog.ts`  
Só existe "cinematic-teal". Os presets da categoria "Film" dependem de LUTs mas não têm arquivos `.cube` correspondentes. O catálogo de LUTs precisa ser expandido com pelo menos 6–8 LUTs para a proposta visual do app fazer sentido.

### 17. Apenas 3 fontes de texto
**Arquivo:** `components/Text/TextPanel.tsx`  
As opções são Avenir Next, Georgia e Courier New — limitadas e sem personalidade. Adicionar ao menos 5–8 fontes variadas carregadas via `@font-face` local (sem Google Fonts para manter offline-first).

### 18. Blend modes incompletos nos overlays
**Arquivo:** `components/Overlays/OverlaysPanel.tsx`, `core/overlays/`  
Apenas 4 blend modes: normal, multiply, screen, overlay. Faltam `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light` — todos nativos do CSS/Canvas e sem custo de implementação.

### 19. Sem skeleton / loading state nas telas
**Arquivos:** `app/projects/page.tsx`, `components/Presets/PresetsPanel.tsx`  
A galeria de projetos e o painel de presets exibem conteúdo sem nenhum estado de carregamento. O usuário vê tela em branco por um instante. Adicionar skeleton screens ou spinners durante carregamento.

### 20. Toolbar do editor muito densa em mobile
**Arquivo:** `components/Editor/EditorToolbar.tsx`  
O topo do editor tem 7 ações apertadas numa linha: projetos, undo, redo, before/after, salvar, share e qualidade. Em 375px ficam com texto truncado ou ícones sobrepostos. Separar ações secundárias (share, opções de export) em um menu/bottom sheet.

### 21. Grain effect causa flickering
**Arquivo:** `core/pipeline/canvas2d.ts`  
O efeito de grão usa `Math.random()` por pixel a cada render. Cada preview re-renderizado tem um grão diferente, causando animação involuntária. O grão deve ser gerado com seed fixa (ex: baseada no hash do nome do arquivo) ou pré-gerado como textura estática.

### 22. Sem busca / filtro na galeria de projetos
**Arquivo:** `app/projects/page.tsx`  
Com limite de 20 projetos e thumbnails como única referência, encontrar um projeto específico é difícil. Adicionar campo de busca por nome ou ordenação por data (mais recente / mais antigo).

### 23. Idioma hardcoded em português
**Arquivos:** vários  
Toda a UI está em pt-BR sem nenhuma abstração de i18n. Não é necessário implementar multilíngue agora, mas centralizar strings em um arquivo de constantes facilitaria uma futura tradução e elimina strings duplicadas espalhadas no código.

### 24. Sem Error Boundary
**Arquivo:** `app/layout.tsx`  
Erros não capturados em componentes React causam tela branca sem mensagem. Adicionar um `ErrorBoundary` global que mostre mensagem amigável e botão para voltar ao início.

### 25. Ajustes não mostram valor numérico atual
**Arquivo:** `components/Adjustments/AdjustmentsPanel.tsx`  
Os sliders exibem o nome do ajuste mas não o valor atual (ex: "Brilho: +35"). O usuário não sabe o valor exato sem contexto visual. Mostrar o valor ao lado do label, resetando com duplo clique.

---

## Resumo — Status por Requisito Funcional

| RF | Feature | Status | Problemas |
|---|---------|--------|-----------|
| RF-01 | Upload de imagem | ✅ Funcional | HEIC sem fallback (#12) |
| RF-02 | Canvas interativo | ⚠️ Parcial | Tamanho fixo (#1), sem zoom/pan (#2) |
| RF-03 | Ajustes | ⚠️ Parcial | Sharpness não aplicado (#4) |
| RF-04 | Presets / LUTs | ⚠️ Parcial | Apenas 1 LUT (#16), thumbnails travam (#13) |
| RF-05 | Crop | ⚠️ Parcial | Ratio não enforçado no drag (#3) |
| RF-06 | Overlays | ⚠️ Parcial | Blend modes incompletos (#18) |
| RF-07 | Texto | ⚠️ Parcial | Texto sai do canvas (#11), fontes limitadas (#17) |
| RF-08 | Antes/Depois | ✅ Funcional | — |
| RF-09 | Projetos | ⚠️ Parcial | Sem confirmação de delete (#10), sem busca (#22) |
| RF-10 | Export | ✅ Funcional | — |
| RF-11 | Compartilhar | ❌ Ausente | Web Share API não implementada (#8) |
| RF-12 | Offline / PWA | ⚠️ Parcial | Ícones quebrados (#7) |

---

## Ordem de Correção Sugerida

**Sprint 0 — Identidade do produto (fundação visual)**
1. HaldCLUT via WebGL substituindo as matrizes 3×3 (P1)
2. Grain analógico com Perlin noise + curva de luminosidade + seed fixa (P2)
3. Redesenho dos presets com personalidade visual distinta (P3)

**Sprint 1 — Críticos de UX e performance**
1. Responsividade do canvas (#1)
2. `toDataURL` → `ImageBitmap` no pipeline (#5)
3. Cache de contexto WebGL (#6)
4. Undo por commit, não por preview (#9)
5. Sharpness implementado (#4)

**Sprint 2 — Funcionalidade faltante**
6. Pinch-to-zoom / pan (#2)
7. Crop com aspect ratio enforçado (#3)
8. Web Share API (#8)
9. Ícones PWA reais (#7)
10. Confirmação de delete (#10)

**Sprint 3 — Polimento**
11. Toast system (#14)
12. Grain com seed fixa (#21)
13. Texto dentro do canvas (#11)
14. Lazy thumbnails de presets (#13)
15. Error Boundary (#24)
16. Valor numérico nos sliders (#25)
17. Expandir LUTs e fontes (#16, #17)
18. Blend modes completos (#18)
