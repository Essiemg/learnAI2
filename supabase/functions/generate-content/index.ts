import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  type: "flashcards" | "quiz";
  topic: string;
  gradeLevel: number;
  count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, topic, gradeLevel, count = 5 }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const gradeDescriptions: Record<number, string> = {
      1: "1st grade (age 6-7)",
      2: "2nd grade (age 7-8)",
      3: "3rd grade (age 8-9)",
      4: "4th grade (age 9-10)",
      5: "5th grade (age 10-11)",
      6: "6th grade (age 11-12)",
      7: "7th grade (age 12-13)",
      8: "8th grade (age 13-14)",
    };

    const gradeContext = gradeDescriptions[gradeLevel] || gradeDescriptions[5];

    let systemPrompt: string;
    let userPrompt: string;
    let tools: any[];
    let toolChoice: any;

    if (type === "flashcards") {
      systemPrompt = `You are an educational content creator specializing in creating flashcards for children. Create age-appropriate, engaging flashcards for ${gradeContext} students.`;
      
      userPrompt = `Create ${count} educational flashcards about "${topic}" for ${gradeContext} students. Make them engaging and appropriate for the age level.`;
      
      tools = [
        {
          type: "function",
          function: {
            name: "create_flashcards",
            description: "Create educational flashcards with questions and answers",
            parameters: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: {
                        type: "string",
                        description: "The question or term to learn"
                      },
                      back: {
                        type: "string",
                        description: "The answer or definition"
                      }
                    },
                    required: ["front", "back"],
                    additionalProperties: false
                  }
                }
              },
              required: ["flashcards"],
              additionalProperties: false
            }
          }
        }
      ];
      toolChoice = { type: "function", function: { name: "create_flashcards" } };
    } else {
      systemPrompt = `You are an educational content creator specializing in creating quizzes for children. Create age-appropriate, engaging multiple choice quizzes for ${gradeContext} students.`;
      
      userPrompt = `Create a ${count}-question multiple choice quiz about "${topic}" for ${gradeContext} students. Make the questions engaging and educational. Each question should have exactly 4 options with only one correct answer.`;
      
      tools = [
        {
          type: "function",
          function: {
            name: "create_quiz",
            description: "Create a multiple choice quiz with questions, options, and explanations",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: {
                        type: "string",
                        description: "The quiz question"
                      },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        description: "Exactly 4 answer options"
                      },
                      correctAnswer: {
                        type: "number",
                        description: "Index (0-3) of the correct option"
                      },
                      explanation: {
                        type: "string",
                        description: "Brief explanation of why the answer is correct"
                      }
                    },
                    required: ["question", "options", "correctAnswer", "explanation"],
                    additionalProperties: false
                  }
                }
              },
              required: ["questions"],
              additionalProperties: false
            }
          }
        }
      ];
      toolChoice = { type: "function", function: { name: "create_quiz" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment!" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate content");
    }

    const data = await response.json();
    
    // Extract the function call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No content generated");
    }

    const content = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(content),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Generate content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
