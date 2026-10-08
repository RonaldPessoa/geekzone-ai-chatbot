let carrinho = 0;
let brindeAdicionado = false;

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
    document.body.classList.remove("sith-mode", "matrix-mode");
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
        if (dados.comando_tela === "ativar_lado_sombrio") {
            document.body.classList.remove("light-mode", "matrix-mode");
            document.body.classList.add("sith-mode");
            const botaoTema = document.getElementById("btn-tema");
            if (botaoTema) botaoTema.textContent = "☀️ Voltar ao tema normal";
        }

        if (dados.comando_tela === "desativar_lado_sombrio") {
            document.body.classList.remove("sith-mode", "light-mode", "matrix-mode");
            const botaoTema = document.getElementById("btn-tema");
            if (botaoTema) botaoTema.textContent = "☀️ Mudar para Claro";
        }

        if (dados.comando_tela === "modo_matrix") {
            document.body.classList.remove("sith-mode", "light-mode", "matrix-mode");
            document.body.classList.add("matrix-mode");
        }

        if (dados.comando_tela === "dar_brinde") {
            if (!brindeAdicionado) {
                brindeAdicionado = true;
                comprar(0, 'Chaveiro Geek de Brinde');
                const itens = document.getElementById('itens-carrinho');
                if (itens) {
                    const item = document.createElement('li');
                    item.textContent = 'Chaveiro Geek de Brinde — R$ 0,00';
                    itens.appendChild(item);
                }
            } else {
                adicionarMensagemRobo('Seu brinde já está no carrinho!');
            }
        }

        if (dados.comando_tela === "autodestruicao") {
            iniciarContagemAutodestruicao();
            return;
        }

        // Troca o modo ANTES de sintetizar a resposta.
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

// A Web Speech API não expõe o áudio sintetizado ao Web Audio API.
// Portanto o efeito grátis é uma camada sonora sintetizada em paralelo,
// e não um filtro aplicado diretamente à voz do navegador.
let audioSithContext = null;
let efeitoSithAtual = null;
let tokenFala = 0;

function pararEfeitoSith() {
    if (!efeitoSithAtual) return;
    try { efeitoSithAtual.stop(); } catch (erro) { console.debug(erro); }
    efeitoSithAtual = null;
}

function iniciarEfeitoSith() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
        audioSithContext ||= new AudioContextClass();
        const ctx = audioSithContext;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const oscilador = ctx.createOscillator();
        const modulador = ctx.createOscillator();
        const ganhoModulador = ctx.createGain();
        const filtro = ctx.createBiquadFilter();
        const volume = ctx.createGain();
        oscilador.type = "sawtooth";
        oscilador.frequency.value = 57;
        modulador.type = "sine";
        modulador.frequency.value = 5.5;
        ganhoModulador.gain.value = 9;
        filtro.type = "lowpass";
        filtro.frequency.value = 170;
        volume.gain.value = 0.0001;
        modulador.connect(ganhoModulador);
        ganhoModulador.connect(oscilador.frequency);
        oscilador.connect(filtro);
        filtro.connect(volume);
        volume.connect(ctx.destination);
        const agora = ctx.currentTime;
        volume.gain.setTargetAtTime(0.055, agora, 0.15);
        oscilador.start();
        modulador.start();
        let parado = false;
        efeitoSithAtual = { stop() {
            if (parado) return;
            parado = true;
            volume.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
            try { oscilador.stop(ctx.currentTime + 0.65); modulador.stop(ctx.currentTime + 0.65); } catch (_) {}
            setTimeout(() => {
                try { oscilador.disconnect(); modulador.disconnect(); ganhoModulador.disconnect(); filtro.disconnect(); volume.disconnect(); } catch (_) {}
            }, 800);
        }};
    } catch (erro) {
        console.warn("Efeito Sith indisponível:", erro);
    }
}

let audioIAAtual = null;
let urlAudioIAAtual = null;
function limparAudioIA() {
    if (audioIAAtual) { audioIAAtual.pause(); audioIAAtual.src = ''; audioIAAtual = null; }
    if (urlAudioIAAtual) { URL.revokeObjectURL(urlAudioIAAtual); urlAudioIAAtual = null; }
}

async function falar(texto) {
    const token = ++tokenFala;
    window.speechSynthesis?.cancel();
    pararEfeitoSith();
    limparAudioIA();
    const modoSith = document.body.classList.contains('sith-mode');
    const limpo = String(texto || '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\uFE0F/g, '').trim();
    if (!limpo) return;
    // Voz IA primeiro. Se indisponivel, fallback gratuito do navegador.
    try {
        const r = await fetch('http://127.0.0.1:5000/api/voz', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({texto: limpo, modo: modoSith ? 'sith' : 'normal'})
        });
        if (!r.ok) throw new Error(`TTS HTTP ${r.status}`);
        const blob = await r.blob();
        if (token !== tokenFala) return;
        urlAudioIAAtual = URL.createObjectURL(blob);
        audioIAAtual = new Audio(urlAudioIAAtual);
        audioIAAtual.onended = () => { if (token === tokenFala) limparAudioIA(); };
        await audioIAAtual.play();
        return;
    } catch (e) {
        if (token !== tokenFala) return;
        console.warn('Voz IA indisponivel; usando voz local:', e);
        limparAudioIA();
    }
    if (!('speechSynthesis' in window)) return;
    const fala = new SpeechSynthesisUtterance(limpo);
    const vozes = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('pt'));
    fala.voice = vozes.find(v => /antonio|antônio|daniel|francisco/i.test(v.name)) || vozes[0] || null;
    fala.lang = 'pt-BR';
    fala.rate = modoSith ? 0.7 : 1.04;
    fala.pitch = modoSith ? 0.3 : 1.12;
    fala.onstart = () => { if (modoSith && token === tokenFala) iniciarEfeitoSith(); };
    const fim = () => { if (token === tokenFala) pararEfeitoSith(); };
    fala.onend = fim; fala.onerror = fim;
    speechSynthesis.speak(fala);
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

// A frase é narrada pela ElevenLabs; depois a explosão acontece.
// A ação é apenas visual e sonora. Não remove arquivos ou dados.
let autodestruicaoIniciada = false;
function iniciarContagemAutodestruicao() {
    if (autodestruicaoIniciada) return;
    autodestruicaoIniciada = true;
    const frase = 'Alerta! Protocolo de autodestruição ativado. A loja GeekZone será destruída! Em 3...2...1...';
    adicionarMensagemRobo(frase);
    falar(frase); // ElevenLabs, com fallback para a voz do navegador.
    setTimeout(executarAutodestruicao, 11000);
}

// Ruído de impacto com decaimento: som sintetizado no próprio navegador.
// Não depende de arquivos externos nem consome créditos de voz.
function tocarExplosao() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const duracao = 6.5;
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duracao), ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
            const t = i / ctx.sampleRate;
            const envelope = Math.pow(Math.max(0, 1 - t / duracao), 1.5);
            samples[i] = (Math.random() * 2 - 1) * envelope;
        }
        const fonte = ctx.createBufferSource();
        fonte.buffer = buffer;
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.setValueAtTime(2600, ctx.currentTime);
        filtro.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + duracao);
        const ganho = ctx.createGain();
        ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
        ganho.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 0.025);
        ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);
        fonte.connect(filtro);
        filtro.connect(ganho);
        ganho.connect(ctx.destination);
        fonte.onended = () => ctx.close().catch(() => {});
        fonte.start();
    } catch (erro) {
        console.warn('Não foi possível reproduzir a explosão:', erro);
    }
}

// Efeito demonstrativo: substitui apenas o DOM; recarregar restaura a loja.

function executarAutodestruicao() {
    ++tokenFala;
    window.speechSynthesis?.cancel();
    pararEfeitoSith();
    limparAudioIA();

    // Inicia o som da explosão
    tocarExplosao();

    // Ativa o modo explosão
    document.body.className = 'explosion-mode';
    document.body.replaceChildren();

    // Cena ocupando a tela inteira
    const cena = document.createElement('main');
    cena.className = 'explosion-scene';

    // GIF de fundo
    const gif = document.createElement('img');
    gif.src = 'img/explosao.gif';
    gif.alt = 'Explosão animada';
    gif.className = 'explosion-background';

    // Conteúdo sobreposto ao GIF
    const conteudo = document.createElement('div');
    conteudo.className = 'explosion-overlay';

    const texto = document.createElement('h1');
    texto.textContent = '💥 GEEKZONE DESTRUÍDA! 💥';

    const subtitulo = document.createElement('p');
    subtitulo.textContent = 'PROTOCOLO KABOOM-42 EXECUTADO';

    const reiniciar = document.createElement('button');
    reiniciar.textContent = 'REINICIAR GEEKZONE';
    reiniciar.addEventListener('click', () => location.reload());

    conteudo.append(texto, subtitulo, reiniciar);
    cena.append(gif, conteudo);

    document.body.appendChild(cena);
}
