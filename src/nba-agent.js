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
      // Update analytics
      await this.updateAnalytics();

      // Get current state
      const currentState = await this.getState();
      const conversationHistory = currentState.conversationHistory || [];

      // Add user message to history
      conversationHistory.push({
        role: "user",
        content: message,
        timestamp: new Date().toISOString()
      });

      // Keep only last 20 messages
      if (conversationHistory.length > 20) {
        conversationHistory.splice(0, conversationHistory.length - 20);
      }

      // Analyze intent and get relevant data
      const intent = this.analyzeIntent(message);
      const contextData = await this.getContextData(message, intent);

      // Generate AI response
      const response = await this.generateResponse(message, contextData, conversationHistory);

      // Add agent response to history
      conversationHistory.push({
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString()
      });

      // Update state
      await this.setState({
        ...currentState,
        conversationHistory,
        analytics: {
          ...currentState.analytics,
          lastActive: new Date().toISOString()
        }
      });

      return {
        type: "response",
        content: response,
        timestamp: new Date().toISOString(),
        intent: intent,
        dataSource: contextData ? "real-time" : "general"
      };

    } catch (error) {
      console.error("Error processing message:", error);
      return {
        type: "error",
        message: "I'm having trouble processing your request. Please try again.",
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
      // Get relevant data based on intent
      if (intent.includes("player")) {
        const playerName = this.extractPlayerName(message);
        if (playerName) {
          return await this.basketballTools.getPlayerStats(playerName);
        }
      }
      
      if (intent.includes("team")) {
        return await this.basketballTools.getStandings();
      }
      
      if (intent.includes("game")) {
        return await this.basketballTools.getTodaysGames();
      }
      
      if (intent.includes("injury")) {
        return await this.basketballTools.getInjuryReport();
      }
      
      if (intent.includes("news")) {
        return await this.basketballTools.getNBANews();
      }

      return null;
    } catch (error) {
      console.error("Error getting context data:", error);
      return null;
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

      // Create enhanced prompt for Llama 3.3
      const prompt = `You are an expert NBA analyst and assistant with access to real-time NBA data. You have been helping users with ${analytics.totalQueries || 0} queries so far.

User Preferences: ${JSON.stringify(userPreferences)}
Context Data: ${contextData ? JSON.stringify(contextData) : 'No specific data available'}

Recent Conversation:
${conversationContext}

User Question: ${userMessage}

Please provide a helpful, accurate, and engaging response about NBA basketball. Use the context data to provide specific insights. If you don't have specific data for the question, provide general basketball knowledge or suggest what information would be helpful. Keep responses conversational, informative, and personalized based on user preferences.`;

      // Call Llama 3.3 via Workers AI
      const response = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct",
        {
          messages: [
            {
              role: "system",
              content: "You are an expert NBA analyst assistant with deep knowledge of basketball statistics, player performance, team dynamics, and league trends. Provide accurate, helpful information about NBA basketball, players, teams, and games. Use data-driven insights and maintain an engaging, conversational tone."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 750,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        }
      );

      return response.response || "I'm here to help with NBA questions! What would you like to know about basketball?";
    } catch (error) {
      console.error("Error generating response:", error);
      return "I'm here to help with NBA questions! I can provide information about players, teams, games, and statistics. What would you like to know?";
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
}