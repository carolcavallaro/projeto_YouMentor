"""
Servidor MCP (Model Context Protocol) do YouMentor para o ecossistema YouShop.
Expõe ferramentas (Tools) que o agente consulta para orientar creators iniciantes,
validar regras de divulgação por marca/produto e sugerir estruturas de conteúdo.
"""

from typing import Any, Dict, List
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("YouMentor-MCP-Server")

CATALOGO_E_REGRAS: Dict[str, Dict[str, Any]] = {
    "glow_vita_colageno": {
        "nome_produto": "GlowVita Colágeno Hidrolisado + Vitamina C",
        "categoria": "Saúde & Bem-Estar / Suplementos",
        "comissao_padrao": "25% por venda aprovada",
        "janela_cookie": "30 dias",
        "link_regra": (
            "Utilizar exclusivamente o link rastreável da afiliação ou cupom oficial "
            "vinculado à campanha para garantir o rastreamento e o repasse correto."
        ),
        "regras_conformidade": {
            "obrigatorio": [
                "Sinalizar de forma clara que há parceria/comissionamento na divulgação (#publi ou #parceria).",
                "Informar que os resultados variam de pessoa para pessoa e que suplementos não substituem orientação profissional."
            ],
            "proibido": [
                "Prometer cura de doenças, emagrecimento garantido ou resultados imediatos/milagrosos.",
                "Fazer afirmações médicas absolutas ou enganosas sobre eficácia."
            ]
        },
        "dicas_sucesso": [
            "Abra com um gancho de rotina real (ex.: como encaixar o preparo no dia a dia sem complicação).",
            "Mostre o produto em uso de forma natural e explique por que ele faz sentido no seu contexto.",
            "Finalize com um CTA claro e direto para o link/cupom, sem promessas exageradas."
        ]
    },
    "study_pro_planner": {
        "nome_produto": "StudyPro Método & Planner Digital",
        "categoria": "Educação & Produtividade",
        "comissao_padrao": "40% por venda aprovada",
        "janela_cookie": "60 dias",
        "link_regra": (
            "Usar o link rastreável exclusivo do creator com identificação de campanha "
            "para que a conversão seja atribuída corretamente."
        ),
        "regras_conformidade": {
            "obrigatorio": [
                "Manter transparência sobre a divulgação/parceria comercial quando houver recomendação.",
                "Deixar claro que a evolução nos estudos depende da constância e aplicação do método."
            ],
            "proibido": [
                "Prometer aprovação garantida em provas/concursos ou resultado automático sem dedicação.",
                "Usar provas sociais fabricadas ou promessas de 'fórmula mágica'."
            ]
        },
        "dicas_sucesso": [
            "Comece conectando com uma dor real de quem estuda (ex.: desorganização ou dificuldade de revisão).",
            "Faça uma demonstração curta e prática da organização no planner ou fluxo de estudo.",
            "Convide o público a tirar dúvidas nos comentários e acessar o material pelo link."
        ]
    }
}

TERMOS_RISCO: List[str] = [
    "cura",
    "emagrece rápido",
    "emagrecimento garantido",
    "milagre",
    "milagroso",
    "aprovado garantido",
    "100% garantido",
    "resultado imediato",
    "sem esforço"
]

MARCAS_TRANSPARENCIA: List[str] = [
    "#publi",
    "#parceria",
    "parceria",
    "publi",
    "comissão",
    "comissao",
    "afiliado",
    "link na bio"
]


def _resolver_produto(produto_id: str) -> Dict[str, Any]:
    return CATALOGO_E_REGRAS.get(produto_id, CATALOGO_E_REGRAS["glow_vita_colageno"])


def consultar_regras_marca(produto_id: str) -> Dict[str, Any]:
    item = _resolver_produto(produto_id)
    return {
        "produto": item["nome_produto"],
        "categoria": item["categoria"],
        "regras_conformidade": item["regras_conformidade"]
    }


def consultar_comissao_e_link(produto_id: str) -> Dict[str, Any]:
    item = _resolver_produto(produto_id)
    return {
        "produto": item["nome_produto"],
        "comissao": item["comissao_padrao"],
        "janela_cookie": item["janela_cookie"],
        "regra_link": item["link_regra"]
    }


def buscar_estrutura_sucesso(produto_id: str) -> Dict[str, Any]:
    item = _resolver_produto(produto_id)
    return {
        "produto": item["nome_produto"],
        "categoria": item["categoria"],
        "dicas_sucesso": item["dicas_sucesso"]
    }


def avaliar_rascunho_conteudo(produto_id: str, roteiro: str) -> Dict[str, Any]:
    regras = consultar_regras_marca(produto_id)["regras_conformidade"]
    texto_lower = roteiro.lower()

    alertas: List[str] = []
    for termo in TERMOS_RISCO:
        if termo in texto_lower:
            alertas.append(f"Termo ou promessa sensível identificado: '{termo}'.")

    tem_transparencia = any(marcador in texto_lower for marcador in MARCAS_TRANSPARENCIA)
    if not tem_transparencia:
        alertas.append(
            "Sinalização de parceria/divulgação ausente (#publi, #parceria ou menção clara de afiliação)."
        )

    if not alertas:
        status = "APROVADO PARA REVISÃO FINAL"
    elif len(alertas) == 1:
        status = "AJUSTES RECOMENDADOS"
    else:
        status = "ATENÇÃO: REVISÃO NECESSÁRIA ANTES DE PUBLICAR"

    return {
        "status": status,
        "alertas": alertas,
        "regras_obrigatorias": regras["obrigatorio"],
        "praticas_evitar": regras["proibido"]
    }


def listar_ferramentas_mcp() -> List[Dict[str, str]]:
    return [
        {
            "nome": "tool_consultar_regras_marca",
            "descricao": "Consulta regras obrigatórias e restrições de divulgação do produto/marca."
        },
        {
            "nome": "tool_consultar_comissao_e_link",
            "descricao": "Consulta percentual de comissão, janela de cookie e regra de link rastreável."
        },
        {
            "nome": "tool_buscar_estrutura_sucesso",
            "descricao": "Busca boas práticas e estrutura de roteiro para o nicho do produto."
        },
        {
            "nome": "tool_avaliar_rascunho_conteudo",
            "descricao": "Analisa um rascunho de roteiro/legenda em busca de alertas e pontos de ajuste."
        }
    ]


@mcp.tool()
def tool_consultar_regras_marca(produto_id: str) -> Dict[str, Any]:
    # Consulta regras de conformidade e restrições da marca para o produto.
    return consultar_regras_marca(produto_id)


@mcp.tool()
def tool_consultar_comissao_e_link(produto_id: str) -> Dict[str, Any]:
    # Consulta comissão, janela de cookie e regras de link rastreável.
    return consultar_comissao_e_link(produto_id)


@mcp.tool()
def tool_buscar_estrutura_sucesso(produto_id: str) -> Dict[str, Any]:
    # Busca sugestões de roteiro e boas práticas para o nicho do produto.
    return buscar_estrutura_sucesso(produto_id)


@mcp.tool()
def tool_avaliar_rascunho_conteudo(produto_id: str, roteiro: str) -> Dict[str, Any]:
    # Avalia um roteiro ou legenda contra regras de divulgação e transparência.
    return avaliar_rascunho_conteudo(produto_id, roteiro)


if __name__ == "__main__":
    mcp.run()