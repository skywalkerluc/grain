# improvementsv2

Revisão geral do projeto `grain` com foco em experiência de usuário, robustez e aderência prática aos requisitos. Sem mudanças de código nesta etapa.

## Resumo Executivo

- A base está funcional e consistente para MVP.
- Há pontos fortes: arquitetura `core/` separada, operações serializáveis, PWA/offline, testes passando.
- Os principais gargalos atuais são de UX mobile e performance do preview em tempo real.
- Existem alguns gaps de requisito importantes (especialmente interação de canvas e crop com razão fixa durante edição).

## Achados Prioritários

| Severidade | Área | Problema | Evidência | Impacto | Recomendação |
|---|---|---|---|---|---|
| Alta | UX/Compatibilidade | Canvas com tamanho fixo (`390x520`) em vez de responsivo ao viewport | `components/Editor/EditorCanvasClient.tsx:23-24` | Em telas maiores/smaller, desperdício de espaço e composição visual inconsistente (RNF-02) | Medir container real (`ResizeObserver`) e calcular stage dinamicamente |
| Alta | RF-02 | Falta pinch-to-zoom e pan no editor | `components/Editor/EditorCanvasClient.tsx` (não há handlers de zoom/pan; apenas `touch-pan-y`) | Requisito funcional não atendido; sensação de editor limitado | Implementar transform da stage (scale + position) com gesto multitouch e limites |
| Alta | RF-05 | Razões fixas de crop não são preservadas durante o drag dos handles | `components/Editor/EditorCanvasClient.tsx:181-220` | Usuário seleciona `1:1`, `4:5` etc., mas perde a razão ao redimensionar | No modo ratio fixa, recalcular largura/altura acopladas pela razão |
| Alta | Performance | Preview gera `toDataURL` em cada atualização (muito custoso) | `components/Editor/EditorCanvasClient.tsx:113` | Uso alto de CPU/memória, travamentos em aparelhos mid-range (RNF-01) | Evitar encode base64 a cada frame; usar canvas persistente + `ImageBitmap`/OffscreenCanvas |
| Alta | Performance | Pipeline de LUT/WebGL recompila shaders e contexto por chamada | `core/luts/renderer.ts:109-217` | Overhead elevado para preview contínuo | Reusar contexto/programa/texturas com cache por sessão/editor |
| Alta | UX/Undo | Sliders criam muitos snapshots no histórico (16ms debounce), degradando undo | `components/Adjustments/AdjustmentsPanel.tsx:31,52-62` + `store/editor/editorStore.ts:76-86` | Undo pouco útil (volta micro-passos) e histórico “poluído” | Separar preview transitório de commit final (`onPointerUp`) para histórico |
| Alta | PWA UX | Ícones de app são arquivos 1x1 (placeholder) | `public/icons/icon-192.png`, `public/icons/icon-512.png` (ambos 1x1) | Instalação com ícone ruim/inválido em iOS/Android | Gerar ícones reais 192/512 com brand consistente |
| Média | RF-01 | HEIC aceito no input, mas sem fallback de decodificação explícito | `app/page.tsx:9,23-25,84` | Em browsers sem suporte real a HEIC, upload falha na prática | Implementar fallback (transcode local via WASM/lib) ou mensagem clara |
| Média | UX/Texto | Alinhamento de texto é configurável, mas bounding/âncora não está bem definido na layer interativa | `components/Editor/EditorCanvasClient.tsx:265-274` | Comportamento visual do alinhamento pode parecer inconsistente ao arrastar | Definir largura de caixa de texto, anchor e régua de alinhamento |
| Média | UX/Texto | Texto pode sair parcialmente da área visível sem guard-rails de box completo | `components/Editor/EditorCanvasClient.tsx:277-307` | Usuário “perde” texto fora da imagem e tem dificuldade de recuperar | Clampar por caixa do texto (não só ponto x/y) + botão “centralizar texto” |
| Média | UX/Projetos | Deletar projeto sem confirmação | `app/projects/page.tsx:145-151` | Exclusão acidental | Confirm dialog/snackbar com undo curto |
| Média | UX/Projetos | Ao abrir projeto, histórico começa com estado anterior vazio (undo imediato inesperado) | `app/projects/page.tsx:83-85` + `store/editor/editorStore.ts:76-86` | Primeiro undo pode gerar comportamento confuso | Criar `loadProjectSnapshot` no store (set sem push em history) |
| Média | DX/Execução | `npm start` quebra com `output: 'export'` | `package.json:8` + `next.config.mjs:41` | Fricção para rodar produção local (já ocorreu) | Trocar script para servir `out` (ex: `serve out`) ou documentar no README |
| Baixa | UX | Mensagens de sucesso/erro no toolbar são efêmeras e sem padrão de feedback | `components/Editor/EditorToolbar.tsx:68,120,167,324` | Comunicação pouco previsível | Padronizar toast/snackbar com timeout e severidade |
| Baixa | Performance | Geração de thumbnails de presets processa todos de uma vez no main thread | `core/presets/thumbnails.ts:32-37` + `components/Presets/PresetsPanel.tsx:28-38` | Pico de CPU ao abrir painel Presets | Processar lazy/por viewport, ou em worker |
| Baixa | Consistência visual | Botões e densidade de informação no toolbar ficam carregados em telas pequenas | `components/Editor/EditorToolbar.tsx:216-239` | Menor legibilidade/ergonomia com uma mão (RNF-04) | Priorizar CTA principal e mover ações secundárias para menu sheet |

## Pontos Positivos

- Boa separação de responsabilidades entre UI e processamento (`core/`).
- Pipeline serializável permite evolução (projetos, export, eventual sync futuro).
- Testes unitários para pipeline/presets/luts/overlays já ajudam a evitar regressão.
- Fluxo offline-first e uso de IndexedDB coerentes com o objetivo do produto.

## Sugestão de Ordem de Melhoria (v2)

1. **Responsividade e interação de canvas**: zoom/pan + stage dinâmico + crop com ratio fixa real.
2. **Performance do preview**: remover `toDataURL` por frame, cachear WebGL resources, melhorar histórico de ajustes.
3. **UX de projetos**: confirmação de delete, load sem poluir undo, feedback melhor.
4. **Qualidade de instalação PWA**: ícones reais + revisão rápida de experiência de add-to-home.
5. **Hardening de formatos**: fallback HEIC e mensagens específicas por browser.

## Observação Final

As RFs principais do MVP estão em boa direção, mas os pontos acima explicam a percepção de “experiência ainda não muito boa”.
O maior retorno de qualidade virá de: **(a)** interação de canvas realmente mobile-native e **(b)** performance de preview/undo sob uso contínuo.
