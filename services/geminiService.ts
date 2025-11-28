import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { PaperData, PaperSection, GroundingSource } from "../types";

// Constants for Models
const MODEL_RESEARCH = 'gemini-2.5-flash';
const MODEL_CHAT = 'gemini-3-pro-preview';
const MODEL_IMAGE = 'gemini-2.5-flash-image';

// Helper to get a fresh client instance (important for API key switching)
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates the structure (Outline) of the research paper.
 * Uses Search Grounding to ensure the angle is relevant.
 */
export const generatePaperOutline = async (topic: string): Promise<Partial<PaperData>> => {
  const ai = getAiClient();
  const prompt = `
    You are an elite academic research assistant.
    Create a comprehensive and structured outline for a research paper on the topic: "${topic}".
    
    The output must be a valid JSON object with the following schema:
    {
      "title": "A catchy, academic title",
      "abstract": "A brief summary of what the paper will discuss (approx 100 words)",
      "sections": [
        {
          "title": "Section Title",
          "description_for_image": "A precise prompt for generating a visual aid. You MUST request a 'Vector Diagram' or 'Infographic' that visually explains the concept (e.g., flowcharts, system architecture, data flow). Avoid generic photorealistic images unless it is for historical context."
        }
      ]
    }
    
    Ensure there are at least 4-6 substantial sections excluding the abstract.
    Return strictly raw JSON. Do not use Markdown formatting (like \`\`\`json).
  `;

  const response = await ai.models.generateContent({
    model: MODEL_RESEARCH,
    contents: prompt,
    config: {
      // responseMimeType and responseSchema are NOT supported with tools (googleSearch) in the current API version.
      // We rely on the prompt to get JSON and parse it manually.
      tools: [{ googleSearch: {} }], // Use search to know what's current about the topic
    }
  });

  if (!response.text) throw new Error("Failed to generate outline.");
  
  // Clean up potential markdown formatting from the model
  let cleanText = response.text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
  }
  
  let data;
  try {
    data = JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON outline:", cleanText);
    throw new Error("Failed to parse outline JSON.");
  }
  
  // Transform to our internal type
  const sections: PaperSection[] = data.sections.map((s: any, index: number) => ({
    id: `sec-${index}`,
    title: s.title,
    content: "",
    imagePrompt: s.description_for_image,
    isProcessing: true
  }));

  return {
    title: data.title,
    abstract: data.abstract,
    sections,
    references: extractGroundingSources(response)
  };
};

/**
 * Generates content for a specific section using Search Grounding.
 */
export const generateSectionContent = async (
  paperTitle: string, 
  sectionTitle: string,
  abstract: string
): Promise<{ content: string; references: GroundingSource[] }> => {
  const ai = getAiClient();
  const prompt = `
    Write a detailed, academic, and engaging content for the section titled "${sectionTitle}" 
    for a research paper titled "${paperTitle}".
    
    Context (Abstract): ${abstract}
    
    Requirements:
    - Use Markdown formatting (headers, bold, lists).
    - **IMPORTANT**: You MUST use **bold** text for key terms, definitions, and important figures.
    - **IMPORTANT**: Use *italics* for emphasis or when introducing new terminology.
    - Be highly informative, professional, and use up-to-date information.
    - Aim for about 300-500 words.
    - Focus strictly on the content for this section. Do not include the title again.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_RESEARCH,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }] // Critical for "up to date" info
    }
  });

  return {
    content: response.text || "Content generation failed.",
    references: extractGroundingSources(response)
  };
};

/**
 * Generates an image for a section using Gemini 2.5 Flash Image.
 */
export const generateSectionImage = async (
  imageDescription: string
): Promise<string | undefined> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [{ text: imageDescription }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
          // imageSize is not supported in Flash Image
        }
      }
    });

    // Extract base64 image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.warn("Image generation failed", error);
    return undefined; // Fail gracefully for images
  }
};

/**
 * ChatBot Service
 */
export const createChatSession = () => {
  const ai = getAiClient();
  return ai.chats.create({
    model: MODEL_CHAT,
    config: {
      systemInstruction: "You are a helpful, intelligent research assistant integrated into the 'ScholarSanim' app. Help users refine their research topics, explain complex concepts, or summarize findings.",
    }
  });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  const result = await chat.sendMessage({ message });
  return result.text || "";
};

/**
 * Helper to extract grounding sources (URLs) from a Gemini response
 */
function extractGroundingSources(response: GenerateContentResponse): GroundingSource[] {
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri
        });
      }
    });
  }
  
  // Deduplicate by URI
  return sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
}