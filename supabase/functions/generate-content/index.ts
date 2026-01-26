import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EducationLevel = "primary" | "high_school" | "undergraduate";

interface RequestBody {
  type: "flashcards" | "quiz" | "summary" | "diagram";
  topic?: string;
  gradeLevel?: number;
  educationLevel?: EducationLevel;
  fieldOfStudy?: string;
  subjects?: string[];
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
  content?: string;
  isBase64?: boolean;
  diagramType?: "flowchart" | "mindmap";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { type, topic, gradeLevel = 5, educationLevel, fieldOfStudy, subjects, count = 5, difficulty = "medium", content, isBase64, diagramType = "flowchart" } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficultyDescriptions: Record<string, string> = {
      easy: "simple and straightforward, focusing on basic concepts",
      medium: "moderately challenging, requiring some critical thinking",
      hard: "challenging, requiring deeper understanding and analysis",
    };

    // Build education context based on level
    const getEducationContext = (): string => {
      if (educationLevel === "undergraduate") {
        const fieldContext = fieldOfStudy ? ` studying ${fieldOfStudy}` : "";
        const subjectContext = subjects && subjects.length > 0 ? ` focusing on ${subjects.join(", ")}` : "";
        return `an undergraduate university student${fieldContext}${subjectContext}. Use academic terminology and complex concepts appropriate for higher education`;
      }
      
      if (educationLevel === "high_school") {
        const fieldContext = fieldOfStudy ? ` in the ${fieldOfStudy} track` : "";
        const subjectContext = subjects && subjects.length > 0 ? ` studying ${subjects.join(", ")}` : "";
        return `a high school student${fieldContext}${subjectContext}. Use clear explanations with some technical terms, appropriate for teenage learners preparing for exams`;
      }
      
      // Primary school - use grade level
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
      const subjectContext = subjects && subjects.length > 0 ? ` learning ${subjects.join(", ")}` : "";
      return `a ${gradeDescriptions[gradeLevel] || gradeDescriptions[5]} student${subjectContext}. Use simple, child-friendly language with encouragement`;
    };

    const educationContext = getEducationContext();

    let systemPrompt: string;
    let userPrompt: string;
    let tools: any[] | undefined;
    let toolChoice: any | undefined;
    let messages: any[];

    if (type === "diagram") {
      const diagramInstructions = diagramType === "flowchart"
        ? `Create a Mermaid flowchart diagram. Use 'graph TD' or 'graph LR' syntax. Use simple node IDs (A, B, C, etc.) with descriptive labels. Connect nodes with arrows (-->). Example:
graph TD
    A[Start] --> B[Process Step]
    B --> C{Decision?}
    C -->|Yes| D[Action A]
    C -->|No| E[Action B]
    D --> F[End]
    E --> F`
        : `Create a Mermaid mindmap diagram. Use 'mindmap' syntax with proper indentation. The root should be the main topic, with branches for subtopics. Example:
mindmap
  root((Main Topic))
    Branch 1
      Sub-item 1
      Sub-item 2
    Branch 2
      Sub-item 3
    Branch 3`;

      const systemPrompt = `You are an expert at creating clear, educational diagrams using Mermaid syntax. Create diagrams that are easy to understand and visually represent the key concepts and relationships in the content.

IMPORTANT RULES:
1. Return ONLY valid Mermaid code, no markdown code blocks
2. Use simple, short node labels
3. Ensure all connections are valid
4. For flowcharts, use graph TD (top-down) or graph LR (left-right)
5. For mindmaps, use proper indentation with spaces
6. Keep the diagram focused on main concepts (5-10 nodes maximum)`;

      const userPrompt = `${diagramInstructions}

Based on the following content, create a ${diagramType} diagram that visualizes the main concepts and relationships:

${content}

Remember: Return ONLY the Mermaid code, no explanations or markdown.`;

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
        throw new Error("Failed to generate diagram");
      }

      const data = await response.json();
      let mermaidCode = data.choices?.[0]?.message?.content || "";

      // Clean up the response - remove markdown code blocks if present
      mermaidCode = mermaidCode.replace(/```mermaid\n?/g, "").replace(/```\n?/g, "").trim();

      if (!mermaidCode) {
        throw new Error("No diagram generated");
      }

      return new Response(
        JSON.stringify({ mermaidCode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "summary") {
      systemPrompt = "You are an expert at summarizing educational content. Create clear, concise summaries that capture the key points and main ideas. Format your summary with clear sections and bullet points where appropriate.";
      
      if (isBase64 && content) {
        // Handle multimodal content (images/documents)
        messages = [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Please summarize the content in this document/image. Provide a comprehensive summary with key points, main ideas, and important details. Use clear headings and bullet points." },
              { type: "image_url", image_url: { url: content } }
            ]
          }
        ];
      } else {
        userPrompt = `Please summarize the following content. Provide a comprehensive summary with key points, main ideas, and important details. Use clear headings and bullet points where appropriate.\n\nContent to summarize:\n${content}`;
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ];
      }

      // For summaries, we don't use tool calling - just get the text response
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
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
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content;

      if (!summary) {
        throw new Error("No summary generated");
      }

      return new Response(
        JSON.stringify({ summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Flashcards and Quiz generation
    if (type === "flashcards") {
      systemPrompt = `You are an educational content creator specializing in creating ${difficultyDescriptions[difficulty]} flashcards. Create appropriate, engaging flashcards for ${educationContext}.`;
      
      userPrompt = `Create ${count} ${difficulty} educational flashcards about "${topic}" for ${educationContext}. Make them engaging and appropriate for the education level.`;
      
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
    } else if (type === "quiz") {
      systemPrompt = `You are an educational content creator specializing in creating ${difficultyDescriptions[difficulty]} quizzes. Create appropriate, engaging multiple choice quizzes for ${educationContext}.`;
      
      userPrompt = `Create a ${count}-question ${difficulty} multiple choice quiz about "${topic}" for ${educationContext}. Make the questions engaging and educational. Each question should have exactly 4 options with only one correct answer.`;
      
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
    } else {
      throw new Error("Invalid content type");
    }

    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt! }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
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

    const generatedContent = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(generatedContent),
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
