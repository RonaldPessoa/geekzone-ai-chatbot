let carrinho = 0;

// Se o HTML e o servidor Flask estiverem no mesmo host/proxy, troque por "/api/cerebro".
const API_CEREBRO_URL = "http://127.0.0.1:5000/api/cerebro";

function comprar(valor, nomeProduto) {
    carrinho += valor;
    document.getElementById("valor-total").innerText = carrinho.toFixed(2);
    const aviso = `${nomeProduto} adicionado ao carrinho`;
    adicionarMensagemRobo(aviso);
    falar(aviso);
}

function alternarTema() {
    document.body.classList.toggle("light-mode");
    const botao = document.getElementById("btn-tema");
    const claro = document.body.classList.contains("light-mode");
    botao.textContent = claro ? "🌙 Mudar para Escuro" : "☀️ Mudar para Claro";
}

function alternarChat() {
    const chat = document.getElementById("chat-container");
    const aberto = getComputedStyle(chat).display !== "none";
    chat.style.display = aberto ? "none" : "flex";
    if (!aberto) document.getElementById("user-input").focus();
}

function adicionarMensagem(texto, tipo = "bot") {
    const chatMessages = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = `message ${tipo === "user" ? "user-message" : "bot-message"}`;
    div.textContent = texto;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function adicionarMensagemRobo(texto) {
    return adicionarMensagem(texto, "bot");
}

async function enviarMensagem() {
    const inputField = document.getElementById("user-input");
    const textoUsuario = inputField.value.trim();
    if (!textoUsuario) return;

    adicionarMensagem(textoUsuario, "user");
    inputField.value = "";

    const mensagemTemporaria = adicionarMensagemRobo("Consultando servidor...");

    try {
        const resposta = await fetch(API_CEREBRO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: textoUsuario })
        });

        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        mensagemTemporaria.remove();
        adicionarMensagemRobo(dados.resposta_agente);
        falar(dados.resposta_agente);

        if (dados.comando_tela === "abrir_whatsapp") {
            const numeroWhatsApp = "5512991916767";
            const msgPronta = "Vim pelo robô. Tive um problema e preciso solucioná-lo!!";
            const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(msgPronta)}`;
            setTimeout(() => window.open(linkWhatsApp, "_blank", "noopener,noreferrer"), 12000);
        }
    } catch (erro) {
        console.error("Falha ao consultar o servidor:", erro);
        mensagemTemporaria.remove();
        const errorMsg = "Erro de conexão com o servidor.";
        adicionarMensagemRobo(errorMsg);
        falar(errorMsg);
    }
}

function falar(texto) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    window.speechSynthesis.speak(fala);
}

function ouvirCliente() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        adicionarMensagemRobo("Seu navegador não oferece reconhecimento de voz neste modo.");
        return;
    }

    const reconhecimento = new SpeechRecognition();
    const botao = document.getElementById("btn-mic");
    reconhecimento.lang = "pt-BR";
    reconhecimento.interimResults = false;
    reconhecimento.maxAlternatives = 1;

    reconhecimento.onstart = () => botao.classList.add("ouvindo");
    reconhecimento.onend = () => botao.classList.remove("ouvindo");
    reconhecimento.onerror = () => botao.classList.remove("ouvindo");
    reconhecimento.onresult = (evento) => {
        document.getElementById("user-input").value = evento.results[0][0].transcript;
        enviarMensagem();
    };
    reconhecimento.start();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("user-input")?.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") enviarMensagem();
    });
});
