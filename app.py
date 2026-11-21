"""
Back-end em Flask para o protótipo YouMentor.
Carrega variáveis do .env, integra as ferramentas do servidor MCP (mcp_server.py)
e orquestra respostas com Azure OpenAI (com fallback local garantido para demonstração).
"""

import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from mcp_server import (
    CATALOGO_E_REGRAS,
    avaliar_rascunho_conteudo,
    buscar_estrutura_sucesso,
    consultar_comissao_e_link,
    consultar_regras_marca,
    listar_ferramentas_mcp,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Carrega variáveis de ambiente do arquivo .env (ex.: credenciais Azure OpenAI)
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__, static_folder=BASE_DIR)


def chamar_azure_se_configurado(prompt_sistema: str, prompt_usuario: str) -> str | None:
    """
    Chama o modelo implantado no Azure OpenAI caso as variáveis de ambiente estejam configuradas.
    Retorna None em caso de ausência de credenciais ou falha de rede/cota, ativando o fallback.
    """
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")

    if not (endpoint and api_key and deployment):
        return None

    try:
        from openai import AzureOpenAI

        cliente = AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version=api_version,
        )
        resposta = cliente.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": prompt_usuario},
            ],
            temperature=0.4,
        )
        return resposta.choices[0].message.content
    except Exception:
        return None


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/styles.css")
def servir_css():
    return send_from_directory(BASE_DIR, "styles.css")


@app.route("/app.js")
def servir_js():
    return send_from_directory(BASE_DIR, "app.js")


@app.route("/api/status-mcp", methods=["GET"])
def status_mcp():
    azure_ativo = bool(
        os.getenv("AZURE_OPENAI_ENDPOINT")
        and os.getenv("AZURE_OPENAI_API_KEY")
        and os.getenv("AZURE_OPENAI_DEPLOYMENT")
    )
    return jsonify({
        "servidor_mcp": "YouMentor-MCP-Server",
        "azure_configurado": azure_ativo,
        "ferramentas": listar_ferramentas_mcp(),
    })


@app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    produtos = [
        {
            "id": produto_id,
            "nome": dados["nome_produto"],
            "categoria": dados["categoria"],
            "comissao": dados["comissao_padrao"],
            "janela_cookie": dados["janela_cookie"],
        }
        for produto_id, dados in CATALOGO_E_REGRAS.items()
    ]
    return jsonify({"produtos": produtos})


@app.route("/api/mentor", methods=["POST"])
def mentor_chat():
    dados = request.get_json(force=True)
    mensagem = (dados.get("mensagem") or "").strip()
    produto_id = dados.get("produto_id") or "glow_vita_colageno"

    if not mensagem:
        return jsonify({"erro": "Envie uma pergunta ou mensagem para o YouMentor."}), 400

    tools_acionadas = [
        "tool_consultar_regras_marca",
        "tool_consultar_comissao_e_link",
    ]
    msg_lower = mensagem.lower()
    if any(
        palavra in msg_lower
        for palavra in ["roteiro", "vídeo", "video", "post", "dica", "sucesso", "como fazer", "gravar", "gancho"]
    ):
        tools_acionadas.append("tool_buscar_estrutura_sucesso")

    regras = consultar_regras_marca(produto_id)
    comissao = consultar_comissao_e_link(produto_id)
    dicas = buscar_estrutura_sucesso(produto_id)

    contexto_mcp = (
        f"Produto: {regras['produto']} ({regras['categoria']}). "
        f"Comissão: {comissao['comissao']}, Janela de cookie: {comissao['janela_cookie']}, "
        f"Regra de link: {comissao['regra_link']}. "
        f"Regras obrigatórias: {regras['regras_conformidade']['obrigatorio']}. "
        f"Práticas proibidas: {regras['regras_conformidade']['proibido']}. "
        f"Sugestões de sucesso: {dicas['dicas_sucesso']}."
    )

    resposta_azure = chamar_azure_se_configurado(
        prompt_sistema=(
            "Você é o YouMentor, co-piloto pedagógico e de conformidade da YouShop para creators iniciantes. "
            "Responda em português de forma clara, acolhedora e objetiva, baseando-se estritamente "
            "nos dados fornecidos pelo servidor MCP. Não invente regras nem percentuais."
        ),
        prompt_usuario=f"Pergunta do creator: {mensagem}\nDados obtidos via MCP: {contexto_mcp}",
    )

    if resposta_azure:
        resposta_texto = resposta_azure
        motor_usado = "Azure OpenAI + YouMentor MCP Server"
    else:
        resposta_texto = (
            f"Sobre o **{regras['produto']}** ({comissao['comissao']}, cookie de {comissao['janela_cookie']}):\n\n"
            f"• **Link e rastreamento:** {comissao['regra_link']}\n"
            f"• **Cuidados obrigatórios:** {'; '.join(regras['regras_conformidade']['obrigatorio'])}\n"
            f"• **Como estruturar o conteúdo:** {dicas['dicas_sucesso'][0]} Depois, {dicas['dicas_sucesso'][1].lower()}\n\n"
            f"*Orientação educativa de apoio — não substitui validação jurídica ou contratual final da marca.*"
        )
        motor_usado = "YouMentor MCP Server + Resposta Estruturada (Fallback Local)"

    return jsonify({
        "resposta": resposta_texto,
        "tools_mcp_acionadas": tools_acionadas,
        "motor": motor_usado,
    })


@app.route("/api/revisar-roteiro", methods=["POST"])
def revisar_roteiro():
    dados = request.get_json(force=True)
    roteiro = (dados.get("roteiro") or "").strip()
    produto_id = dados.get("produto_id") or "glow_vita_colageno"

    if not roteiro:
        return jsonify({"erro": "Insira um roteiro ou legenda para análise."}), 400

    tools_acionadas = [
        "tool_consultar_regras_marca",
        "tool_avaliar_rascunho_conteudo",
        "tool_buscar_estrutura_sucesso",
    ]

    diagnostico = avaliar_rascunho_conteudo(produto_id, roteiro)
    dicas = buscar_estrutura_sucesso(produto_id)
    regras = consultar_regras_marca(produto_id)

    roteiro_sugerido = (
        f"1. Gancho de rotina: {dicas['dicas_sucesso'][0]}\n"
        f"2. Demonstração prática: {dicas['dicas_sucesso'][1]}\n"
        f"3. Transparência e CTA: Inclua #publi / #parceria, lembre que {regras['regras_conformidade']['obrigatorio'][1].lower()} "
        f"e {dicas['dicas_sucesso'][2].lower()}"
    )

    limites_etica = (
        "A análise automatizada identifica padrões de risco e transparência com base nas regras cadastradas, "
        "mas não substitui a revisão final da marca nem dispensa o julgamento ético do creator."
    )

    contexto_revisor = (
        f"Produto: {regras['produto']} ({regras['categoria']}). "
        f"Rascunho enviado: {roteiro}. "
        f"Diagnóstico MCP: {diagnostico}. "
        f"Regras obrigatórias: {regras['regras_conformidade']['obrigatorio']}. "
        f"Práticas proibidas: {regras['regras_conformidade']['proibido']}. "
        f"Roteiro sugerido: {roteiro_sugerido}."
    )

    resposta_azure = chamar_azure_se_configurado(
        prompt_sistema=(
            "Você é o agente de compliance e revisão de roteiros do YouMentor (YouShop). "
            "Avalie de forma clara e acolhedora se o rascunho do creator está dentro das normas ou não, "
            "apontando alertas, pontos positivos e melhorias práticas sem inventar regras."
        ),
        prompt_usuario=f"Avalie este rascunho:\n{contexto_revisor}",
    )

    return jsonify({
        "resposta_agente": resposta_azure,
        "tools_mcp_acionadas": tools_acionadas,
        "diagnostico": diagnostico,
        "sugestoes_sucesso": dicas["dicas_sucesso"],
        "roteiro_sugerido": roteiro_sugerido,
        "limites_e_etica": limites_etica,
        "motor": (
            "Azure OpenAI + YouMentor MCP Server"
            if resposta_azure
            else "YouMentor MCP Server + Avaliação Estruturada (Fallback Local)"
        ),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)