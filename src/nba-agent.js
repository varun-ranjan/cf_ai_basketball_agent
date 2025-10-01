import { BasketballTools } from "./basketball-tools.js";

export class NBAAgent {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.basketballTools = new BasketballTools(env);
    this.initializeState();
  }

  async getState() {
    try {
      const state = await this.state.storage.get("agentState");
      return state || null;
    } catch (error) {
      console.error("Error getting state:", error);
      return null;
    }
  }

  async setState(newState) {
    try {
      await this.state.storage.put("agentState", newState);
    } catch (error) {
      console.error("Error setting state:", error);
    }
  }

  async initializeState() {
    const currentState = await this.getState();
    if (!currentState) {
      await this.setState({
        conversationHistory: [],
        userPreferences: {},
        analytics: {
          totalQueries: 0,
          queryTypes: {},
          lastActive: new Date().toISOString()
        }
      });
    }
  }

  async processMessage(message, metadata = {}) {
    try {
      console.log("Processing message:", message);
      
      // Update analytics
      await this.updateAnalytics();
      
      // Get current state for conversation history
      const currentState = await this.getState();
      const conversationHistory = currentState.conversationHistory || [];
      
      // Add user message to conversation history
      conversationHistory.push({
        role: "user",
        content: message,
        timestamp: new Date().toISOString()
      });
      
      // Analyze user intent
      const intent = this.analyzeIntent(message);
      console.log("Detected intent:", intent);
      
      // Get relevant context data based on intent
      const contextData = await this.getContextData(message, intent);
      console.log("Context data:", contextData);
      
      // Generate AI response using Llama 3.3
      const aiResponse = await this.generateResponse(message, contextData, conversationHistory);
      
      // Add agent response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString()
      });
      
      // Update state with new conversation history
      await this.setState({
        ...currentState,
        conversationHistory: conversationHistory.slice(-50) // Keep last 50 messages
      });
      
      return {
        type: "response",
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error processing message:", error);
      
      // Fallback response with helpful context
      const lowerMessage = message.toLowerCase();
      let fallbackResponse = "I'm here to help with NBA questions! I can discuss players, teams, games, and basketball in general. What would you like to know?";
      
      if (lowerMessage.includes("player") || lowerMessage.includes("stats")) {
        fallbackResponse = "I'd love to help with player statistics! While I'm having trouble accessing live data right now, I can tell you about NBA players in general. Try asking about specific players like LeBron James, Stephen Curry, or Giannis Antetokounmpo.";
      } else if (lowerMessage.includes("game") || lowerMessage.includes("schedule")) {
        fallbackResponse = "I can help with game information! While I'm having trouble accessing live schedules right now, I can discuss NBA games and matchups in general. What specific games or teams are you interested in?";
      } else if (lowerMessage.includes("team") || lowerMessage.includes("standing")) {
        fallbackResponse = "I'd be happy to discuss NBA teams and standings! While I'm having trouble accessing live data right now, I can talk about teams, their performance, and league standings in general.";
      }
      
      return {
        type: "response",
        content: fallbackResponse,
        timestamp: new Date().toISOString()
      };
    }
  }

  analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    const intents = [];

    if (lowerMessage.includes("player") || lowerMessage.includes("stats") || lowerMessage.includes("statistics")) {
      intents.push("player");
    }
    if (lowerMessage.includes("team") || lowerMessage.includes("standings") || lowerMessage.includes("rank")) {
      intents.push("team");
    }
    if (lowerMessage.includes("game") || lowerMessage.includes("schedule") || lowerMessage.includes("matchup")) {
      intents.push("game");
    }
    if (lowerMessage.includes("injury") || lowerMessage.includes("hurt") || lowerMessage.includes("injured")) {
      intents.push("injury");
    }
    if (lowerMessage.includes("news") || lowerMessage.includes("rumor") || lowerMessage.includes("trade")) {
      intents.push("news");
    }

    return intents.length > 0 ? intents : ["general"];
  }

  async getContextData(message, intent) {
    try {
      const contextData = {
        timestamp: new Date().toISOString(),
        intent: intent,
        data: {}
      };

      // Get relevant data based on intent
      if (intent.includes("player")) {
        const playerName = this.extractPlayerName(message);
        if (playerName) {
          contextData.data.playerStats = await this.basketballTools.getPlayerStats(playerName);
        } else {
          // If no specific player mentioned, get general player info
          contextData.data.generalPlayers = {
            message: "Popular NBA players include LeBron James, Stephen Curry, Giannis Antetokounmpo, Luka Doncic, and Jayson Tatum"
          };
        }
      }
      
      if (intent.includes("team")) {
        contextData.data.standings = await this.basketballTools.getStandings();
        contextData.data.todaysGames = await this.basketballTools.getTodaysGames();
      }
      
      if (intent.includes("game")) {
        contextData.data.todaysGames = await this.basketballTools.getTodaysGames();
        contextData.data.upcomingGames = await this.basketballTools.getUpcomingGames();
        contextData.data.liveScores = await this.basketballTools.getLiveScores();
      }
      
      if (intent.includes("injury")) {
        contextData.data.injuryReport = await this.basketballTools.getInjuryReport();
      }
      
      if (intent.includes("news")) {
        contextData.data.news = await this.basketballTools.getNBANews();
      }

      // Always include current standings and today's games for general context
      if (!contextData.data.standings) {
        contextData.data.standings = await this.basketballTools.getStandings();
      }
      if (!contextData.data.todaysGames) {
        contextData.data.todaysGames = await this.basketballTools.getTodaysGames();
      }

      return contextData;
    } catch (error) {
      console.error("Error getting context data:", error);
      // Return a simple context object to help the AI provide a response
      return {
        timestamp: new Date().toISOString(),
        intent: intent,
        error: "API unavailable",
        message: "I'm having trouble accessing live NBA data, but I can still help with general basketball knowledge.",
        data: {}
      };
    }
  }

  extractPlayerName(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("lebron") || lowerMessage.includes("james")) {
      return "lebron james";
    } else if (lowerMessage.includes("curry") || lowerMessage.includes("stephen")) {
      return "stephen curry";
    } else if (lowerMessage.includes("giannis") || lowerMessage.includes("antetokounmpo")) {
      return "giannis antetokounmpo";
    } else if (lowerMessage.includes("luka") || lowerMessage.includes("doncic")) {
      return "luka doncic";
    } else if (lowerMessage.includes("jayson") || lowerMessage.includes("tatum")) {
      return "jayson tatum";
    }
    
    return null;
  }

  async generateResponse(userMessage, contextData, conversationHistory) {
    try {
      // Prepare conversation context
      const conversationContext = conversationHistory
        .slice(-10) // Last 10 messages for context
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      // Get current state for additional context
      const currentState = await this.getState();
      const userPreferences = currentState.userPreferences || {};
      const analytics = currentState.analytics || {};

      // Format context data for better AI understanding
      let contextSummary = "No specific data available";
      if (contextData && contextData.data) {
        const data = contextData.data;
        const summaries = [];
        
        if (data.playerStats) {
          summaries.push(`Player Stats: ${data.playerStats.name} (${data.playerStats.team}) - ${data.playerStats.stats.points} PPG, ${data.playerStats.stats.rebounds} RPG, ${data.playerStats.stats.assists} APG`);
        }
        
        if (data.standings && (data.standings.eastern || data.standings.western)) {
          const topTeams = [];
          if (data.standings.eastern && data.standings.eastern.length > 0) {
            topTeams.push(`Eastern: ${data.standings.eastern[0].team} (${data.standings.eastern[0].record})`);
          }
          if (data.standings.western && data.standings.western.length > 0) {
            topTeams.push(`Western: ${data.standings.western[0].team} (${data.standings.western[0].record})`);
          }
          if (topTeams.length > 0) {
            summaries.push(`Current Standings: ${topTeams.join(', ')}`);
          }
        }
        
        if (data.todaysGames && data.todaysGames.length > 0) {
          const games = data.todaysGames.slice(0, 3).map(game => `${game.away} @ ${game.home} (${game.status})`).join(', ');
          summaries.push(`Today's Games: ${games}`);
        }
        
        if (data.injuryReport && data.injuryReport.injuries && data.injuryReport.injuries.length > 0) {
          const injuries = data.injuryReport.injuries.slice(0, 3).map(injury => `${injury.player} (${injury.team}) - ${injury.injury}`).join(', ');
          summaries.push(`Recent Injuries: ${injuries}`);
        }
        
        if (data.news && data.news.length > 0) {
          const news = data.news.slice(0, 2).map(article => article.title).join(', ');
          summaries.push(`Latest News: ${news}`);
        }
        
        contextSummary = summaries.length > 0 ? summaries.join(' | ') : "General NBA information available";
      }

      // Create enhanced prompt for Llama 3.3
      const prompt = `You are an expert NBA analyst and assistant. You have been helping users with ${analytics.totalQueries || 0} queries so far.

User Preferences: ${JSON.stringify(userPreferences)}
Current NBA Data: ${contextSummary}

Recent Conversation:
${conversationContext}

User Question: ${userMessage}

Please provide a helpful, accurate, and engaging response about NBA basketball. Use the current NBA data to provide specific insights and up-to-date information. If you have live data, reference it directly. If you don't have specific data for the question, provide general basketball knowledge or suggest what information would be helpful. Keep responses conversational, informative, and personalized based on user preferences.`;

      // Call Llama 3.3 via Workers AI
      const response = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct",
        {
          messages: [
            {
              role: "system",
              content: "You are an expert NBA analyst assistant with deep knowledge of basketball statistics, player performance, team dynamics, and league trends. Provide accurate, helpful information about NBA basketball, players, teams, and games. Use data-driven insights and maintain an engaging, conversational tone. Always reference specific data when available."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        }
      );

      return response.response || "I'm here to help with NBA questions! What would you like to know about basketball?";
    } catch (error) {
      console.error("Error generating response:", error);
      
      // Provide a more helpful fallback response based on the user's question
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes("player") || lowerMessage.includes("stats")) {
        return "I'd love to help with player statistics! While I'm having trouble accessing live data right now, I can tell you about NBA players in general. Try asking about specific players like LeBron James, Stephen Curry, or Giannis Antetokounmpo.";
      } else if (lowerMessage.includes("game") || lowerMessage.includes("schedule")) {
        return "I can help with game information! While I'm having trouble accessing live schedules right now, I can discuss NBA games and matchups in general. What specific games or teams are you interested in?";
      } else if (lowerMessage.includes("team") || lowerMessage.includes("standing")) {
        return "I'd be happy to discuss NBA teams and standings! While I'm having trouble accessing live data right now, I can talk about teams, their performance, and league standings in general.";
      } else {
        return "I'm here to help with NBA questions! I can provide information about players, teams, games, and statistics. What would you like to know about basketball?";
      }
    }
  }

  async updateAnalytics() {
    try {
      const currentState = await this.getState();
      const analytics = currentState.analytics || {
        totalQueries: 0,
        queryTypes: {},
        lastActive: new Date().toISOString()
      };

      analytics.totalQueries += 1;
      analytics.lastActive = new Date().toISOString();

      await this.setState({
        ...currentState,
        analytics
      });
    } catch (error) {
      console.error("Error updating analytics:", error);
    }
  }

  // Handle HTTP requests (required for Durable Objects)
  async fetch(request) {
    try {
      const url = new URL(request.url);
      
      if (url.pathname === "/chat" && request.method === "POST") {
        const body = await request.json();
        const message = body.content || body.message || "";
        const metadata = {
          timestamp: body.timestamp,
          userAgent: body.userAgent,
          ip: body.ip,
          cfRay: body.CF-Ray || request.headers.get("CF-Ray")
        };

        // Update analytics
        await this.updateAnalytics();

        // Process the message
        const response = await this.processMessage(message, metadata);
        
        return new Response(JSON.stringify(response), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Default response for other requests
      return new Response(JSON.stringify({
        type: "response",
        content: "NBA Agent is running! Use the chat interface to interact with me.",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error in fetch:", error);
      return new Response(JSON.stringify({
        type: "error",
        content: "I'm here to help with NBA questions! I can discuss players, teams, games, and basketball in general. What would you like to know?",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}