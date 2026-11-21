# YouMentor — Co-piloto Pedagógico e de Conformidade para Creators (YouShop)

Protótipo desenvolvido para o desafio do **Programa de Estágio YouShop 2027**, focado em apoiar *creators* iniciantes na compreensão de regras de campanha, comissionamento, rastreamento por link/cookie e conformidade de roteiros/legendas antes da publicação.

---

## Arquitetura e Stack

- **Back-end:** Python + Flask (`app.py`)
- **Camada de Ferramentas (MCP):** `mcp_server.py` expondo ferramentas de consulta a regras da marca, comissão/link, estrutura de roteiro e avaliação de rascunhos
- **Front-end:** HTML5, CSS3 e JavaScript (`index.html`, `styles.css`, `app.js`) com identidade visual alinhada à YouShop e **Inspector MCP** em tempo real
- **Integração de IA / Resiliência:** Suporte opcional a variáveis do Azure OpenAI via `.env` com **fallback estruturado local**, permitindo testar e demonstrar o protótipo sem consumir créditos de nuvem

## Estrutura do Projeto

- `app.py` — Servidor Flask, rotas estáticas e endpoints `/api/status-mcp`, `/api/produtos`, `/api/mentor` e `/api/revisar-roteiro`
- `mcp_server.py` — Catálogo de exemplo, regras de conformidade e ferramentas MCP
- `index.html` — Interface com abas de **Mentor (Texto & Voz)** e **Revisor de Roteiro & Compliance**, além do painel lateral **Inspector MCP**
- `styles.css` — Estilos visuais da aplicação
- `app.js` — Lógica de interface, chamadas à API, síntese/reconhecimento de voz no navegador e atualização do Inspector MCP
- `requirements.txt` — Dependências Python (`flask`, `openai`, `mcp<2`, `python-dotenv`)

## Como Rodar Localmente

1. Crie e ative o ambiente virtual na pasta do projeto:
   `python -m venv .venv` e `.\.venv\Scripts\Activate.ps1`
2. Instale as dependências:
   `pip install -r requirements.txt`
3. Inicie o servidor Flask:
   `python app.py`
4. Acesse `http://127.0.0.1:5000` no navegador.

> **Observação:** O protótipo funciona localmente mesmo sem credenciais ativas do Azure OpenAI, utilizando respostas estruturadas a partir das ferramentas do servidor MCP.

## Limitações do Protótipo e Próximos Passos

- **Controle de leitura em voz alta:** adicionar botão explícito para cancelar/interromper a reprodução de áudio a qualquer momento.
- **Modo escuro / claro:** alternância de tema mantendo os padrões visuais da YouShop.
- **Experiência de voz e mídia:** conversa por áudio mais fluida e em tempo real, voz mais natural, indicador visual/barra durante a gravação do áudio do usuário e botão de anexo para imagens, textos/roteiros e vídeos.
- **Jornada do creator e FAQ em vídeo:** tela de autenticação/login prévia, regras ainda mais aderentes à operação real da YouShop e biblioteca de FAQ com vídeos explicativos reproduzíveis diretamente no chat.
- **Governança e revisão humana:** orientações automatizadas têm caráter educativo e não substituem validação jurídica, contratual ou aprovação final da marca.

---

## Autoria

Desenvolvido por **Carolina Cavallaro**.

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/carolcavallaro)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/carolinacavallaro/)
[![E-mail](https://img.shields.io/badge/E--mail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:carol.cavallaro@gmail.com)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/+5519982889298)