import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `
You are Bina AI, an expert automated video editor. 
Your task is to analyze a video and provide a structured JSON output for automated editing.

1. **Cuts**: Identify segments that should be removed (filler words like "umm", "eh", long silence, or mistakes).
2. **Chapters**: Create chapters based on topic changes.
3. **Smart Zoom**: Identify moments where the speaker references specific visual details (code lines, filenames, UI elements) to zoom in.
4. **Subtitles**: Generate accurate subtitles in **"Bahasa Melayu KL" (Kuala Lumpur Malay)**. Use casual slang where appropriate (e.g., 'ni', 'tu', 'nak', 'takyah').

Timestamps must be in seconds (float).
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    cuts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.NUMBER, description: "Start time in seconds" },
          end: { type: Type.NUMBER, description: "End time in seconds" },
          reason: { type: Type.STRING, description: "Why this should be cut (e.g. 'Silence', 'Filler')" },
        },
        required: ["start", "end", "reason"],
      },
    },
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.NUMBER, description: "Start time of chapter in seconds" },
          title: { type: Type.STRING, description: "Chapter title" },
        },
        required: ["timestamp", "title"],
      },
    },
    zooms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.NUMBER },
          end: { type: Type.NUMBER },
          target: { type: Type.STRING, description: "One of: center, top-left, top-right, bottom-left, bottom-right" },
          description: { type: Type.STRING },
        },
        required: ["start", "end", "target"],
      },
    },
    subtitles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.NUMBER },
          end: { type: Type.NUMBER },
          text: { type: Type.STRING, description: "Subtitle text in Bahasa Melayu KL" },
        },
        required: ["start", "end", "text"],
      },
    },
  },
  required: ["cuts", "chapters", "zooms", "subtitles"],
};

export const analyzeVideoWithGemini = async (videoFile: File): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Convert File to Base64 for the API
  // Note: For large production apps, we would use the File API upload manager. 
  // For this demo, we convert to base64 client-side which has size limits (approx 20MB safe limit).
  const base64Data = await fileToBase64(videoFile);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: videoFile.type,
            data: base64Data
          }
        },
        {
          text: "Analyze this video for automated editing cuts, chapters, smart zooms, and Malay KL subtitles."
        }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  const jsonText = response.text;
  if (!jsonText) throw new Error("No response from AI");
  
  return JSON.parse(jsonText) as AnalysisResult;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:video/mp4;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
