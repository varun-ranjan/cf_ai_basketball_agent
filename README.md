# 🏀 Basketball Expert Agent

A sophisticated AI-powered basketball coaching assistant with real-time streaming, persistent conversations, and comprehensive basketball knowledge.

## ✨ Features

- **Real-time Streaming**: Unlimited output with no truncation
- **Persistent Conversations**: SQLite-powered conversation history
- **Adaptive Learning**: Tracks user level and topics discussed
- **Modern UI**: Clean design with dark mode support
- **Clickable Topics**: Quick-start prompts for common questions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers AI enabled
- Wrangler CLI: `npm install -g wrangler`

### Installation

```bash
git clone <repository-url>
cd cf_ai_basketball_agent
npm install
```

### Development

```bash
npm run dev
```

**Local URL**: http://localhost:8787

### Deployment

```bash
npx wrangler deploy
```

**Live URL**: https://basketball-agent.ranjan-varun.workers.dev

## 🏗️ Architecture

- **Cloudflare Workers**: Serverless execution environment
- **Durable Objects**: Stateful coordination with SQLite database
- **Workers AI**: Llama 3.1 8B Instruct for basketball knowledge
- **Server-Sent Events**: Real-time streaming responses

## 📁 Project Structure

```
├── src/
│   └── index.ts          # Main Worker and Durable Object
├── public/
│   └── index.html         # Frontend chat interface
├── wrangler.jsonc        # Cloudflare Worker configuration
└── package.json          # Dependencies and scripts
```

## 🎯 Usage

Ask basketball-related questions like:

- "How do I improve my shooting technique?"
- "Explain the pick and roll offense"
- "What are the fundamentals of defense?"
- "Create a training program for beginners"

## 🛠️ Configuration

The agent uses `wrangler.jsonc` for configuration:

- **AI Model**: Llama 3.1 8B Instruct
- **Max Tokens**: 4096 for comprehensive responses
- **Streaming**: Native AI streaming for unlimited output
- **Database**: SQLite for persistent conversations

## 📊 Performance

- **Response Time**: < 2 seconds for initial response
- **Streaming**: Real-time token-by-token delivery
- **Reliability**: Bulletproof error handling with retries
- **Scalability**: Serverless architecture with global edge deployment

## 🔧 Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Deploy to Cloudflare Workers
npx wrangler deploy

# View logs
npx wrangler tail
```

## 🌐 URLs

- **Local Development**: http://localhost:8787
- **Production**: https://basketball-agent.ranjan-varun.workers.dev

## 📝 Technologies

- **Backend**: Cloudflare Workers, Durable Objects, SQLite
- **AI**: Workers AI (Llama 3.1 8B Instruct)
- **Frontend**: HTML, CSS, JavaScript
- **Streaming**: Server-Sent Events (SSE)
- **Language**: TypeScript

---

Built with ❤️ for basketball enthusiasts
