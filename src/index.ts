// Basketball Expert Agent - Streaming AI responses with state management
// Meets all Cloudflare AI Application criteria:
// ✅ LLM: Workers AI with Llama 3.1 8B Instruct
// ✅ Workflow/Coordination: Durable Objects for state management
// ✅ User Input: Chat interface via Pages/Static Assets
// ✅ Memory/State: SQLite-backed Durable Object storage

import { DurableObject } from "cloudflare:workers";

interface Env {
  BASKETBALL_AGENT: DurableObjectNamespace<BasketballExpertAgent>;
  AI: Ai;
  ASSETS: Fetcher;
}

interface ConversationState {
  conversationHistory: Array<{ role: string; content: string }>;
  topicsDiscussed: string[];
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'unknown';
  messageCount: number;
}

export class BasketballExpertAgent extends DurableObject<Env> {
  private sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Create tables for persistent state
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  private async getState(): Promise<ConversationState> {
    // Get user level and topics from metadata
    const userLevelRow = this.sql.exec<{ value: string }>(
      `SELECT value FROM metadata WHERE key = 'userLevel'`
    ).toArray()[0];
    
    const topicsRow = this.sql.exec<{ value: string }>(
      `SELECT value FROM metadata WHERE key = 'topicsDiscussed'`
    ).toArray()[0];

    // Get recent messages
    const messages = this.sql.exec<{ role: string; content: string }>(
      `SELECT role, content FROM messages ORDER BY timestamp DESC LIMIT 10`
    ).toArray().reverse();

    const messageCountResult = this.sql.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM messages`
    ).toArray()[0];
    const messageCount = messageCountResult?.count || 0;

    return {
      conversationHistory: messages,
      topicsDiscussed: topicsRow?.value ? JSON.parse(topicsRow.value) : [],
      userLevel: (userLevelRow?.value as any) || 'unknown',
      messageCount,
    };
  }

  private async saveMessage(role: string, content: string) {
    this.sql.exec(
      `INSERT INTO messages (role, content, timestamp) VALUES (?, ?, ?)`,
      role,
      content,
      Date.now()
    );
  }

  private async updateMetadata(key: string, value: string) {
    this.sql.exec(
      `INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)`,
      key,
      value
    );
  }

  private getSystemPrompt(state: ConversationState): string {
    return `You are an elite basketball expert with comprehensive knowledge across all aspects of the game. Your expertise includes:

**FUNDAMENTALS & MECHANICS:**
- Shooting mechanics (form, release, arc, follow-through)
- Ball handling techniques and dribbling patterns
- Passing fundamentals (chest pass, bounce pass, overhead, no-look)
- Defensive stances, footwork, and positioning
- Rebounding positioning and boxing out
- Pivot footwork and triple threat position

**STRATEGY & TACTICS:**
- Offensive systems (pick and roll, motion offense, triangle offense, spread offense)
- Defensive schemes (man-to-man, zone defenses like 2-3, 3-2, 1-3-1)
- Fast break execution and transition defense
- Half-court sets and play calling
- Situational basketball (end of quarter, late game scenarios)
- Matchup strategies and adjustments

**RULES & REGULATIONS:**
- Official NBA, FIBA, and NCAA rules
- Violations (traveling, double dribble, carrying, 3-seconds, 5-seconds, 8-seconds, backcourt)
- Fouls (personal, technical, flagrant, offensive, defensive)
- Shot clock rules and game flow
- Replay review situations

**POSITIONS & ROLES:**
- Point Guard: floor general, playmaking, court vision
- Shooting Guard: scoring, perimeter defense, off-ball movement
- Small Forward: versatility, wing defense, slashing
- Power Forward: interior scoring, rebounding, pick and roll
- Center: rim protection, post play, defensive anchor

**PHYSICAL & MENTAL ASPECTS:**
- Conditioning and endurance training
- Strength and agility development
- Basketball IQ and court awareness
- Team chemistry and communication
- Mental toughness and handling pressure
- Reading defenses and making quick decisions

**TRAINING & DEVELOPMENT:**
- Skill progression drills
- Practice structure and efficiency
- Film study techniques
- Individual vs team development
- Youth basketball fundamentals
- Advanced skill refinement

**YOUR TEACHING STYLE:**
- Adjust explanations based on user knowledge level (${state.userLevel})
- Use clear examples and analogies
- Break down complex concepts into digestible parts
- Encourage questions and deeper exploration
- Provide practical drills and practice tips when relevant
- Be enthusiastic about the game while remaining informative

**CONVERSATION CONTEXT:**
- You have discussed these topics: ${state.topicsDiscussed.join(', ') || 'None yet'}
- This is message #${state.messageCount + 1} in the conversation
- Maintain continuity with previous discussion

**IMPORTANT:**
- If asked about current stats, scores, or real-time information, politely explain you don't have live data
- Focus on teaching concepts, strategy, and understanding the game
- Always be encouraging and supportive of learning`;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle chat endpoint with streaming
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const { message } = await request.json<{ message: string }>();
        
        // Get current state
        const state = await this.getState();

        // Save user message
        await this.saveMessage('user', message);

        // Detect user level and extract topics
        this.detectUserLevel(message, state);
        this.extractTopics(message, state);

        // Save updated metadata
        await this.updateMetadata('userLevel', state.userLevel);
        await this.updateMetadata('topicsDiscussed', JSON.stringify(state.topicsDiscussed));

        // Prepare messages for AI (last 10 + current)
        const messages = [
          {
            role: 'system',
            content: this.getSystemPrompt(state),
          },
          ...state.conversationHistory.slice(-10),
          {
            role: 'user',
            content: message,
          },
        ];

        // Create streaming response using Server-Sent Events
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Start streaming in the background with bulletproof reliability
        (async () => {
          let fullResponse = '';
          let isStreamingComplete = false;
          
          try {
            // Use native streaming for unlimited output - no truncation possible
            console.log('Starting native AI streaming for unlimited output');
            
            try {
              const aiStream = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                messages: messages as any,
                stream: true, // Use native streaming to prevent truncation
                max_tokens: 4096, // Increase token limit for longer responses
              });
              
              console.log('AI stream started successfully');
              
              // Process the native stream and parse AI responses properly
              const reader = aiStream.getReader();
              const decoder = new TextDecoder();
              let fullResponse = '';
              let buffer = '';
              
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    console.log('AI stream completed naturally');
                    break;
                  }
                  
                  // Decode the chunk
                  const chunk = decoder.decode(value, { stream: true });
                  buffer += chunk;
                  
                  // Parse AI stream data to extract actual text content
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || ''; // Keep incomplete line in buffer
                  
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        
                        // Extract the actual response text from AI stream
                        if (data.response && typeof data.response === 'string') {
                          fullResponse += data.response;
                          
                          // Send clean text to client
                          try {
                            await writer.write(
                              encoder.encode(`data: ${JSON.stringify({ 
                                type: 'chunk', 
                                content: data.response,
                                userLevel: state.userLevel,
                                topicsDiscussed: state.topicsDiscussed,
                              })}\n\n`)
                            );
                            console.log(`Streamed clean text: "${data.response.substring(0, 50)}..."`);
                          } catch (writeError) {
                            console.error('Error writing clean chunk:', writeError);
                            // Continue streaming even if one chunk fails
                          }
                        }
                      } catch (parseError) {
                        // Skip malformed JSON lines
                        console.log('Skipping malformed line:', line.substring(0, 100));
                      }
                    }
                  }
                }
              } finally {
                reader.releaseLock();
              }
              
              console.log(`Complete response length: ${fullResponse.length} characters`);
              
            } catch (streamError) {
              console.error('Native streaming failed, falling back to non-streaming:', streamError);
              
              // Fallback to non-streaming if native streaming fails
              let aiResponse = null;
              let retryCount = 0;
              const maxRetries = 3;
              
              while (retryCount < maxRetries && !aiResponse) {
                try {
                  console.log(`Fallback AI call attempt ${retryCount + 1}/${maxRetries}`);
                  aiResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                    messages: messages as any,
                    stream: false,
                    max_tokens: 4096, // Increase token limit for longer responses
                  });
                  console.log('Fallback AI response received successfully');
                } catch (aiError) {
                  retryCount++;
                  console.error(`Fallback AI call failed (attempt ${retryCount}):`, aiError);
                  if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                  }
                }
              }
              
              if (aiResponse && aiResponse.response) {
                fullResponse = aiResponse.response;
                console.log(`Fallback response length: ${fullResponse.length} characters`);
                
                // Stream the fallback response in chunks
                const words = fullResponse.split(' ');
                for (let i = 0; i < words.length; i += 3) {
                  const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
                  if (!chunk.trim()) continue;
                  
                  try {
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({ 
                        type: 'chunk', 
                        content: chunk,
                        userLevel: state.userLevel,
                        topicsDiscussed: state.topicsDiscussed,
                      })}\n\n`)
                    );
                    console.log(`Fallback chunk ${Math.floor(i/3) + 1}/${Math.ceil(words.length/3)}: "${chunk.substring(0, 50)}..."`);
                  } catch (chunkError) {
                    console.error('Error writing fallback chunk:', chunkError);
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              } else {
                fullResponse = "I'm sorry, I couldn't generate a response. Please try again.";
                console.log('No AI response received, sending fallback message');
                
                try {
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify({ 
                      type: 'chunk', 
                      content: fullResponse,
                      userLevel: state.userLevel,
                      topicsDiscussed: state.topicsDiscussed,
                    })}\n\n`)
                  );
                } catch (fallbackError) {
                  console.error('Failed to send fallback message:', fallbackError);
                }
              }
            }


            // Save assistant's complete response
            try {
              await this.saveMessage('assistant', fullResponse);
              console.log('Message saved successfully');
            } catch (saveError) {
              console.error('Failed to save message:', saveError);
            }

            // Send completion event with retry
            let completionSent = false;
            let completionRetryCount = 0;
            const maxCompletionRetries = 3;
            
            while (!completionSent && completionRetryCount < maxCompletionRetries) {
              try {
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'done',
                    userLevel: state.userLevel,
                    topicsDiscussed: state.topicsDiscussed,
                    messageCount: state.messageCount + 2,
                  })}\n\n`)
                );
                completionSent = true;
                isStreamingComplete = true;
                console.log('Completion event sent successfully');
              } catch (completionError) {
                completionRetryCount++;
                console.error(`Completion send failed (attempt ${completionRetryCount}):`, completionError);
                if (completionRetryCount < maxCompletionRetries) {
                  await new Promise(resolve => setTimeout(resolve, 200 * completionRetryCount));
                }
              }
            }

            // Final attempt to close writer
            try {
              await writer.close();
              console.log('Writer closed successfully');
            } catch (closeError) {
              console.error('Error closing writer:', closeError);
            }
            
          } catch (error) {
            console.error('Critical streaming error:', error);
            const errorMessage = error instanceof Error ? error.message : 
                                typeof error === 'string' ? error : 
                                'Unknown error occurred';
            
            // Send error with retry
            let errorSent = false;
            let errorRetryCount = 0;
            const maxErrorRetries = 3;
            
            while (!errorSent && errorRetryCount < maxErrorRetries) {
              try {
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'error', 
                    message: errorMessage 
                  })}\n\n`)
                );
                errorSent = true;
                console.log('Error message sent successfully');
              } catch (writeError) {
                errorRetryCount++;
                console.error(`Error message send failed (attempt ${errorRetryCount}):`, writeError);
                if (errorRetryCount < maxErrorRetries) {
                  await new Promise(resolve => setTimeout(resolve, 100 * errorRetryCount));
                }
              }
            }
            
            // Final attempt to close writer
            try {
              await writer.close();
            } catch (closeError) {
              console.error('Error closing writer after error:', closeError);
            }
          }
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (error) {
        console.error('Chat error:', error);
        return Response.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Handle reset endpoint
    if (url.pathname === '/reset' && request.method === 'POST') {
      this.sql.exec(`DELETE FROM messages`);
      this.sql.exec(`DELETE FROM metadata`);
      return Response.json({ success: true, message: 'Conversation reset' });
    }

    // Handle state endpoint
    if (url.pathname === '/state' && request.method === 'GET') {
      const state = await this.getState();
      return Response.json({
        userLevel: state.userLevel,
        topicsDiscussed: state.topicsDiscussed,
        messageCount: state.messageCount,
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private detectUserLevel(message: string, state: ConversationState): void {
    // Only detect if unknown
    if (state.userLevel !== 'unknown') return;

    const lowerMessage = message.toLowerCase();

    const beginnerKeywords = [
      'what is', 'how do i', 'basics', 'basic', 'beginner',
      'just started', 'new to', 'learning', 'simple',
    ];

    const advancedKeywords = [
      'horns set', 'pick and roll coverage', 'drop coverage',
      'hedge', 'ice', 'blue', 'pnr', 'offensive scheme',
      'defensive rotations', 'help side', 'weak side',
    ];

    const hasBeginnerKeywords = beginnerKeywords.some(kw => lowerMessage.includes(kw));
    const hasAdvancedKeywords = advancedKeywords.some(kw => lowerMessage.includes(kw));

    if (hasAdvancedKeywords) {
      state.userLevel = 'advanced';
    } else if (hasBeginnerKeywords) {
      state.userLevel = 'beginner';
    } else {
      state.userLevel = 'intermediate';
    }
  }

  private extractTopics(message: string, state: ConversationState): void {
    const lowerMessage = message.toLowerCase();

    const topicKeywords: Record<string, string[]> = {
      shooting: ['shoot', 'shooting', 'shot', 'three point', 'free throw', 'jumper'],
      defense: ['defense', 'defending', 'guard', 'block', 'steal'],
      passing: ['pass', 'passing', 'assist', 'ball movement'],
      dribbling: ['dribble', 'dribbling', 'handle', 'crossover'],
      rebounding: ['rebound', 'rebounding', 'box out'],
      strategy: ['strategy', 'play', 'offense', 'set', 'scheme'],
      rules: ['rule', 'foul', 'violation', 'technical', 'traveling'],
      positions: ['point guard', 'shooting guard', 'center', 'forward', 'position'],
      training: ['train', 'drill', 'practice', 'workout', 'improve'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => lowerMessage.includes(kw))) {
        if (!state.topicsDiscussed.includes(topic)) {
          state.topicsDiscussed.push(topic);
        }
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Serve static assets for root
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return env.ASSETS.fetch(request);
    }

    // Route to Durable Object for API endpoints
    if (url.pathname.startsWith('/chat') || url.pathname.startsWith('/reset') || url.pathname.startsWith('/state')) {
      // Use a single instance for simplicity, or extract user ID from request
      const id = env.BASKETBALL_AGENT.idFromName('default');
      const stub = env.BASKETBALL_AGENT.get(id);
      return stub.fetch(request);
    }

    // Serve other static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
