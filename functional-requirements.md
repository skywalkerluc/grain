# Requisitos Funcionais — Photo Editor App (MVP)

## RF-01 · Upload de Imagem

- O usuário pode selecionar uma imagem da galeria do dispositivo via input nativo
- O usuário pode arrastar e soltar uma imagem na área do editor (desktop)
- Formatos aceitos: JPG, PNG, WebP, HEIC (com fallback para HEIC)
- Tamanho máximo: 20 MB
- A imagem é carregada inteiramente no cliente, sem envio a servidor

---

## RF-02 · Canvas de Edição

- A imagem é exibida em um canvas interativo centralizado na viewport
- O canvas mantém proporção original da imagem
- O canvas suporta pinch-to-zoom e pan em dispositivos touch
- O estado da edição é não-destrutivo: a imagem original nunca é alterada em memória
- O histórico de undo/redo suporta no mínimo 20 passos

---

## RF-03 · Ajustes Básicos

Controles deslizantes com range definido para cada parâmetro:

| Ajuste              | Range       |
| ------------------- | ----------- |
| Brilho              | -100 a +100 |
| Contraste           | -100 a +100 |
| Saturação           | -100 a +100 |
| Temperatura         | -100 a +100 |
| Nitidez             | 0 a +100    |
| Vinheta             | 0 a +100    |
| Fade (desbotamento) | 0 a +100    |
| Grão                | 0 a +100    |

---

## RF-04 · Presets

- O app oferece no mínimo 12 presets fixos organizados em categorias (ex: Vintage, Clean, Dark, Film)
- Cada preset é uma combinação pré-definida de ajustes e/ou LUT
- O usuário visualiza thumbnails dos presets com preview em tempo real ao tocar
- O preset selecionado pode ser combinado com ajustes manuais adicionais
- O usuário pode resetar para "sem preset" a qualquer momento

---

## RF-05 · Crop e Transformações

- Crop livre com handles de arrasto
- Crop por proporções fixas: 1:1, 4:5, 9:16, 16:9, 3:4
- Rotação em 90° (horário e anti-horário)
- Flip horizontal e vertical

---

## RF-06 · Overlays e Texturas

- Biblioteca com no mínimo 8 overlays fixos (grão de filme, luz vazada, textura, etc.)
- Controle de opacidade do overlay via slider
- Modo de mesclagem: Normal, Multiply, Screen, Overlay

---

## RF-07 · Texto

- Adicionar texto livre sobre a imagem
- Controle de fonte (mínimo 3 opções no MVP)
- Controle de cor, tamanho e alinhamento
- Drag para reposicionar o texto no canvas
- Pinch para redimensionar o texto

---

## RF-08 · Antes / Depois

- Botão de pressão longa exibe a imagem original sem edições
- Ao soltar, retorna ao estado editado

---

## RF-09 · Projetos Salvos

- O usuário pode salvar o estado atual de edição como projeto
- Projetos são persistidos localmente via IndexedDB
- O usuário pode listar, abrir e deletar projetos salvos
- Limite de 20 projetos no MVP (com aviso ao atingir o limite)

---

## RF-10 · Export

- Export da imagem final em JPG (qualidade configurável: 80%, 90%, 100%) ou PNG
- Dimensões de export: original ou redimensionada para 1080px no maior lado
- Export é feito inteiramente no cliente via canvas `toBlob`

---

## RF-11 · Compartilhamento

- Botão "Compartilhar" usa Web Share API Level 2 (compartilhamento de arquivo)
- Fallback para dispositivos sem suporte: download direto do arquivo
- O fluxo de compartilhar deve ser atingível em no máximo 2 toques após a edição

---

## RF-12 · Offline

- O app funciona completamente offline após o primeiro carregamento
- Assets estáticos (overlays, fontes, LUTs) são cacheados pelo Service Worker
- Nenhuma funcionalidade central exige conexão com internet
