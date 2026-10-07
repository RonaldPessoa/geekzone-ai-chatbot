let carrinho = 0;
function comprar(valor, nomeProduto){
    carrinho += valor;
    document.getElementById("valor-total").innerText = carrinho.toFixed(2);
    const falaAviso =`${nomeProduto} adicionado ao carrinho`;
    adicionarMensagemRobo(falaAviso);
    Float32Array(falaAviso);
}   

function adicionarMensagemRobo(texto){
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.innerHTML += `<div>Bot ${$texto}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// conexão robo x servidor.py

async function enviarMensagem() {
    const inputField =document.getElementById("user-input")
    const textoUsuario = inputField.valor.trim();
    if(!textoUsuario) return;

    const chatMessages =document.getElementById(chatMessages);
    chatMessages.innerHTML += `<div>Bot ${$textoUsuario}</div>`;
    inputField.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const idTemp = "msg-" +Date.now();
    chatMessages.innerHTML += `<div>Consultando Servidor</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try{
        const resposta = await fetch("localhost/api/cerebro");  // ou http://127.0.0.1:5000/api/cerebro
            method: "POST",
            headers: ({"Content-Type": "application/json"});
            body: JSON.stringify({mensagem: textoUsuario});

        const dados = await resposta.json();
        document.getElementById(idTemp).remove();
        adicionarMensagemRobo(dados.resposta_agente);
        falar(dados.resposta_agente);   //onde robo fala

        if(dados.comando_tela ==="abrir_chamado"){
            const numeroWhatsApp = "+5512991916767"{
            const msgPronta = "Vim pelo robô. Tive um problema e preciso solucioná-lo!!" 
            const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(msgPronta)}´;
            setTimeout(() => window.open(linkWhatsApp, "_blank"), 3000);


        }
    
    }catch (erro){
        document.getElementById(idTemp).remove();
        const errorMsg = "Erro de conexão";
        adicionarMensagemRobo(errorMsg);
        falar(errorMsg);
    
    
    }

}