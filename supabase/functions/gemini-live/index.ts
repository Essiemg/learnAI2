import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeminiLiveConfig {
  gradeLevel: number;
  systemInstruction?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

  if (!GOOGLE_AI_API_KEY) {
    console.error("GOOGLE_AI_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "Google AI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response(
      JSON.stringify({ error: "Expected WebSocket upgrade" }),
      { status: 426, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get config from query params
  const url = new URL(req.url);
  const gradeLevel = parseInt(url.searchParams.get("gradeLevel") || "5");

  // Grade level descriptions for the AI
  const gradeDescriptions: Record<number, string> = {
    1: "1st grade (age 6-7), use very simple words and lots of encouragement",
    2: "2nd grade (age 7-8), use simple language with basic concepts",
    3: "3rd grade (age 8-9), introduce slightly more complex ideas gently",
    4: "4th grade (age 9-10), can handle multi-step problems with guidance",
    5: "5th grade (age 10-11), ready for more abstract thinking",
    6: "6th grade (age 11-12), transitioning to middle school concepts",
    7: "7th grade (age 12-13), can handle algebraic and scientific thinking",
    8: "8th grade (age 13-14), ready for pre-high school level concepts",
  };

  const gradeContext = gradeDescriptions[gradeLevel] || gradeDescriptions[5];

  const systemInstruction = `You are StudyBuddy, a warm, patient, and encouraging homework tutor for children. You're helping a student in ${gradeContext}.

CORE TEACHING PHILOSOPHY:
- NEVER give direct answers unless the child is completely stuck after multiple attempts
- Use the Socratic method - ask guiding questions that lead to understanding
- Break complex problems into smaller, manageable steps
- Celebrate effort and progress, not just correct answers
- Encourage "what if" thinking and curiosity

YOUR APPROACH:
1. First, acknowledge what the child is working on
2. Ask clarifying questions to understand where they're stuck
3. Give hints that point them in the right direction
4. Use relatable examples from everyday life
5. If they're frustrated, remind them that struggling is part of learning

COMMUNICATION STYLE:
- Use simple, age-appropriate language for ${gradeContext}
- Be enthusiastic but not overwhelming
- Keep responses concise - children have short attention spans
- Ask one question at a time
- Speak naturally and warmly like a friendly tutor

SAFETY:
- Keep all content strictly educational and child-appropriate
- Redirect any off-topic conversations back to learning
- Be supportive but maintain appropriate boundaries

Remember: Your goal is to help them LEARN how to think, not to do their homework for them.`;

  // Upgrade to WebSocket
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  // Connect to Gemini Live API
  const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GOOGLE_AI_API_KEY}`;
  
  let geminiSocket: WebSocket | null = null;
  let isSetupComplete = false;

  clientSocket.onopen = () => {
    console.log("Client connected, establishing Gemini connection...");
    
    geminiSocket = new WebSocket(geminiUrl);

    geminiSocket.onopen = () => {
      console.log("Connected to Gemini Live API");
      
      // Send setup message
      const setupMessage = {
        setup: {
          model: "models/gemini-2.5-flash-native-audio-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck" // Friendly voice for kids
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }
      };
      
      geminiSocket!.send(JSON.stringify(setupMessage));
      console.log("Setup message sent to Gemini");
    };

    geminiSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Gemini message type:", Object.keys(data).join(", "));
        
        // Check for setup complete
        if (data.setupComplete) {
          isSetupComplete = true;
          console.log("Gemini setup complete");
          clientSocket.send(JSON.stringify({ type: "setup_complete" }));
          return;
        }
        
        // Forward server content (audio responses)
        if (data.serverContent) {
          const serverContent = data.serverContent;
          
          // Check for interruption
          if (serverContent.interrupted) {
            clientSocket.send(JSON.stringify({ type: "interrupted" }));
            return;
          }
          
          // Check for model turn with audio
          if (serverContent.modelTurn && serverContent.modelTurn.parts) {
            for (const part of serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.data) {
                clientSocket.send(JSON.stringify({
                  type: "audio",
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000"
                }));
              }
              if (part.text) {
                clientSocket.send(JSON.stringify({
                  type: "text",
                  data: part.text
                }));
              }
            }
          }
          
          // Check for turn complete
          if (serverContent.turnComplete) {
            clientSocket.send(JSON.stringify({ type: "turn_complete" }));
          }
        }
      } catch (e) {
        console.error("Error processing Gemini message:", e);
      }
    };

    geminiSocket.onerror = (e) => {
      console.error("Gemini WebSocket error:", e);
      clientSocket.send(JSON.stringify({ type: "error", message: "Connection error" }));
    };

    geminiSocket.onclose = (e) => {
      console.log("Gemini connection closed:", e.code, e.reason);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1000, "Gemini connection closed");
      }
    };
  };

  clientSocket.onmessage = (event) => {
    if (!geminiSocket || geminiSocket.readyState !== WebSocket.OPEN) {
      console.log("Gemini socket not ready, buffering message");
      return;
    }

    try {
      const message = JSON.parse(event.data);
      
      if (message.type === "audio") {
        // Send audio to Gemini
        const realtimeInput = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm;rate=16000",
              data: message.data
            }]
          }
        };
        geminiSocket.send(JSON.stringify(realtimeInput));
      } else if (message.type === "text") {
        // Send text to Gemini
        const clientContent = {
          clientContent: {
            turns: [{
              role: "user",
              parts: [{ text: message.data }]
            }],
            turnComplete: true
          }
        };
        geminiSocket.send(JSON.stringify(clientContent));
      }
    } catch (e) {
      console.error("Error processing client message:", e);
    }
  };

  clientSocket.onerror = (e) => {
    console.error("Client WebSocket error:", e);
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.close();
    }
  };

  clientSocket.onclose = () => {
    console.log("Client disconnected");
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.close();
    }
  };

  return response;
});
