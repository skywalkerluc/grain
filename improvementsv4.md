# improvements v4

## 1. entendimento atual do produto
- o que o app aparenta fazer
  - Editor de foto mobile-first e offline-first (Next.js + Zustand + IndexedDB) com fluxo principal: importar imagem, editar em canvas, salvar projeto local e exportar arquivo. Evidência: `app/page.tsx`, `app/editor/page.tsx`, `app/projects/page.tsx`, `store/projects/projectRepository.ts`.
- quem aparenta ser o usuário
  - Pessoa que edita fotos rapidamente no celular, sem depender de backend/cloud, com foco em filtros, ajustes, crop e overlays. Evidência: copy de entrada e requisitos (`functional-requirements.md`, `non-functional-requirements.md`).
- quais parecem ser os fluxos principais
  - Fluxo A: Home (`/`) -> escolher foto -> Editor (`/editor`) -> salvar projeto/exportar.
  - Fluxo B: Home (`/`) -> Projetos (`/projects`) -> abrir projeto -> Editor.
  - Fluxo C: Editor -> alternar módulos (Presets/Ajustes/Crop/Texto/Overlays) -> aplicar operações na pipeline serializável.
- quais partes parecem mais maduras
  - Arquitetura de processamento separada da UI (`core/pipeline`, `core/presets`, `core/overlays`, `core/luts`).
  - Persistência local com limite de projetos e tratamento de erro específico (`ProjectLimitError`).
  - Cobertura de testes unitários no core (`npm test` passando com 19 testes).
- quais partes parecem mais frágeis ou indefinidas
  - Experiência de manipulação no canvas (responsividade real, previsibilidade de crop, fluidez em dispositivos menores).
  - Coerência de interação entre painéis (especialmente texto/crop) e clareza dos CTAs.
  - Fluxo de feedback para ações críticas (salvar/exportar/deletar) ainda básico.

## 2. problemas encontrados

### Canvas com geometria fixa e responsividade limitada
**Onde está:**  
`components/Editor/EditorCanvasClient.tsx:23-25`, `components/Editor/EditorCanvasClient.tsx:127-142`, `components/Editor/EditorCanvasClient.tsx:251`, `components/Editor/EditorCanvas.tsx:14`

**Evidência:**  
O stage usa `VIEWPORT_WIDTH = 390` e `VIEWPORT_HEIGHT = 520` fixos, e o loading placeholder também fixa `h-[520px]`. Não há medição do container real.

**Por que é um problema:**  
Em telas menores/maiores, a área útil real do editor não dirige o layout. Isso reduz previsibilidade visual e piora ergonomia no mobile e desktop.

**Impacto no uso:**  
Composição menos confiável, desperdício de espaço e sensação de UI “encaixada” em moldura fixa.

**Severidade:** alta

**Melhoria proposta:**  
Tornar o stage baseado no tamanho do container (ResizeObserver) e recalcular `fit` dinamicamente.

### Crop com proporção escolhida não é preservada ao redimensionar
**Onde está:**  
`components/Crop/CropPanel.tsx:6-13`, `components/Editor/EditorCanvasClient.tsx:181-220`

**Evidência:**  
O usuário escolhe proporção fixa no painel, mas o `resizeFromHandle` altera largura/altura livremente sem manter razão.

**Por que é um problema:**  
A interface promete trava de proporção, mas o comportamento real quebra essa expectativa durante o ajuste fino.

**Impacto no uso:**  
Resultado imprevisível e retrabalho no crop; perda de confiança no controle.

**Severidade:** alta

**Melhoria proposta:**  
Quando `cropAspectRatio !== 'free'`, aplicar resize acoplado por razão (incluindo limites e ancoragem por handle).

### Histórico de undo/redo fica “poluído” por ajustes contínuos de slider
**Onde está:**  
`components/Adjustments/AdjustmentsPanel.tsx:31-62`, `store/editor/editorStore.ts:76-86`

**Evidência:**  
Cada atualização de slider agenda `setPipeline` (16ms), e `setPipeline` sempre empilha histórico.

**Por que é um problema:**  
Undo/redo vira sequência de micro-passos em vez de estados semânticos da edição.

**Impacto no uso:**  
Maior fricção para voltar mudanças; custo cognitivo alto em edição iterativa.

**Severidade:** alta

**Melhoria proposta:**  
Separar estado transitório de preview (durante drag) do commit no histórico (onPointerUp/onChangeEnd).

### Pipeline de preview custa caro para interação contínua
**Onde está:**  
`components/Editor/EditorCanvasClient.tsx:92-116`, `core/pipeline/canvas2d.ts:254-301`

**Evidência:**  
A cada mudança, aplica pipeline completo e converte para `canvas.toDataURL('image/png')` para mostrar preview.

**Por que é um problema:**  
`toDataURL` em loop aumenta CPU/memória e piora fluidez em dispositivos mid-range (alvo explícito do RNF-01).

**Impacto no uso:**  
Lag perceptível ao ajustar sliders, crop e texto; experiência parece instável.

**Severidade:** alta

**Melhoria proposta:**  
Manter canvas/bitmap de preview sem encode base64 por frame e reduzir recomputações desnecessárias.

### Fluxo de texto não deixa claro “adicionar texto” vs “editar texto existente”
**Onde está:**  
`components/Text/TextPanel.tsx:15-22`, `components/Text/TextPanel.tsx:47-58`, `components/Editor/EditorCanvasClient.tsx:263-324`

**Evidência:**  
Campo começa com valor `grain` mesmo quando não existe operação de texto; no canvas, texto só aparece se `textOperation` já existir e tiver conteúdo.

**Por que é um problema:**  
A UI sugere que já existe texto pronto para edição, mas visualmente nada aparece até o usuário interagir.

**Impacto no uso:**  
Ambiguidade inicial no módulo de texto; onboarding fraco da funcionalidade.

**Severidade:** média

**Melhoria proposta:**  
Adicionar CTA explícito “Adicionar texto” e usar placeholder vazio quando não há operação ativa.

### Ação destrutiva de deletar projeto sem confirmação/undo
**Onde está:**  
`app/projects/page.tsx:88-98`, `app/projects/page.tsx:145-151`

**Evidência:**  
Clique em “Deletar” remove diretamente do IndexedDB, sem etapa de confirmação e sem “desfazer”.

**Por que é um problema:**  
É uma ação irreversível no contexto local e de valor alto (perda de trabalho).

**Impacto no uso:**  
Risco de perda acidental de projeto e queda de confiança.

**Severidade:** alta

**Melhoria proposta:**  
Incluir confirmação leve (modal/sheet) ou snackbar com undo temporário.

### Abrir projeto já inicia histórico com estado anterior vazio
**Onde está:**  
`app/projects/page.tsx:75-84`, `store/editor/editorStore.ts:59-74`, `store/editor/editorStore.ts:76-86`

**Evidência:**  
`openProject` chama `setOriginalImage` (reseta pipeline) e depois `setPipeline(pipeline)`, que empilha o estado vazio no histórico.

**Por que é um problema:**  
Primeiro undo após abrir projeto pode levar a um estado inesperado (imagem sem pipeline restaurada), comportamento pouco intuitivo.

**Impacto no uso:**  
Confusão no fluxo de revisão de alterações ao retomar projeto salvo.

**Severidade:** média

**Melhoria proposta:**  
Criar caminho de hidratação sem push de histórico (ex.: `loadProjectSnapshot`).

### Inconsistência de nomenclatura e linguagem na UI reduz clareza
**Onde está:**  
`components/Editor/EditorControls.tsx:11-15`, `components/Editor/EditorToolbar.tsx:203-212`, `components/Editor/EditorToolbar.tsx:256-270`, `components/Overlays/OverlaysPanel.tsx:116`

**Evidência:**  
Mistura pt-BR e inglês no mesmo contexto: `Undo/Redo`, `Download Rápido`, `Blend Mode`, `Presets/Overlays`.

**Por que é um problema:**  
Aumenta carga cognitiva e parece interface improvisada, sem sistema de conteúdo consistente.

**Impacto no uso:**  
Menor compreensão imediata dos controles, principalmente em mobile.

**Severidade:** média

**Melhoria proposta:**  
Padronizar linguagem de produto (preferencialmente pt-BR completo) e nomenclatura de ações.

### Seleção de preset em `onPointerDown` pode gerar ativação acidental durante scroll
**Onde está:**  
`components/Presets/PresetsPanel.tsx:77-85`

**Evidência:**  
Aplicação do preset ocorre em `onPointerDown`, antes do gesto ser concluído.

**Por que é um problema:**  
No mobile, gesto de rolagem pode disparar mudança sem intenção.

**Impacto no uso:**  
Trocas acidentais de preset e sensação de controle “nervoso”.

**Severidade:** média

**Melhoria proposta:**  
Trocar para `onClick` (ou lógica de intenção) e reservar `pointerdown` para preview temporário, se necessário.

### Feedback operacional de salvar/exportar é frágil e pouco durável
**Onde está:**  
`components/Editor/EditorToolbar.tsx:65-71`, `components/Editor/EditorToolbar.tsx:120-126`, `components/Editor/EditorToolbar.tsx:167-170`, `components/Editor/EditorToolbar.tsx:324`

**Evidência:**  
Existe um único `notice` textual no header, sem tipagem visual forte (sucesso/erro), sem persistência controlada e sujeito a ser sobrescrito por outra ação.

**Por que é um problema:**  
Em ações críticas (salvar/exportar), o usuário precisa confirmação inequívoca e rastreável por alguns segundos.

**Impacto no uso:**  
Incerteza sobre estado da operação, repetição de cliques e percepção de instabilidade.

**Severidade:** média

**Melhoria proposta:**  
Adotar sistema de toast/snackbar com variantes (sucesso/erro/progresso) e política de duração consistente.

## 3. prioridades reais

### corrigir primeiro
- Canvas responsivo baseado em container real.
- Crop com razão fixa realmente travada durante resize.
- Modelo de histórico sem micro-passos para sliders.
- Redução de custo do preview (evitar `toDataURL` por atualização).
- Confirmação/undo para deletar projeto.

### corrigir em seguida
- Hidratação de projeto sem poluir histórico.
- Ajustar interação de presets para evitar acionamento acidental.
- Clarificar fluxo de texto com CTA explícito.
- Padronizar nomenclatura e idioma da UI.

### pode esperar
- Refino do sistema de feedback (toasts padronizados).
- Revisões menores de copy e microinterações.

## 4. quick wins
- Trocar `onPointerDown` por `onClick` em presets (`components/Presets/PresetsPanel.tsx:80`).
- Unificar labels para pt-BR (`Undo/Redo`, `Blend Mode`, `Download`).
- Adicionar confirmação simples no `Deletar` em projetos.
- Exibir placeholder explícito no módulo Texto: “Nenhum texto adicionado ainda”.
- Melhorar mensagem de sucesso/erro com estilo visual distinto sem refatoração grande.

## 5. problemas estruturais
- Arquitetura de renderização do preview está acoplada a uma estratégia custosa (`pipeline -> canvas -> dataURL`) para interação em tempo real; isso limita escalabilidade de UX conforme novas operações entram.
- Arquitetura de histórico trata qualquer mutação como passo semântico, o que conflita com controles contínuos (sliders/drag) e compromete previsibilidade de undo/redo.
- Arquitetura de layout do canvas depende de constantes fixas, não da geometria real da viewport/container, gerando base frágil para evolução multiplataforma.
- Arquitetura de interação entre painéis e canvas ainda não está totalmente coesa (ex.: texto e crop têm “fontes de verdade” distribuídas e sinais de ativação pouco explícitos).

## 6. próximo passo recomendado
1. corrigir base do editor: canvas responsivo + crop com ratio travada.
2. atacar experiência de edição contínua: novo modelo de commit de histórico para sliders/drag.
3. otimizar preview para reduzir custo por frame e manter fluidez.
4. fechar confiança de fluxo: confirmação/undo em delete e feedback consistente para salvar/exportar.
5. padronizar linguagem/CTAs após estabilizar comportamento principal.
