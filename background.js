chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processarImagem') {
    const apiKey = 'APIKEY'; 
    const base64Image = request.imageData; // A imagem que será enviada da tela

    const formData = new FormData();
    formData.append('base64Image', base64Image);
    formData.append('apikey', apiKey);
    formData.append('language', 'por'); // 'por' para português, 'eng' para inglês

    // Comunicação invisível com a API da OCR.Space
    fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.IsErroredOnProcessing) {
        sendResponse({ success: false, erro: data.ErrorMessage });
      } else {
        // Extrai apenas o texto puro da resposta da API
        const textoLido = data.ParsedResults[0].ParsedText;
        sendResponse({ success: true, texto: textoLido });
      }
    })
    .catch(erro => sendResponse({ success: false, erro: erro.toString() }));

    return true; // Exigido pelo Chrome para indicar que a resposta (sendResponse) é assíncrona
  }
});

// 1. Quando você clicar no ícone da extensão, ele manda o content.js desenhar a tela
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'iniciarSelecao' });
});

// 2. Adicione esta condição DENTRO do seu chrome.runtime.onMessage.addListener existente
if (request.action === 'tirarPrint') {
  // Tira print da aba visível atual
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (imageUri) => {
    sendResponse({ imageUri: imageUri });
  });
  return true; // Mantém a conexão aberta para o sendResponse assíncrono
}