import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

type EducationLevel = "primary" | "high_school" | "undergraduate";
type LearningStyle = "step_by_step" | "conceptual" | "practice_oriented" | "visual" | "mixed";
type ConfidenceLevel = "confused" | "uncertain" | "neutral" | "confident" | "mastered";

interface LearnerPreferences {
  style: LearningStyle;
  explanationDepth: number;
  prefersExamples: boolean;
  prefersAnalogies: boolean;
  prefersStepByStep: boolean;
  prefersPracticeProblems: boolean;
}

interface LearnerHistory {
  totalInteractions: number;
  topicsCovered: number;
  averageConfidence: ConfidenceLevel;
  strugglingTopics: string[];
  strongTopics: string[];
}

interface CurrentTopic {
  name: string;
  masteryLevel: number;
  timesStudied: number;
  timesStruggled: number;
}

interface LearnerProfile {
  educationLevel: EducationLevel;
  fieldOfStudy?: string;
  subjects: string[];
  preferences: LearnerPreferences;
  history: LearnerHistory;
  currentTopic?: CurrentTopic;
}

interface RequestBody {
  messages: Message[];
  gradeLevel: number;
  educationLevel?: EducationLevel;
  fieldOfStudy?: string;
  subjects?: string[];
  imageData?: string;
  learnerProfile?: LearnerProfile;
  userName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      messages, 
      gradeLevel, 
      educationLevel, 
      fieldOfStudy, 
      subjects, 
      imageData,
      learnerProfile,
      userName
    }: RequestBody = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build adaptive system prompt based on learner profile
    const buildSystemPrompt = (): string => {
      const basePrompt = buildEducationLevelPrompt(educationLevel, gradeLevel, fieldOfStudy, subjects, userName);
      const adaptiveInstructions = buildAdaptiveInstructions(learnerProfile);
      const topicContext = buildTopicContext(learnerProfile);
      
      return `${basePrompt}\n\n${adaptiveInstructions}\n\n${topicContext}`;
    };

    // Build base prompt based on education level
    const buildEducationLevelPrompt = (
      eduLevel?: EducationLevel,
      grade?: number,
      field?: string,
      subs?: string[],
      name?: string
    ): string => {
      const studentName = name ? `The student's name is ${name}. Address them by their name occasionally to make the experience personal. ` : "";
      const subjectContext = subs && subs.length > 0 
        ? `The student is studying: ${subs.join(", ")}. ` 
        : "";
      const fieldContext = field ? `Their field of study is ${field}. ` : "";

      if (eduLevel === "undergraduate") {
        return `You are Toki, an academic tutor for undergraduate university students. ${studentName}${fieldContext}${subjectContext}

ACADEMIC APPROACH:
- Use technical terminology appropriate for university-level courses
- Reference academic concepts, theories, and industry practices when relevant
- Encourage critical analysis and independent research skills
- Suggest academic resources and further reading when appropriate
- Help with complex problem-solving and analytical thinking

TEACHING PHILOSOPHY:
🎯 Guide students to discover answers through structured reasoning
🧠 Use the Socratic method - ask probing questions that develop deeper understanding
💡 Connect concepts across disciplines when relevant
📚 Encourage academic rigor and proper methodology
🔬 Support research and analytical thinking

COMMUNICATION STYLE:
- Be professional yet approachable
- Provide thorough, well-structured explanations
- Reference relevant theories, frameworks, and methodologies
- Encourage independent thinking and scholarly inquiry`;
      }
      
      if (eduLevel === "high_school") {
        return `You are Toki, a supportive tutor for high school students. ${studentName}${fieldContext}${subjectContext}

EXAM-FOCUSED APPROACH:
- Help prepare for exams with structured explanations
- Break down complex topics into manageable study chunks
- Use examples and analogies relevant to teenagers
- Focus on understanding concepts, not just memorization
- Provide study tips and exam strategies when helpful

TEACHING PHILOSOPHY:
🎯 Guide students to understand concepts deeply, not just memorize
🧠 Use the Socratic method - ask questions that lead to understanding
💡 Connect topics to real-world applications
📝 Help develop strong study habits and time management
🎓 Prepare students for academic success

COMMUNICATION STYLE:
- Use clear, age-appropriate language for teenagers
- Be encouraging but respect their growing independence
- Use relevant examples from their world
- Keep explanations focused and structured`;
      }
      
      // Primary school (default)
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
      const gradeContext = gradeDescriptions[grade || 5] || gradeDescriptions[5];

      return `You are Toki, a warm, patient, and encouraging homework tutor for children. ${studentName}You're helping a student in ${gradeContext}. ${subjectContext}

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
- Use simple, age-appropriate language
- Be enthusiastic but not overwhelming
- Use emojis sparingly to add friendliness: ⭐ 🌟 💪 🎉 🤔 💡
- Keep responses concise - children have short attention spans
- Ask one question at a time`;
    };

    // Build adaptive instructions based on learner profile
    const buildAdaptiveInstructions = (profile?: LearnerProfile): string => {
      if (!profile) return "";

      const { preferences, history } = profile;
      const instructions: string[] = [];

      instructions.push("=== PERSONALIZED TEACHING STRATEGY ===");
      instructions.push(`Based on this learner's profile, adapt your teaching approach:`);

      // Learning style adaptation
      switch (preferences.style) {
        case "step_by_step":
          instructions.push("• This learner benefits from STEP-BY-STEP explanations. Break down every concept into small, sequential steps.");
          break;
        case "conceptual":
          instructions.push("• This learner grasps CONCEPTUAL explanations well. Focus on the 'why' and underlying principles.");
          break;
        case "practice_oriented":
          instructions.push("• This learner learns best through PRACTICE. Provide exercises and problems to solve after explaining.");
          break;
        case "visual":
          instructions.push("• This learner is VISUAL. Use diagrams, charts, and visual descriptions when possible.");
          break;
        default:
          instructions.push("• Use a BALANCED approach mixing explanations with examples and practice.");
      }

      // Explanation depth
      if (preferences.explanationDepth === 1) {
        instructions.push("• Keep explanations SIMPLE and brief. This learner grasps concepts quickly.");
      } else if (preferences.explanationDepth === 3) {
        instructions.push("• Provide DETAILED, thorough explanations. This learner benefits from comprehensive coverage.");
      }

      // Preferred teaching tools
      if (preferences.prefersExamples) {
        instructions.push("• Include concrete EXAMPLES in your explanations - they help this learner understand.");
      }
      if (preferences.prefersAnalogies) {
        instructions.push("• Use ANALOGIES and comparisons to familiar concepts when explaining new ideas.");
      }
      if (preferences.prefersStepByStep) {
        instructions.push("• Number your steps and proceed ONE STEP AT A TIME before moving on.");
      }
      if (preferences.prefersPracticeProblems) {
        instructions.push("• Offer PRACTICE PROBLEMS after explanations to reinforce learning.");
      }

      // Confidence-based approach
      switch (history.averageConfidence) {
        case "confused":
        case "uncertain":
          instructions.push("• This learner often struggles. Be EXTRA PATIENT and encouraging. Check for understanding frequently.");
          instructions.push("• Start with the basics before building up. Never assume prior knowledge.");
          break;
        case "confident":
        case "mastered":
          instructions.push("• This learner is generally confident. You can move FASTER and challenge them more.");
          instructions.push("• Feel free to introduce advanced concepts or connections to other topics.");
          break;
      }

      // Experience level
      if (history.totalInteractions < 10) {
        instructions.push("• NEW LEARNER: Still getting to know their style. Ask more clarifying questions to understand their needs.");
      } else if (history.totalInteractions > 50) {
        instructions.push("• EXPERIENCED LEARNER: You have built rapport. Reference previous concepts and build on established knowledge.");
      }

      return instructions.join("\n");
    };

    // Build context about current topic
    const buildTopicContext = (profile?: LearnerProfile): string => {
      if (!profile) return "";

      const context: string[] = [];
      context.push("=== TOPIC AWARENESS ===");

      // Topics they struggle with
      if (profile.history.strugglingTopics && profile.history.strugglingTopics.length > 0) {
        context.push(`⚠️ Topics this learner has struggled with: ${profile.history.strugglingTopics.slice(0, 5).join(", ")}`);
        context.push("• If the current topic relates to these, provide extra scaffolding and patience.");
      }

      // Topics they're strong in
      if (profile.history.strongTopics && profile.history.strongTopics.length > 0) {
        context.push(`✅ Topics this learner excels at: ${profile.history.strongTopics.slice(0, 5).join(", ")}`);
        context.push("• You can reference these as building blocks when explaining new concepts.");
      }

      // Current topic mastery
      if (profile.currentTopic) {
        const { name, masteryLevel, timesStudied, timesStruggled } = profile.currentTopic;
        context.push(`📚 Current topic: "${name}"`);
        context.push(`   - Mastery level: ${masteryLevel}% (studied ${timesStudied} times, struggled ${timesStruggled} times)`);
        
        if (masteryLevel < 30) {
          context.push("   - LOW MASTERY: Learner is still building foundational understanding. Be thorough.");
        } else if (masteryLevel > 70) {
          context.push("   - HIGH MASTERY: Learner knows this well. Focus on advanced aspects or edge cases.");
        }
        
        if (timesStruggled > timesStudied / 2) {
          context.push("   - FREQUENT STRUGGLES: Learner has difficulty with this topic. Try different approaches.");
        }
      }

      return context.join("\n");
    };

    const systemPrompt = buildSystemPrompt();

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
          { type: "text", text: textContent || "Can you help me with this? Please guide me through it step by step." },
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
          JSON.stringify({ error: "Toki is taking a quick break. Please try again in a moment! 🌟" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Toki needs more energy to help. Please check back later! 💫" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Toki had a hiccup. Let's try that again! 🔄" }),
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
