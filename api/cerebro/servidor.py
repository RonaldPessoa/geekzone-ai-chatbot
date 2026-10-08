
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from thefuzz import process
import re
import unicodedata
import os
import urllib.request
import urllib.error
import json
import logging

app = Flask(__name__)
CORS(app)

# ==========================================
# 1. NORMALIZACAO E SENTIMENTOS
# ==========================================

palavras_positivas = [
    "bom", "otimo", "legal", "amei",
    "incrivel", "adoro", "perfeito", "top"
]

palavras_negativas = [
    "caro", "horrivel", "ruim", "odeio",
    "lixo", "demora", "pessimo", "raiva",
    "absurdo", "procon", "reclamacao",
    "reclamar", "frustrado", "irritado",
    "bravo", "cancelar"
]

correcoes_voz = {
    "aiva": "raiva",
    "raiba": "raiva",
    "pro com": "procon",
    "procom": "procon",
}


def normalizar_texto(texto):
    texto = str(texto or "").lower().strip()

    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(
        c for c in texto
        if unicodedata.category(c) != "Mn"
    )

    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()

    for variante, correta in sorted(
        correcoes_voz.items(),
        key=lambda x: len(x[0]),
        reverse=True
    ):
        texto = re.sub(
            rf"\b{re.escape(variante)}\b",
            correta,
            texto
        )

    return texto


def detectar_lado_sombrio(frase):
    texto = normalizar_texto(frase)

    gatilhos = (
        r"\bdarth\s+vader\b",
        r"\bsith\b",
        r"\blado\s+(?:negro|sombrio)\b"
    )

    return any(
        re.search(gatilho, texto)
        for gatilho in gatilhos
    )


def detectar_lado_da_luz(frase):
    texto = normalizar_texto(frase)

    gatilhos = (
        r"\bjedi\b",
        r"\blado\s+da\s+luz\b",
        r"\bvolt(?:ar|e)\s+ao\s+normal\b",
        r"\b(?:modo|tema)\s+normal\b",
        r"\bque\s+a\s+forca\s+esteja\s+com\s+voce\b"
    )

    return any(
        re.search(gatilho, texto)
        for gatilho in gatilhos
    )


def analisar_humor(frase):
    palavras = normalizar_texto(frase).split()
    pontuacao = 0

    for palavra in palavras:
        if palavra in palavras_positivas:
            pontuacao += 1
        elif palavra in palavras_negativas:
            pontuacao -= 1

    return pontuacao


# ==========================================
# 2. BANCO DE TREINAMENTO
# ==========================================

matriz_de_intencoes = {
    "saudacao": {
        "treino": [
            "ola", "oi", "bom dia",
            "boa tarde", "fala ai"
        ],
        "resposta_feliz":
            "Saudações, Mestre Jedi! Bem-vindo à GeekZone.",
        "resposta_neutra":
            "Saudações! Bem-vindo à GeekZone. Como posso ajudar?"
    },

    "frete": {
        "treino": [
            "qual o valor do frete",
            "entrega em casa",
            "frete gratis",
            "demora a entrega"
        ],
        "resposta_feliz":
            "Nossa nave entrega com frete grátis acima de R$ 200! 🚀",
        "resposta_neutra":
            "Nossa entrega tem frete grátis nas compras acima de R$ 200,00."
    },

    "catalogo": {
        "treino": [
            "o que voces vendem",
            "tem sabre de luz",
            "produtos"
        ],
        "resposta_feliz":
            "Temos itens incríveis! Sabres de Luz (R$250) e Action Figures do Goku (R$150).",
        "resposta_neutra":
            "Temos Sabres de Luz (R$250) e Action Figures do Goku (R$150)."
    },

    "desconto": {
        "treino": [
            "tem desconto",
            "tem promocao",
            "tem cupom",
            "posso ter desconto"
        ],
        "resposta_feliz":
            "Claro, Mestre Jedi! Temos descontos especiais em produtos selecionados! 🤑",
        "resposta_neutra":
            "Temos descontos especiais em produtos selecionados."
    }
}


# ==========================================
# 3. API DO CHATBOT
# ==========================================

@app.route("/api/cerebro", methods=["POST"])
def cerebro_do_robo():
    pacote = request.get_json(silent=True) or {}

    mensagem_original = pacote.get("mensagem", "")
    mensagem_cliente = normalizar_texto(mensagem_original)

    if not mensagem_cliente:
        return jsonify({
            "resposta_agente": "Não consegui ouvir. Pode repetir?",
            "comando_tela": "nenhuma"
        })

    # Comandos especiais: correspondencia por palavra ou expressao completa.
    if mensagem_cliente == "kaboom 42":
        return jsonify({"resposta_agente": "Protocolo de autodestruicao iniciado!", "comando_tela": "autodestruicao"})

    if re.search(r"\b(?:neo|matrix|morpheus)\b", mensagem_cliente):
        return jsonify({"resposta_agente": "Bem-vindo a Matrix. Siga o coelho branco.", "comando_tela": "modo_matrix"})

    if (re.search(r"\bbrindes?\b", mensagem_cliente)
            and re.search(r"\b(?:dao|da|ganho|ganhar|tem|oferecem|recebo|algum|gratis)\b", mensagem_cliente)):
        return jsonify({"resposta_agente": "Sim! Um Chaveiro Geek de Brinde foi adicionado ao seu carrinho por R$ 0,00.", "comando_tela": "dar_brinde"})

    # Easter Egg - Lado da Luz
    if detectar_lado_da_luz(mensagem_cliente):
        return jsonify({
            "resposta_agente":
                "A Força voltou ao equilíbrio! Bem-vindo ao Lado da Luz! 🔵",
            "comando_tela": "desativar_lado_sombrio"
        })

    # Easter Egg - Lado Sombrio
    if detectar_lado_sombrio(mensagem_cliente):
        return jsonify({
            "resposta_agente":
                "O Lado Sombrio despertou... A GeekZone agora pertence aos Sith! 🔴",
            "comando_tela": "ativar_lado_sombrio"
        })

    melhor_intencao = "saudacao"
    maior_pontuacao = 0

    for intencao, dados in matriz_de_intencoes.items():
        resultado = process.extractOne(
            mensagem_cliente,
            dados["treino"]
        )

        if resultado:
            _, pontuacao = resultado

            if pontuacao > maior_pontuacao:
                maior_pontuacao = pontuacao
                melhor_intencao = intencao

    polaridade = analisar_humor(mensagem_cliente)
    acao_especial = "nenhuma"

    if polaridade < 0:
        resposta_final = (
            "Sinto muito que esteja frustrado. "
            "Estou transferindo você para o WhatsApp "
            "do nosso mestre humano para resolvermos isso agora."
        )
        acao_especial = "abrir_whatsapp"

    elif maior_pontuacao >= 60:
        chave_resposta = (
            "resposta_feliz"
            if polaridade > 0
            else "resposta_neutra"
        )

        resposta_final = matriz_de_intencoes[
            melhor_intencao
        ][chave_resposta]

    else:
        resposta_final = (
            "Bip bop! Meus circuitos só entendem "
            "sobre cultura Geek. Pode perguntar de outra forma?"
        )

    return jsonify({
        "resposta_agente": resposta_final,
        "comando_tela": acao_especial
    })


# ==========================================
# 4. ELEVENLABS - VOZ IA
# ==========================================

@app.route("/api/voz", methods=["POST"])
def gerar_voz():
    dados = request.get_json(silent=True) or {}

    texto = str(dados.get("texto", ""))[:1000].strip()
    modo = "sith" if dados.get("modo") == "sith" else "normal"

    if not texto:
        return jsonify({"erro": "Texto vazio"}), 400

    chave = os.environ.get(
        "ELEVENLABS_API_KEY", ""
    ).strip()

    nome_variavel_voz = (
        "ELEVENLABS_VOICE_SITH"
        if modo == "sith"
        else "ELEVENLABS_VOICE_NORMAL"
    )

    voz = os.environ.get(
        nome_variavel_voz, ""
    ).strip()

    if not chave or not voz:
        app.logger.warning(
            "ElevenLabs nao configurada. Modo: %s",
            modo
        )

        return jsonify({
            "erro": "Voz IA nao configurada"
        }), 503

    # Remove emojis da fala, preservando o texto do chat.
    texto = re.sub(
        r"[\U0001F000-\U0010FFFF\u2600-\u27BF]",
        "",
        texto
    ).strip()

    if not texto:
        return jsonify({
            "erro": "Texto sem conteudo falavel"
        }), 400

    configuracao_voz = {
        "stability": 0.65 if modo == "sith" else 0.45,
        "similarity_boost": 0.8,
        "style": 0.45 if modo == "sith" else 0.1,
        "use_speaker_boost": True
    }

    corpo = json.dumps({
        "text": texto,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": configuracao_voz
    }).encode("utf-8")

    url = (
        "https://api.elevenlabs.io/v1/text-to-speech/"
        + voz
    )

    requisicao = urllib.request.Request(
        url,
        data=corpo,
        method="POST",
        headers={
            "xi-api-key": chave,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
    )

    try:
        with urllib.request.urlopen(
            requisicao,
            timeout=25
        ) as resposta:

            audio = resposta.read(5_000_001)

            if len(audio) > 5_000_000:
                return jsonify({
                    "erro": "Audio acima do limite"
                }), 502

            if not audio:
                return jsonify({
                    "erro": "Audio vazio"
                }), 502

            return Response(
                audio,
                mimetype="audio/mpeg",
                headers={
                    "Cache-Control": "no-store"
                }
            )

    except urllib.error.HTTPError as erro:
        codigo_http = erro.code

        try:
            conteudo_erro = erro.read().decode(
                "utf-8",
                errors="replace"
            )
        except Exception:
            conteudo_erro = "Resposta de erro indisponivel"

        # Evita registrar a chave por acidente.
        conteudo_erro = conteudo_erro.replace(
            chave, "[CHAVE_OCULTA]"
        )

        app.logger.warning(
            "ElevenLabs HTTP %s | Modo: %s | Detalhes: %s",
            codigo_http,
            modo,
            conteudo_erro[:1500]
        )

        if codigo_http == 402:
            mensagem = (
                "ElevenLabs recusou a geracao por "
                "restricao de pagamento, creditos ou plano."
            )

        elif codigo_http == 401:
            mensagem = (
                "ElevenLabs recusou a autenticacao. "
                "Verifique a API Key."
            )

        elif codigo_http == 403:
            mensagem = (
                "ElevenLabs recusou o acesso. "
                "Verifique as permissoes da chave ou da voz."
            )

        elif codigo_http == 429:
            mensagem = (
                "Limite de requisicoes ou de uso "
                "da ElevenLabs atingido."
            )

        else:
            mensagem = (
                "Falha na geracao de voz pela ElevenLabs."
            )

        return jsonify({
            "erro": mensagem,
            "status": codigo_http
        }), 502

    except (
        urllib.error.URLError,
        TimeoutError
    ) as erro:

        app.logger.warning(
            "ElevenLabs indisponivel: %s",
            erro
        )

        return jsonify({
            "erro": "Provedor de voz indisponivel"
        }), 502

    except Exception:
        app.logger.exception(
            "Erro inesperado na geracao de voz"
        )

        return jsonify({
            "erro": "Erro interno na geracao de voz"
        }), 500


# ==========================================
# 5. INICIALIZACAO
# ==========================================

if __name__ == "__main__":
    print("🤖 SERVIDOR PYTHON ATIVADO NA PORTA 5000!")
    app.run(port=5000, debug=True)
