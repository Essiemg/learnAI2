/**
 * Shared Gemini API utilities for local backend functions
 * 
 * This module provides:
 * - Message format conversion (OpenAI -> Gemini)
 * - Multimodal content handling
 * - Streaming response transformation
 * - Function calling format conversion
 */

// Types
export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    }>;
  }>;
  toolConfig?: {
    functionCallingConfig: {
      mode: "AUTO" | "ANY" | "NONE";
      allowedFunctionNames?: string[];
    };
  };
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface OpenAIToolChoice {
  type: "function";
  function: { name: string };
}

// Constants
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Get the Gemini API URL for a model and operation
 */
export function getGeminiUrl(
  apiKey: string,
  model: string = DEFAULT_MODEL,
  streaming: boolean = false
): string {
  const operation = streaming ? "streamGenerateContent" : "generateContent";
  const streamParam = streaming ? "&alt=sse" : "";
  return `${GEMINI_API_BASE}/models/${model}:${operation}?key=${apiKey}${streamParam}`;
}

/**
 * Convert OpenAI-style messages to Gemini format
 */
export function convertMessages(messages: OpenAIMessage[]): {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
} {
  let systemInstruction: { parts: GeminiPart[] } | undefined;
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // System messages become systemInstruction
      const text = typeof msg.content === "string" 
        ? msg.content 
        : msg.content.find(p => p.type === "text")?.text || "";
      systemInstruction = { parts: [{ text }] };
      continue;
    }

    const role = msg.role === "assistant" ? "model" : "user";
    const parts: GeminiPart[] = [];

    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const imageData = extractImageData(part.image_url.url);
          if (imageData) {
            parts.push({ inlineData: imageData });
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  return { contents, systemInstruction };
}

/**
 * Extract base64 image data from a data URL or regular URL
 */
export function extractImageData(url: string): { mimeType: string; data: string } | null {
  // Handle data URLs
  if (url.startsWith("data:")) {
    const matches = url.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return {
        mimeType: matches[1],
        data: matches[2]
      };
    }
  }
  
  // For regular URLs, we'd need to fetch them - for now, skip
  // In a full implementation, you'd fetch the image and convert to base64
  console.warn("Non-data URL images require fetching - skipping:", url.substring(0, 50));
  return null;
}

/**
 * Convert OpenAI tools format to Gemini function declarations
 */
export function convertTools(tools?: OpenAITool[]): Array<{
  functionDeclarations: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
}> | undefined {
  if (!tools || tools.length === 0) return undefined;

  const functionDeclarations = tools
    .filter(t => t.type === "function")
    .map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }));

  return [{ functionDeclarations }];
}

/**
 * Convert OpenAI tool_choice to Gemini toolConfig
 */
export function convertToolChoice(toolChoice?: OpenAIToolChoice): {
  functionCallingConfig: {
    mode: "AUTO" | "ANY" | "NONE";
    allowedFunctionNames?: string[];
  };
} | undefined {
  if (!toolChoice) return undefined;

  if (toolChoice.type === "function" && toolChoice.function?.name) {
    return {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [toolChoice.function.name]
      }
    };
  }

  return {
    functionCallingConfig: { mode: "AUTO" }
  };
}

/**
 * Build a complete Gemini API request from OpenAI-style parameters
 */
export function buildGeminiRequest(params: {
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  toolChoice?: OpenAIToolChoice;
  temperature?: number;
  maxTokens?: number;
}): GeminiRequest {
  const { contents, systemInstruction } = convertMessages(params.messages);
  
  const request: GeminiRequest = { contents };
  
  if (systemInstruction) {
    request.systemInstruction = systemInstruction;
  }

  const tools = convertTools(params.tools);
  if (tools) {
    request.tools = tools;
  }

  const toolConfig = convertToolChoice(params.toolChoice);
  if (toolConfig) {
    request.toolConfig = toolConfig;
  }

  if (params.temperature !== undefined || params.maxTokens !== undefined) {
    request.generationConfig = {
      temperature: params.temperature,
      maxOutputTokens: params.maxTokens
    };
  }

  return request;
}

/**
 * Transform Gemini streaming response to OpenAI-compatible SSE format
 */
export function transformStreamChunk(geminiData: string): string {
  try {
    // Remove "data: " prefix if present
    const jsonStr = geminiData.replace(/^data:\s*/, "").trim();
    if (!jsonStr || jsonStr === "[DONE]") {
      return "data: [DONE]\n\n";
    }

    const parsed = JSON.parse(jsonStr);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!text) return "";

    // Transform to OpenAI format
    const openAIFormat = {
      choices: [{
        delta: { content: text },
        index: 0,
        finish_reason: null
      }]
    };

    return `data: ${JSON.stringify(openAIFormat)}\n\n`;
  } catch (e) {
    console.error("Error transforming stream chunk:", e);
    return "";
  }
}

/**
 * Create a transform stream that converts Gemini SSE to OpenAI SSE format
 */
export function createStreamTransformer(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      
      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const transformed = transformStreamChunk(trimmed);
        if (transformed) {
          controller.enqueue(encoder.encode(transformed));
        }
      }
    },
    flush(controller) {
      // Process any remaining data
      if (buffer.trim()) {
        const transformed = transformStreamChunk(buffer);
        if (transformed) {
          controller.enqueue(encoder.encode(transformed));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    }
  });
}

/**
 * Extract function call result from Gemini response
 */
export function extractFunctionCall(response: unknown): {
  name: string;
  arguments: string;
} | null {
  const data = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          functionCall?: {
            name: string;
            args: Record<string, unknown>;
          };
        }>;
      };
    }>;
  };

  const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
  if (functionCall) {
    return {
      name: functionCall.name,
      arguments: JSON.stringify(functionCall.args)
    };
  }
  return null;
}

/**
 * Extract text content from Gemini response
 */
export function extractTextContent(response: unknown): string {
  const data = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * CORS headers for edge functions
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Create an error response
 */
export function errorResponse(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create a JSON response
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create a streaming response
 */
export function streamResponse(body: ReadableStream): Response {
  return new Response(body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
  });
}
