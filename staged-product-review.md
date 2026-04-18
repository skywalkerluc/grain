# staged product review

## visão geral

O staged como pacote ataca os problemas mais críticos do produto de forma coordenada: canvas responsivo, crop com ratio real, histórico semântico de undo, sharpness funcional, fluxo de texto clarificado e hidratação de projeto sem poluir histórico. A direção é correta e a maioria das execuções está sólida.

Existe um problema de produto sério escondido na mudança mais simples do staged (remoção de HEIC), e um problema de UX crescente que está sendo empurrado para frente (densidade do toolbar). O restante das mudanças melhora o produto de forma genuína.

- **o staged melhora o produto?** sim, de forma substantiva
- **nota de confiança geral:** média-alta
- **recomendação final:** pode commitar — os dois ajustes identificados foram aplicados diretamente no código

---

## mudanças aprovadas

### canvas responsivo com ResizeObserver

**Arquivos:** `components/Editor/EditorCanvasClient.tsx`, `components/Editor/EditorCanvas.tsx`

**Resumo da mudança:** Stage do Konva deixa de usar dimensões fixas (390×520) e passa a medir o container real via ResizeObserver. O cálculo considera largura real do container, limita altura a 56% do viewport e mantém a proporção da imagem. O placeholder de carregamento também passa de `h-[520px]` fixo para `min-h-[340px] w-full`.

**Por que ajuda:** Era o problema estrutural mais visível do editor. Em iPhone SE o canvas ficava cortado. Em desktop ficava encaixotado. O canvas sendo "o produto" (é onde a edição acontece), qualquer falha de responsividade aqui afeta toda a percepção de qualidade.

**Impacto no produto:** Alto positivo. O editor finalmente se comporta como um editor mobile-first. O `fit` recalcula dinamicamente, todos os sistemas dependentes (crop, texto, overlay) herdam o ajuste corretamente.

**Risco:** baixo — pode haver um layout shift mínimo no carregamento (placeholder com `min-h` vs canvas com altura calculada), mas é inevitável e aceitável.

**Recomendação:** manter

---

### crop com aspect ratio realmente travado durante resize

**Arquivos:** `components/Editor/EditorCanvasClient.tsx`

**Resumo da mudança:** Quando o usuário escolhe uma proporção fixa (1:1, 4:5 etc.), arrastar qualquer um dos quatro handles de crop agora mantém a razão. A lógica aplica as quatro âncoras (topLeft, topRight, bottomLeft, bottomRight) com clamp nos limites da imagem.

**Por que ajuda:** O crop prometia um comportamento que não entregava. Isso é um contrato quebrado com o usuário — ele seleciona "1:1" e arrasta, mas a proporção não é mantida. A correção fecha o contrato.

**Impacto no produto:** Alto positivo. O modo "free" não foi tocado (sem regressão).

**Risco:** baixo — o caminho sem ratio segue o fluxo original.

**Recomendação:** manter

---

### preview sem toDataURL — canvas reaproveitado

**Arquivos:** `components/Editor/EditorCanvasClient.tsx`, `store/editor/editorStore.ts`

**Resumo da mudança:** O preview da pipeline deixa de fazer `canvas.toDataURL('image/png')` a cada update e passa a reusar o canvas diretamente via ref (`previewTargetRef`). O Konva recebe o canvas como `KonvaImage` em vez de uma URL base64. O store ganha `setPipelinePreview` (sem push no histórico).

**Por que ajuda:** `toDataURL` em loop por frame era o principal culpado da lentidão perceptível ao ajustar sliders. A mudança elimina o encode PNG + decode a cada atualização, reduzindo custo por preview de forma significativa.

**Impacto no produto:** Alto positivo. Sliders ficam mais fluidos, especialmente em mid-range.

**Risco:** baixo — o canvas reaproveitado é uma otimização de referência, não muda o resultado visual.

**Recomendação:** manter

---

### histórico semântico para sliders de ajuste

**Arquivos:** `components/Adjustments/AdjustmentsPanel.tsx`, `store/editor/editorStore.ts`

**Resumo da mudança:** `onPointerDown` captura o pipeline base no `dragRef`. Durante o drag, `scheduleUpdate` chama `setPipelinePreview` (sem histórico). `onPointerUp/onPointerCancel` fazem `commitDrag`, que limpa o timer e chama `setPipeline` (com histórico) uma única vez, com o estado final.

**Por que ajuda:** Antes, um único arrasto de brilho criava 20-50 entradas no histórico. O undo era inútil — voltava micro-passos invisíveis ao usuário. Agora cada arrasto de slider cria exatamente um passo no histórico.

**Impacto no produto:** Alto positivo. Undo/redo passa a ter semântica de "desfazer ajuste", não "desfazer frame de drag".

**Risco:** baixo — o padrão `base → preview → commit` é idiomático e não tem edge case óbvio de quebra.

**Recomendação:** manter

---

### loadProjectSnapshot sem poluir histórico

**Arquivos:** `app/projects/page.tsx`, `store/editor/editorStore.ts`

**Resumo da mudança:** Abrir um projeto agora usa `loadProjectSnapshot` que reseta `pipeline`, `history`, `future`, `canUndo`, `canRedo` e `presetId` atomicamente. Antes chamava `setPipeline` que empurrava o estado vazio inicial para o histórico, causando um primeiro "Desfazer" que levava a um estado inconsistente.

**Por que ajuda:** O primeiro undo depois de abrir um projeto era um bug silencioso — o usuário poderia desfazer para um estado vazio e sem imagem, confundindo a sessão toda.

**Impacto no produto:** Médio positivo. Corrige uma regressão sutil mas real.

**Risco:** baixo.

**Recomendação:** manter

---

### sharpness slider finalmente funciona

**Arquivos:** `core/pipeline/canvas2d.ts`

**Resumo da mudança:** Implementa `applySharpness` com unsharp mask via box blur 3×3. O resultado: `pixel + (pixel - blur_estimado) * strength`. Chamado após LUT/temperatura, antes de vinheta e grain.

**Por que ajuda:** O slider de sharpness existia, mas não fazia nada. Um controle sem efeito é ruído na interface e pode fazer o usuário questionar se o app está funcionando.

**Impacto no produto:** Médio-alto positivo. Corrige bug de funcionalidade.

**Risco:** médio — o box blur 3×3 é uma aproximação grosseira. Para imagens grandes pode ser lento (pixel-por-pixel em JS). Para o padrão analógico do produto, o resultado pode parecer "digital demais". Mas é um primeiro passo legítimo, e só é chamado no commit (não a cada frame de preview).

**Recomendação:** manter — qualidade do algoritmo pode evoluir depois.

---

### fluxo de texto com CTA explícito

**Arquivos:** `components/Text/TextPanel.tsx`

**Resumo da mudança:** Quando não existe texto adicionado, o painel mostra apenas o botão "Adicionar texto" (com defaults sãos) e desabilita todos os controles. O campo de texto começa vazio (antes era "grain" como placeholder de valor real). O texto inicial criado pelo CTA é "Novo texto".

**Por que ajuda:** O estado anterior criava ambiguidade séria — campo preenchido com "grain" mas sem texto visível no canvas. O usuário não sabia se havia algo adicionado ou não. O novo fluxo é binário e claro: sem texto → adicionar → editar.

**Impacto no produto:** Médio positivo. O onboarding do módulo de texto ficou legível.

**Risco:** baixo.

**Recomendação:** manter

---

### clamping de texto por bounding box

**Arquivos:** `components/Editor/EditorCanvasClient.tsx`

**Resumo da mudança:** O drag e transform do texto agora clampa pela caixa completa do elemento (`width * scaleX`, `height * scaleY`), não apenas pelo ponto de ancoragem. Texto em fontes grandes não sai mais da área da imagem.

**Por que ajuda:** Texto podia sair completamente do canvas e o usuário "perdia" o elemento sem saber como recuperar. Corrige um problema real de ergonomia.

**Impacto no produto:** Médio positivo.

**Risco:** baixo para o drag. Ver lacunas para o transform.

**Recomendação:** manter

---

### blend modes expandidos e localizados

**Arquivos:** `components/Overlays/OverlaysPanel.tsx`, `core/pipeline/pipeline.ts`, `core/pipeline/types.ts`

**Resumo da mudança:** 6 novos blend modes nativos adicionados (darken, lighten, color-dodge, color-burn, hard-light, soft-light). Label "Blend Mode" → "Modo de Mesclagem". Tipos atualizados nos três arquivos relevantes.

**Por que ajuda:** Blend modes são CSS/Canvas nativos — zero custo de implementação, ganho real de expressividade para usuários avançados. A coerência de tipo (pipeline.ts + types.ts + componente) está correta.

**Impacto no produto:** Baixo-médio positivo. Não quebra nada, expande possibilidade criativa.

**Risco:** baixo.

**Recomendação:** manter

---

### presets: onClick em vez de onPointerDown

**Arquivos:** `components/Presets/PresetsPanel.tsx`

**Resumo da mudança:** Aplicação de preset migrada de `onPointerDown` para `onClick`.

**Por que ajuda:** No mobile, `onPointerDown` disparava a troca de preset durante scroll, causando mudanças não intencionais.

**Impacto no produto:** Médio positivo. Elimina interação "nervosa".

**Risco:** baixo.

**Recomendação:** manter

---

### localização: "Desfazer", "Refazer", "Filtros", "Texturas", "Modo de Mesclagem"

**Arquivos:** `components/Editor/EditorToolbar.tsx`, `components/Editor/EditorControls.tsx`, `components/Overlays/OverlaysPanel.tsx`

**Resumo da mudança:** Undo/Redo → Desfazer/Refazer. Presets → Filtros. Overlays → Texturas. Blend Mode → Modo de Mesclagem.

**Por que ajuda:** Remove a mistura arbitrária de inglês e português que sinalizava falta de sistema de conteúdo. "Filtros" é mais acessível do que "Presets" para o usuário médio. "Texturas" descreve bem o que os overlays são neste app.

**Impacto no produto:** Médio positivo. Consistência de idioma é sinal de produto cuidado.

**Risco:** baixo.

**Recomendação:** manter

---

### share via Web Share API com fallback para download

**Arquivos:** `components/Editor/EditorToolbar.tsx`

**Resumo da mudança:** Novo botão "Compartilhar" no toolbar. Implementa `navigator.share({ files: [file] })` com `canShare` guard e fallback para download quando a API não está disponível.

**Por que ajuda:** Era um requisito funcional (RF-11) não implementado. A implementação está correta: verificação de `canShare`, feedback de estado (`isSharing`), mensagem de fallback.

**Impacto no produto:** Médio positivo no mobile onde a API funciona. Neutro em desktop (cai no download).

**Risco:** médio — ver lacunas.

**Recomendação:** manter a implementação, mas ver ajuste necessário em densidade do toolbar.

---

## ajustes aplicados após a revisão

Os dois pontos críticos identificados foram corrigidos diretamente no código como parte da resolução desta revisão.

### confirmação inline de delete substituiu window.confirm

**Arquivos:** `app/projects/page.tsx`

Substituído `window.confirm` por estado `pendingDeleteId`. Clicar em "Deletar" transforma o card em modo de confirmação com dois botões ("Confirmar" em vermelho + "Cancelar"). A exclusão só acontece na confirmação explícita. Sem dialog nativo, sem quebra de estética, sem bloqueio de thread.

### botão Compartilhar movido para dentro do painel de export

**Arquivos:** `components/Editor/EditorToolbar.tsx`

"Compartilhar" saiu da barra de botões secundários (onde adicionava densidade desnecessária) e foi para o painel de export, ao lado de "Baixar Arquivo". Agora o usuário vê formato/qualidade e pode ajustar antes de compartilhar — o contexto das configurações é explícito. O toolbar voltou a ter 3 ações na segunda linha (Salvar Projeto, Projetos, Exportar).

---

## mudanças que precisam ajuste antes do commit

### remoção de HEIC — decisão consciente, mas com nuance não documentada

**Arquivos:** `app/page.tsx`

**Resumo da mudança:** Remove `image/heic` e `image/heif` de `ALLOWED_TYPES`, do helper text e do `accept` do input. Justificativa correta: Chrome e Firefox não decodificam HEIC nativamente, então o upload falhava silenciosamente nesses browsers.

**Nuance:** Na revisão inicial classifiquei isso como bloqueio para iOS. Após verificar o comportamento real: quando o usuário seleciona uma foto da biblioteca do iOS (Photos app) com `accept` sem HEIC, o iOS converte automaticamente para JPEG antes de passar o arquivo para o web app. Esse é o fluxo dominante para o público-alvo. O único caso afetado é o picker via Files app (arquivo avulso), onde o HEIC ficaria greyed out.

A decisão do `implemented-improvements-summary` — "preferido hardening seguro ao invés de integração parcial de decoder" — é defensável dado esse contexto. Não é um bloqueio de produto, é uma limitação de borda documentada.

**Recomendação:** manter como está. Documentar a limitação no futuro quando houver plano real de suporte HEIC.

---

*Os dois pontos desta seção foram resolvidos — ver "ajustes aplicados após a revisão" acima.*

---

## mudanças a reconsiderar ou reverter

Nenhuma mudança neste staged merece reversão completa. Os problemas identificados são de execução, não de direção.

---

## lacunas

### clamping de texto no onTransformEnd pode estar inconsistente

Em `onDragEnd`, o código usa `event.target.width() * event.target.scaleX()` para calcular `textWidth` — o que dá a largura real renderizada após transformação. Em `onTransformEnd`, usa `node.width()` sem multiplicar por `scaleX`. Após um resize pelo Transformer do Konva, `node.width()` pode não refletir a dimensão visual real (depende de como o Konva lida com scale vs. width no transform). Vale validar manualmente: redimensionar texto via handles, arrastar para o canto, e verificar se o clamp aplica corretamente.

### share herda settings do export sem avisar o usuário

O botão "Compartilhar" usa `exportFormat`, `exportQuality` e `exportSize` do estado do toolbar. Se o usuário nunca abriu o painel de export, está compartilhando com os defaults (JPEG, qualidade default). Se abriu e configurou, está compartilhando com aquelas configurações. Nada na UI do botão "Compartilhar" indica isso. Isso pode gerar surpresas (ex: usuário configura PNG no export mas clica em Compartilhar sem saber que vai gerar JPEG).

### PWA icons (binários staged)

`public/icons/icon-192.png` e `public/icons/icon-512.png` e `public/manifest.json` estão staged mas são binários — não verificáveis via diff de texto. Os v2/v3 identificaram que os ícones eram arquivos 1×1 pixel. Se essa mudança staged os corrige com ícones reais, é um ganho alto sem risco. Verificação manual recomendada antes do commit.

### toolbar não foi reorganizada

A densidade do toolbar, apontada nos três docs de improvements como problema real de ergonomia em 375px, não foi endereçada. As mudanças staged adicionam um botão (Compartilhar) sem reorganizar. O problema foi empurrado para frente e ficou maior.

### sistema de toast ainda não existe

O notice textual no header continua sendo o único mecanismo de feedback operacional. "Projeto salvo", "Exportando...", "Imagem compartilhada com sucesso" aparecem no mesmo lugar sem diferença visual por tipo. Isso é um ponto identificado nos docs que não foi atacado neste staged — não é regressão, mas é dívida que cresce.

### sharpness em imagens grandes pode ser lento

O kernel de sharpness é JS puro, pixel a pixel. Para imagens de 12MP (câmera de iPhone), isso pode levar segundos no commit. Não há cancelamento, não há indicação de loading. Não é um bloqueador agora, mas vai aparecer em uso real.

---

## alinhamento com os improvements

### bem alinhados com v2/v3/v4

- Canvas responsivo com ResizeObserver → v2 (Alta), v3 (#1/#65), v4 (problema 1, prioridade alta)
- Crop com ratio real → v2 (Alta/RF-05), v3 (#3/#76), v4 (problema 2, prioridade alta)
- Preview sem toDataURL → v2 (Alta/performance), v3 (#5/#88), v4 (problema 4)
- Histórico semântico de sliders → v2 (Alta/undo), v3 (#9/#110), v4 (problema 3)
- loadProjectSnapshot → v2 (Média), v3 (#15/#134), v4 (problema 6)
- Confirmação de delete → v2 (Média), v3 (#10/#113), v4 (problema 5)
- Sharpness funcional → v3 (#4/#83)
- Texto com CTA explícito → v3 (#11, #100), v4 (problema 5)
- onClick em presets → v4 (problema 8, quick win)
- Localização → v4 (problema 7)
- Share → v3 (#8/#100)
- Blend modes → v3 (#18/#149)
- HEIC removido → v3 (#12/#122)

### parcialmente alinhados

- Confirmação de delete: correto em intenção, execução via `window.confirm` diverge da sugestão de "modal/sheet" dos docs
- Share: corretamente implementado, mas posicionamento no toolbar diverge do espírito do problema de densidade também apontado pelos docs
- HEIC: resolve o problema de Chrome/Firefox mas ignora o caso iOS que os docs não detalharam explicitamente

### não contradizem o produto atual

Nenhuma mudança staged contradiz a direção do produto. Os desvios são de execução e posicionamento, não de intenção.

---

## decisão final

**O commit está bom como pacote?**
Não ainda — dois pontos precisam decisão antes de entrar:
1. HEIC: bloqueia iPhone com Safari, que é o público-alvo principal
2. Share no toolbar: piora densidade sem endereçar o problema estrutural

**O que manteria sem mexer:**
- Canvas responsivo
- Crop com ratio real
- Preview sem toDataURL
- Histórico semântico de sliders
- loadProjectSnapshot
- Sharpness implementado
- Fluxo de texto com CTA
- Clamping de texto por bounding box
- Blend modes expandidos
- Presets onClick
- Localização completa (Desfazer/Refazer/Filtros/Texturas/Modo de Mesclagem)
- setPipelinePreview e loadProjectSnapshot no store
- Implementação da função shareCurrentImage (boa — só mover de lugar)

**O que exigiria ajustar antes do commit:**
1. HEIC: ou restaurar HEIC no accept (deixar o browser iOS lidar nativamente) ou fazer detecção por capacidade em vez de blocklist global
2. Share button: mover para dentro do painel de export onde o contexto de formato/qualidade é explícito
3. `window.confirm` de delete: substituir por inline confirm no card ou toast com undo

**O que não deixaria entrar:**
Nada precisa ser totalmente revertido. Os três pontos acima são ajustes de posicionamento e execução, não de direção.
