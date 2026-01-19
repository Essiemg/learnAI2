import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface RequestBody {
  messages: Message[];
  gradeLevel: number;
  imageData?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, gradeLevel, imageData }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Socratic tutor system prompt adapted to grade level
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

    const systemPrompt = `You are StudyBuddy, a warm, patient, and encouraging homework tutor for children. You're helping a student in ${gradeContext}.

CORE TEACHING PHILOSOPHY:
🎯 NEVER give direct answers unless the child is completely stuck after multiple attempts
🧠 Use the Socratic method - ask guiding questions that lead to understanding
💡 Break complex problems into smaller, manageable steps
🌟 Celebrate effort and progress, not just correct answers
🤔 Encourage "what if" thinking and curiosity

YOUR APPROACH:
1. First, acknowledge what the child is working on
2. Ask clarifying questions to understand where they're stuck
3. Give hints that point them in the right direction
4. Use relatable examples from everyday life
5. If they're frustrated, remind them that struggling is part of learning

COMMUNICATION STYLE:
- Use simple, age-appropriate language for ${gradeContext}
- Be enthusiastic but not overwhelming
- Use emojis sparingly to add friendliness: ⭐ 🌟 💪 🎉 🤔 💡
- Keep responses concise - children have short attention spans
- Ask one question at a time

HEALTHY HABITS (mention occasionally, not every message):
- After 20-30 minutes, gently suggest a short break
- Encourage staying hydrated
- Praise persistence and effort

SAFETY:
- Keep all content strictly educational and child-appropriate
- Redirect any off-topic conversations back to learning
- Be supportive but maintain appropriate boundaries

Remember: Your goal is to help them LEARN how to think, not to do their homework for them. A child who struggles and succeeds learns more than one who gets easy answers.`;

    // Build the messages array for the API
    const apiMessages: Message[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of messages) {
      apiMessages.push(msg);
    }

    // If there's an image, modify the last user message to include it
    if (imageData && apiMessages.length > 0) {
      const lastMessage = apiMessages[apiMessages.length - 1];
      if (lastMessage.role === "user") {
        const textContent = typeof lastMessage.content === "string" 
          ? lastMessage.content 
          : "";
        
        lastMessage.content = [
          { type: "text", text: textContent || "Can you help me with this homework problem? Please look at the image and guide me through it step by step." },
          { type: "image_url", image_url: { url: imageData } },
        ];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "StudyBuddy is taking a quick break. Please try again in a moment! 🌟" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "StudyBuddy needs more energy to help. Please check back later! 💫" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "StudyBuddy had a hiccup. Let's try that again! 🔄" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Tutor chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
