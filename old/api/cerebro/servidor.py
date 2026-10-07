from flask import Flask, request, jsonify
from flask_cors import CORS
from thefuzz import process

app = Flask(__name__)
CORS(app) # Permite a comunicação com o Live Server do Front-end

# ==========================================
# 1. O TERMÔMETRO DE SENTIMENTOS (LÉXICO)
# ==========================================
palavras_positivas = ["bom", "otimo", "legal", "amei", "incrivel", "adoro", "perfeito", "top"]
palavras_negativas = ["caro", "horrivel", "ruim", "odeio", "lixo", "demora", "pessimo", "raiva", "absurdo", "procon"]

def analisar_humor(frase):
    pontuacao = 0
    palavras = frase.lower().split()
    for palavra in palavras:
        if palavra in palavras_positivas:
            pontuacao += 1
        elif palavra in palavras_negativas:
            pontuacao -= 1
    return pontuacao

# ==========================================
# 2. O BANCO DE TREINAMENTO DO ROBÔ
# ==========================================
matriz_de_intencoes = {
    "saudacao": {
        "treino": ["ola", "oi", "bom dia", "boa tarde", "fala ai"],
        "resposta_feliz": "Saudações, Mestre Jedi! Bem-vindo à GeekZone.",
        "resposta_neutra": "Saudações! Bem-vindo à GeekZone. Como posso ajudar?"
    },
    "frete": {
        "treino": ["qual o valor do frete", "entrega em casa", "frete gratis", "demora a entrega"],
        "resposta_feliz": "Nossa nave entrega com frete grátis acima de R$ 200! 🚀",
        "resposta_neutra": "Nossa entrega tem frete grátis nas compras acima de R$ 200,00."
    },
    "catalogo": {
        "treino": ["o que voces vendem", "tem sabre de luz", "produtos"],
        "resposta_feliz": "Temos itens incríveis! Sabres de Luz (R$250) e Action Figures do Goku (R$150).",
        "resposta_neutra": "Temos Sabres de Luz (R$250) e Action Figures do Goku (R$150)."
    },
 "desconto": {
        "treino": ["tem desconto", "tem promocao", "tem cupom", "posso ter desconto"],
        "resposta_feliz": "Claro, Mestre Jedi! Temos descontos especiais em produtos selecionados! 🤑",
        "resposta_neutra": "Temos descontos especiais em produtos selecionados."
    }
}

# ==========================================
# 3. A ROTA DA API (O PORTAL)
# ==========================================
@app.route('/api/cerebro', methods=['POST'])
def cerebro_do_robo():
    pacote = request.json
    mensagem_cliente = pacote.get('mensagem', '').lower()

    if not mensagem_cliente:
        return jsonify({"resposta_agente": "Não consegui ouvir. Pode repetir?", "comando_tela": "nenhuma"})

    # A. O TheFuzz descobre a intenção matemática
    melhor_intencao = "saudacao"
    maior_pontuacao = 0
    for intencao, dados in matriz_de_intencoes.items():
        match, pontuacao = process.extractOne(mensagem_cliente, dados["treino"])
        if pontuacao > maior_pontuacao:
            maior_pontuacao = pontuacao
            melhor_intencao = intencao

    # B. O Analisador de Sentimentos mede a frustração
    polaridade = analisar_humor(mensagem_cliente)

    # C. A Tomada de Decisão do Servidor
    acao_especial = "nenhuma" # Por padrão, a interface não muda

    if polaridade < 0:
        # Se detectou palavras negativas, ACIONA A CRISE independentemente do que o cliente perguntou
        resposta_final = "Sinto muito que esteja frustrado. Estou transferindo você para o WhatsApp do nosso mestre humano para resolvermos isso agora."
        acao_especial = "abrir_whatsapp" # ORDEM SECRETA ENVIADA PARA O FRONT-END!
    elif maior_pontuacao >= 60:
        # Respostas normais se a confiança for alta e não houver crise
        if polaridade > 0:
            resposta_final = matriz_de_intencoes[melhor_intencao]["resposta_feliz"]
        else:
            resposta_final = matriz_de_intencoes[melhor_intencao]["resposta_neutra"]
    else:
        # Fallback (Não entendeu)
        resposta_final = "Bip bop! Meus circuitos só entendem sobre cultura Geek. Pode perguntar de outra forma?"

    # D. O Servidor devolve o pacote JSON com a resposta E o comando
    return jsonify({
        "resposta_agente": resposta_final,
        "comando_tela": acao_especial
    })

if __name__ == '__main__':
    print("🤖 SERVIDOR PYTHON ATIVADO NA PORTA 5000!")
    app.run(port=5000, debug=True)
    