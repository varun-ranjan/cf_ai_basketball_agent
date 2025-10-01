# 🏀 NBA Agent

AI-powered basketball assistant built with Cloudflare Workers, Durable Objects, and Llama 3.3.

## Features

- **Live Chat**: WebSocket-based interface with typing indicators
- **AI Analysis**: Llama 3.3 for intelligent basketball insights
- **Live NBA Data**: Player stats, standings, and game scores from ESPN API
- **Current Standings**: Up-to-date conference and division standings
- **Live Games**: Today's games with live scores and status
- **Injury Reports**: Current injury status from official NBA sources
- **NBA News**: Latest news and trade rumors from ESPN
- **Persistent State**: Conversation history and user preferences

## Quick Start

```bash
# Install Wrangler CLI (recommended approach)
npx wrangler@latest --version

# Login to Cloudflare
npx wrangler@latest login

# Deploy the NBA Agent
npx wrangler@latest deploy
```

**Note**: No need to run `npm install` - the project uses npx to run wrangler directly.

## Usage

After deployment, access your agent at `https://nba-agent.your-subdomain.workers.dev`

### Sample Queries
- "What are LeBron James' current stats?"
- "Show me today's NBA games"
- "What's the latest NBA news?"
- "Who's injured in the NBA?"
- "Show me the current standings"
- "What games are live right now?"

## Architecture

- **Cloudflare Workers**: Serverless compute platform
- **Durable Objects**: Stateful micro-servers for agent persistence
- **Workers AI**: Llama 3.3 for intelligent responses
- **SQLite**: Built-in database for state management
- **WebSockets**: Real-time bidirectional communication

## Project Structure

```
src/
├── index.js              # WebSocket server & chat UI (325 lines)
├── nba-agent.js          # NBA Agent with AI integration (255 lines)
├── basketball-tools.js   # Basketball data utilities (191 lines)
└── nba-api.js            # NBA data integration (305 lines)
```

## Configuration

The `wrangler.toml` file is pre-configured with:
- Durable Objects for state management
- AI binding for Llama 3.3
- SQLite database for persistence

## Development

```bash
# Local development
npx wrangler@latest dev

# Deploy
npx wrangler@latest deploy
```

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
2. **Workers.dev Subdomain** - Set up in Cloudflare Dashboard
3. **Workers AI Access** - Enable in your Cloudflare account

## Troubleshooting

**If you get "workers.dev subdomain required":**
- Go to Cloudflare Dashboard → Workers & Pages → Workers
- Click "Set up a subdomain" under Workers.dev
- Choose a subdomain (e.g., `yourname.workers.dev`)

**If you get permission errors:**
```bash
# Try with npx instead
npx wrangler@latest deploy
```

## Requirements Met

- ✅ **LLM**: Llama 3.3 on Workers AI
- ✅ **Workflow**: Durable Objects with state management
- ✅ **User Input**: WebSocket chat interface
- ✅ **Memory**: Persistent state with analytics

Built with ❤️ using Cloudflare's platform.