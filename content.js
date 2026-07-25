// === 1. VARIÁVEIS GLOBAIS ===
let startX, startY, isDrawing = false;
let overlay, selectionBox;

// === 2. INTERFACE VISUAL (A Camada e o Quadrado) ===
function iniciarSelecao() {
  // Impede que o usuário ative duas vezes seguidas
  if (document.getElementById('ocr-overlay')) return;

  // Camada que escurece a tela e congela a interação com o site
  overlay = document.createElement('div');
  overlay.id = 'ocr-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(0, 0, 0, 0.3); cursor: crosshair; z-index: 999999;
  `;

  // Quadrado pontilhado da seleção
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = `
    position: absolute; border: 2px dashed #fff; 
    background-color: rgba(255, 255, 255, 0.1); 
    pointer-events: none; display: none;
  `;

  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);

  // Escuta os movimentos do mouse
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
}

// === 3. LÓGICA DE CLICAR E ARRASTAR ===
function onMouseDown(e) {
  isDrawing = true;
  startX = e.clientX;
  startY = e.clientY;
  selectionBox.style.display = 'block';
  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
}

function onMouseMove(e) {
  if (!isDrawing) return;

  // Permite desenhar o quadrado em qualquer direção (cima, baixo, esquerda, direita)
  const currentX = e.clientX;
  const currentY = e.clientY;
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  
  selectionBox.style.left = Math.min(currentX, startX) + 'px';
  selectionBox.style.top = Math.min(currentY, startY) + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

function onMouseUp() {
  isDrawing = false;
  const rect = selectionBox.getBoundingClientRect(); // Salva as coordenadas do quadrado
  overlay.remove(); // Remove o fundo escuro imediatamente
  document.body.style.cursor = 'wait'; // Mostra que está processando

  // Dá 50 milissegundos para o navegador limpar a tela antes do print
  setTimeout(() => capturarERecortar(rect), 50);
}

// === 4. RECORTAR A IMAGEM NO CANVAS ===
function capturarERecortar(rect) {
  // Pede o print para o background.js
  chrome.runtime.sendMessage({ action: 'tirarPrint' }, (response) => {
    if (!response || !response.imageUri) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = rect.width;
      canvas.height = rect.height;

      // devicePixelRatio corrige o recorte em telas Retina (MacBooks) ou se houver zoom no navegador
      const dpr = window.devicePixelRatio || 1;

      // Desenha apenas a parte selecionada dentro do nosso canvas
      ctx.drawImage(
        img,
        rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr, // Corte original
        0, 0, rect.width, rect.height // Destino no canvas
      );

      // Converte o recorte para Base64 e manda para a sua função da API
      const imagemRecortada = canvas.toDataURL('image/png');
      enviarParaOCR(imagemRecortada); 
    };
    img.src = response.imageUri;
  });
}

function enviarParaOCR(base64Image) {
  chrome.runtime.sendMessage({ action: 'processarImagem', imageData: base64Image }, (response) => {
    document.body.style.cursor = 'default';
    if (response && response.success) {
      copiarSilenciosamente(response.texto);
    } else {
      console.error("Erro na leitura:", response?.erro);
    }
  });
}

function copiarSilenciosamente(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    console.log("Texto extraído e copiado:", texto);
  });
}

// === 5. O GATILHO INICIAL ===
// Escuta o comando do background para iniciar a seleção na tela
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'iniciarSelecao') iniciarSelecao();
});