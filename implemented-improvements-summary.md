# implemented improvements summary

## aplicadas
- item: Canvas responsivo em vez de tamanho fixo
- origem: Improvementsv2 / Improvementsv3 / Improvementsv4
- criticidade: alta
- arquivos afetados: `components/Editor/EditorCanvasClient.tsx`, `components/Editor/EditorCanvas.tsx`
- o que foi feito: stage agora usa `ResizeObserver` + cálculo dinâmico de largura/altura por container/viewport; placeholder de loading deixou de fixar 520px.
- observação curta sobre como foi reconciliado com o estado atual: mantida arquitetura atual com Konva, sem refatorar fluxo geral.

- item: Preview sem `toDataURL` por atualização
- origem: Improvementsv2 / Improvementsv3 / Improvementsv4
- criticidade: alta
- arquivos afetados: `components/Editor/EditorCanvasClient.tsx`
- o que foi feito: preview passou a reutilizar `HTMLCanvasElement` diretamente (`applyPipelineToCanvas` -> canvas) em vez de serializar PNG/base64 por frame.
- observação curta sobre como foi reconciliado com o estado atual: solução compatível com pipeline existente, sem mudar API pública do core.

- item: Crop com aspect ratio realmente travado durante resize
- origem: Improvementsv2 / Improvementsv3 / Improvementsv4
- criticidade: alta
- arquivos afetados: `components/Editor/EditorCanvasClient.tsx`
- o que foi feito: resize dos handles agora respeita razão quando não está em `free`, com limites no bounding da imagem.
- observação curta sobre como foi reconciliado com o estado atual: preservado comportamento livre para `free`.

- item: Undo/redo sem poluição por micro-passos de slider
- origem: Improvementsv2 / Improvementsv3 / Improvementsv4
- criticidade: alta
- arquivos afetados: `components/Adjustments/AdjustmentsPanel.tsx`, `store/editor/editorStore.ts`
- o que foi feito: adicionado `setPipelinePreview` para preview transitório e commit único no fim do gesto; histórico só recebe commit.
- observação curta sobre como foi reconciliado com o estado atual: mantidos limites de histórico e API atual de undo/redo.

- item: Carregar projeto sem histórico inconsistente
- origem: Improvementsv2 / Improvementsv4
- criticidade: média
- arquivos afetados: `store/editor/editorStore.ts`, `app/projects/page.tsx`
- o que foi feito: criado `loadProjectSnapshot` para hidratar pipeline/preset sem empilhar estado vazio anterior.
- observação curta sobre como foi reconciliado com o estado atual: fluxo de abertura de projeto preservado, apenas corrigindo estado interno.

- item: Confirmação antes de deletar projeto
- origem: Improvementsv2 / Improvementsv3 / Improvementsv4
- criticidade: alta
- arquivos afetados: `app/projects/page.tsx`
- o que foi feito: incluída confirmação explícita com `window.confirm` antes da exclusão.
- observação curta sobre como foi reconciliado com o estado atual: intervenção mínima, sem introduzir novo componente de modal.

- item: Compartilhamento via Web Share API com fallback
- origem: Improvementsv3
- criticidade: crítica
- arquivos afetados: `components/Editor/EditorToolbar.tsx`
- o que foi feito: implementado botão `Compartilhar`, usando `navigator.share({ files })` quando suportado e download como fallback.
- observação curta sobre como foi reconciliado com o estado atual: reaproveitado pipeline de export já existente para gerar blob.

- item: Sharpness slider passou a produzir efeito real
- origem: Improvementsv3
- criticidade: crítica
- arquivos afetados: `core/pipeline/canvas2d.ts`
- o que foi feito: implementado sharpen por unsharp-mask simples (3x3) aplicado após draw base.
- observação curta sobre como foi reconciliado com o estado atual: mantidos demais ajustes/filtros na ordem atual da pipeline.

- item: HEIC removido enquanto não houver fallback real
- origem: Improvementsv2 / Improvementsv3
- criticidade: média
- arquivos afetados: `app/page.tsx`
- o que foi feito: removidos `image/heic,image/heif` do accept/lista e copy de suporte para evitar promessa inválida.
- observação curta sobre como foi reconciliado com o estado atual: preferido hardening seguro ao invés de integração parcial de decoder.

- item: Texto com entrada explícita (“adicionar”) e melhor previsibilidade
- origem: Improvementsv4
- criticidade: média
- arquivos afetados: `components/Text/TextPanel.tsx`
- o que foi feito: adicionado CTA `Adicionar texto`; controles ficam desabilitados sem operação ativa; removido default implícito `grain`.
- observação curta sobre como foi reconciliado com o estado atual: sem mudar modelo de operação `text` da pipeline.

- item: Texto com clamp de bounding mais seguro ao arrastar/redimensionar
- origem: Improvementsv2 / Improvementsv3
- criticidade: média
- arquivos afetados: `components/Editor/EditorCanvasClient.tsx`
- o que foi feito: clamp de posição passou a considerar largura/altura do texto em vez de apenas ponto de ancoragem.
- observação curta sobre como foi reconciliado com o estado atual: preservada interação com `Transformer` já existente.

- item: Ativação acidental de preset por `onPointerDown`
- origem: Improvementsv4
- criticidade: média
- arquivos afetados: `components/Presets/PresetsPanel.tsx`
- o que foi feito: troca para `onClick` na aplicação de preset.
- observação curta sobre como foi reconciliado com o estado atual: mantida navegação por teclado existente.

- item: Consistência de linguagem (parcial)
- origem: Improvementsv4
- criticidade: média
- arquivos afetados: `components/Editor/EditorToolbar.tsx`, `components/Editor/EditorControls.tsx`, `components/Overlays/OverlaysPanel.tsx`
- o que foi feito: `Undo/Redo` -> `Desfazer/Refazer`; `Presets/Overlays` -> `Filtros/Texturas`; `Blend Mode` -> `Modo de Mesclagem`.
- observação curta sobre como foi reconciliado com o estado atual: aplicada somente em labels de maior impacto para reduzir risco de regressão de UX.

- item: Blend modes de overlay expandidos
- origem: Improvementsv3
- criticidade: média
- arquivos afetados: `core/pipeline/types.ts`, `core/pipeline/pipeline.ts`, `components/Overlays/OverlaysPanel.tsx`
- o que foi feito: adicionados `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`.
- observação curta sobre como foi reconciliado com o estado atual: extensão compatível com `globalCompositeOperation` usado no renderer.

- item: Ícones PWA válidos para instalação
- origem: Improvementsv2 / Improvementsv3
- criticidade: alta
- arquivos afetados: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/manifest.json`
- o que foi feito: substituídos placeholders 1x1 por PNGs 192/512 e adicionado `purpose: any maskable` no manifest.
- observação curta sobre como foi reconciliado com o estado atual: mantida estrutura de PWA já existente.

## não aplicadas
- item: Pinch-to-zoom e pan multitouch no canvas
- origem: Improvementsv2 / Improvementsv3
- criticidade: alta
- motivo: exige desenho/revisão mais ampla da interação entre Stage transformado, crop, texto e “antes/depois”, com risco de regressão em fluxos já estabilizados.
- status no código atual:
  - parcialmente implementado

- item: Cache de contexto/programa WebGL para LUT por sessão
- origem: Improvementsv2 / Improvementsv3
- criticidade: alta
- motivo: implementação atual de LUT foi preservada para evitar mudança estrutural ampla no renderer neste ciclo; prioridade foi eliminar custo maior de `toDataURL` no preview.
- status no código atual:
  - parcialmente implementado

- item: Substituir matriz 3x3 por LUT 3D real (HaldCLUT/.cube)
- origem: Improvementsv3
- criticidade: alta
- motivo: mudança arquitetural grande (pipeline, assets, shader e catálogo). fora do escopo de execução segura incremental deste ciclo.
- status no código atual:
  - dependência ausente

- item: Grain com seed determinística para eliminar variação entre renders
- origem: Improvementsv3
- criticidade: média
- motivo: o algoritmo foi recentemente evoluído (v5/v5.1), então evitar nova troca profunda sem rodada dedicada de calibração visual/performance.
- status no código atual:
  - em conflito com melhoria recente

- item: Sistema de toast unificado para feedback de sucesso/erro
- origem: Improvementsv3 / Improvementsv4
- criticidade: média
- motivo: já houve melhorias pontuais de feedback; componente global de toast foi adiado para não abrir refactor transversal neste pacote.
- status no código atual:
  - parcialmente implementado

- item: Lazy/skeleton para thumbnails de presets
- origem: Improvementsv3
- criticidade: média
- motivo: adiado para não misturar otimização de render com as mudanças funcionais principais feitas no editor.
- status no código atual:
  - parcialmente implementado

- item: Busca/filtro na galeria de projetos
- origem: Improvementsv3
- criticidade: média
- motivo: sem evidência de bloqueio com limite atual (20 itens) neste ciclo; priorizados itens de risco funcional direto.
- status no código atual:
  - desatualizado pelo código atual

- item: Error boundary global
- origem: Improvementsv3
- criticidade: média
- motivo: adiado por ser mudança transversal de app shell, sem bug funcional imediato relacionado nas rotas atuais.
- status no código atual:
  - dependência ausente

## conflitos reconciliados
- item: “Expandir LUTs/presets e identidade visual”
- documentos envolvidos: Improvementsv3 vs estado atual (mudanças recentes v5/v5.1/v5.2)
- decisão tomada: preservar a base recente e não reverter/reimplementar do zero.
- justificativa: código atual já superou o diagnóstico antigo de “apenas 1 LUT/presets genéricos”; mudanças novas foram mantidas como fonte da verdade.

- item: “Aplicar todas recomendações de performance do renderer de uma vez”
- documentos envolvidos: Improvementsv2 / Improvementsv3 / Improvementsv4
- decisão tomada: aplicar primeiro a remoção de `toDataURL` no preview e adiar cache WebGL avançado.
- justificativa: maior ganho imediato com menor risco de regressão estrutural.

- item: “HEIC suportado” vs “HEIC sem fallback”
- documentos envolvidos: Improvementsv2 / Improvementsv3
- decisão tomada: remover suporte declarado temporariamente.
- justificativa: evitar promessa falsa ao usuário até existir fallback real de decodificação.

- item: “Flow de texto padrão” vs “CTA explícito”
- documentos envolvidos: Improvementsv2 / Improvementsv4
- decisão tomada: manter pipeline de texto atual, mas exigir ação explícita para criar texto.
- justificativa: resolve ambiguidade sem alterar arquitetura de operação.

## observações
- riscos:
  - Ajuste de sharpness por CPU pode ficar pesado em imagens grandes; precisa validação prática em aparelhos mid-range.
  - Crop com ratio travado foi revisado, mas merece testes manuais em todas as razões com rotações/flips combinados.
- pontos que merecem validação manual:
  - Compartilhar em iOS Safari e Android Chrome (com e sem suporte a `navigator.canShare({ files })`).
  - Fluxo de undo após ajustes longos de slider (garantir 1 commit por gesto).
  - Layout do canvas em iPhone SE, iPhone Pro Max e desktop largo.
- áreas impactadas pelo commit mais recente:
  - Presets/LUTs/Grain foram preservados como baseline e não foram revertidos.
  - Decisões recentes de assinatura visual (v5.x) foram tratadas como prioridade sobre diagnósticos antigos conflitantes.
- próximos passos possíveis:
  - Implementar pinch-zoom/pan com gestão de transform do stage.
  - Introduzir cache WebGL persistente no módulo de LUT.
  - Evoluir feedback para toast global reutilizável.
