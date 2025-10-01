import { NBAAgent } from "./nba-agent.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle WebSocket connections for real-time chat
    if (request.headers.get("Upgrade") === "websocket") {
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      const agentId = url.searchParams.get("agentId") || "default";
      const agent = env.NBAAgent.get(env.NBAAgent.idFromName(agentId));

      // Accept the WebSocket connection
      server.accept();

      // Handle WebSocket messages with enhanced error handling
      server.addEventListener("message", async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Add request metadata for analytics
          const enhancedData = {
            ...data,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get("User-Agent"),
            ip: request.headers.get("CF-Connecting-IP") || "unknown",
          };

          const response = await agent.fetch(
            new Request("http://localhost/chat", {
              method: "POST",
              body: JSON.stringify(enhancedData),
              headers: {
                "Content-Type": "application/json",
                "CF-Ray": request.headers.get("CF-Ray") || "unknown",
              },
            })
          );

          const responseData = await response.json();
          server.send(JSON.stringify(responseData));
        } catch (error) {
          console.error("WebSocket message error:", error);
          server.send(
            JSON.stringify({
              type: "response",
              content: "I'm having trouble processing your request right now. This might be due to API connectivity issues. Please try asking a simpler question or try again in a moment. I can still help with general NBA knowledge!",
              timestamp: new Date().toISOString(),
            })
          );
        }
      });

      // Handle WebSocket close
      server.addEventListener("close", () => {
        console.log("WebSocket connection closed");
      });

      // Handle WebSocket error
      server.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Handle HTTP requests
    if (url.pathname === "/chat") {
      const agentId = url.searchParams.get("agentId") || "default";
      const agent = env.NBAAgent.get(env.NBAAgent.idFromName(agentId));
      return agent.fetch(request);
    }

    // Serve the chat interface
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(
        `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NBA Agent</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .chat-container {
            height: 500px;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .message {
            margin-bottom: 15px;
            display: flex;
            align-items: flex-start;
        }
        .message.user {
            justify-content: flex-end;
        }
        .message-content {
            max-width: 70%;
            padding: 15px 20px;
            border-radius: 20px;
            word-wrap: break-word;
        }
        .message.user .message-content {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-bottom-right-radius: 5px;
        }
        .message.agent .message-content {
            background: white;
            border: 1px solid #e9ecef;
            border-bottom-left-radius: 5px;
        }
        .input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
        }
        .input-field {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid #e9ecef;
            border-radius: 25px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.3s;
        }
        .input-field:focus {
            border-color: #667eea;
        }
        .send-button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .send-button:hover {
            transform: translateY(-2px);
        }
        .send-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .typing-indicator {
            display: none;
            padding: 15px 20px;
            color: #6c757d;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏀 NBA Agent</h1>
            <p>Your AI-powered basketball assistant</p>
        </div>
        <div class="chat-container" id="chatContainer">
            <div class="message agent">
                <div class="message-content">
                    Welcome! I'm your NBA agent. I can help you with player stats, team information, game schedules, and basketball analysis. What would you like to know?
                </div>
            </div>
        </div>
        <div class="typing-indicator" id="typingIndicator">Agent is typing...</div>
        <div class="input-container">
            <input type="text" id="messageInput" class="input-field" placeholder="Ask me about NBA players, teams, or games..." />
            <button id="sendButton" class="send-button">Send</button>
        </div>
    </div>

    <script>
        class NBAChat {
            constructor() {
                this.ws = null;
                this.chatContainer = document.getElementById('chatContainer');
                this.messageInput = document.getElementById('messageInput');
                this.sendButton = document.getElementById('sendButton');
                this.typingIndicator = document.getElementById('typingIndicator');
                
                this.connect();
                this.setupEventListeners();
            }
            
            connect() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = \`\${protocol}//\${window.location.host}?agentId=default\`;
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('Connected to NBA Agent');
                };
                
                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };
                
                this.ws.onclose = () => {
                    console.log('Connection closed, attempting to reconnect...');
                    setTimeout(() => this.connect(), 3000);
                };
            }
            
            setupEventListeners() {
                this.sendButton.addEventListener('click', () => this.sendMessage());
                this.messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.sendMessage();
                    }
                });
            }
            
            sendMessage() {
                const message = this.messageInput.value.trim();
                if (!message || !this.ws) return;
                
                this.addMessage(message, 'user');
                this.messageInput.value = '';
                this.sendButton.disabled = true;
                this.showTyping();
                
                this.ws.send(JSON.stringify({
                    type: 'message',
                    content: message,
                    timestamp: new Date().toISOString()
                }));
            }
            
            handleMessage(data) {
                this.hideTyping();
                this.sendButton.disabled = false;
                
                if (data.type === 'error') {
                    this.addMessage('Sorry, I encountered an error. Please try again.', 'agent');
                } else if (data.type === 'response') {
                    this.addMessage(data.content, 'agent');
                }
            }
            
            addMessage(content, sender) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}\`;
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                contentDiv.textContent = content;
                
                messageDiv.appendChild(contentDiv);
                this.chatContainer.appendChild(messageDiv);
                this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
            }
            
            showTyping() {
                this.typingIndicator.style.display = 'block';
                this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
            }
            
            hideTyping() {
                this.typingIndicator.style.display = 'none';
            }
        }
        
        new NBAChat();
    </script>
</body>
</html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    return new Response("NBA Agent API", { status: 200 });
  },
};

export { NBAAgent };
