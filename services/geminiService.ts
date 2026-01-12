
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessedDocument, ReportData } from "../types";

// Declare mammoth for TypeScript
declare const mammoth: any;

/**
 * Enhanced compression for processing batches while maintaining OCR-readable quality.
 */
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Maintain a resolution that balances API limits with OCR readability
        const MAX_WIDTH = 1200; 
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas context failed");
        
        ctx.drawImage(img, 0, 0, width, height);
        // Use 0.8 quality to ensure Arabic characters remain sharp for the model
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

type GeminiPart = { inlineData: { data: string; mimeType: string } } | { text: string };

const fileToGenerativePart = async (file: File): Promise<GeminiPart> => {
  try {
    if (file.type === 'application/pdf') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ inlineData: { data: base64, mimeType: file.type } });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    if (file.type.includes('word') || file.type.includes('msword')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve({ text: `Document Content (${file.name}):\n${result.value}` });
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    }

    const base64Data = await compressImage(file);
    return { inlineData: { data: base64Data, mimeType: 'image/jpeg' } };
  } catch (error) {
    console.error("File processing failed:", file.name, error);
    return { text: `Error processing file: ${file.name}` };
  }
};

const BATCH_SIZE = 1; // Processing one by one ensures maximum focus and accuracy for OCR

export const analyzeDocumentsMetadata = async (
    files: File[], 
    onProgress?: (processed: number, total: number) => void
): Promise<Omit<ProcessedDocument, 'file' | 'previewUrl'>[]> => {
  const allResults: any[] = [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const chunk = files.slice(i, i + BATCH_SIZE);
    const fileParts = await Promise.all(chunk.map(fileToGenerativePart));
    
    const prompt = `
      You are an advanced Medical AI with expert OCR capabilities in English and Arabic scripts.
      Analyze this medical record with high precision.
      
      ACCURACY GUIDELINES:
      1. ORIENTATION: The image may be rotated or upside down. Correct it mentally to read accurately.
      2. MULTILINGUAL OCR: Read both Arabic (Naskh/Kufic) and English text.
      3. ARABIC TRANSLATION: If the document is in Arabic, translate the key clinical findings into professional medical English for the 'summary' field.
      4. NOISE REDUCTION: Ignore shadows or unrelated artifacts.
      
      REQUIRED DATA:
      - DATE: Standardize to YYYY-MM-DD.
      - TYPE: LAB, IMAGING, PRESCRIPTION, NOTE, or OTHER.
      - SUMMARY: A clear, professional English summary of the diagnosis or results.
      - DUPLICATE: Identify if this looks like a previously scanned document.
    `;

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, nullable: true },
          type: { type: Type.STRING, enum: ['LAB', 'IMAGING', 'PRESCRIPTION', 'NOTE', 'OTHER'] },
          summary: { type: Type.STRING },
          isDuplicate: { type: Type.BOOLEAN }
        },
        required: ['type', 'summary', 'isDuplicate']
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [{ text: prompt }, ...fileParts] },
        config: { 
          responseMimeType: "application/json", 
          responseSchema: responseSchema,
          temperature: 0.1 
        }
      });

      const batchData = JSON.parse(response.text || "[]");
      
      batchData.forEach((item: any) => {
        allResults.push({
          id: Math.random().toString(36).substring(7),
          date: item.date || null,
          type: item.type || 'OTHER',
          summary: item.summary || 'Record processed',
          isDuplicate: !!item.isDuplicate
        });
      });
    } catch (err) {
      console.error(`Analysis failed for record ${i}:`, err);
      allResults.push({
        id: Math.random().toString(36).substring(7),
        date: null,
        type: 'OTHER',
        summary: 'OCR Analysis failed for this record.',
        isDuplicate: false
      });
    }

    if (onProgress) onProgress(i + 1, files.length);
  }

  return allResults;
};

export const generateMedicalReport = async (documents: ProcessedDocument[]): Promise<ReportData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const activeDocs = documents
    .filter(d => !d.isDuplicate || d.type === 'IMAGING')
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));

  const timelineText = activeDocs.map(d => 
    `Date: ${d.date || 'Undated'} | Type: ${d.type} | Summary: ${d.summary}`
  ).join('\n');

  const prompt = `
    Synthesize the following medical timeline of ${activeDocs.length} records into a clinical portfolio:
    
    ${timelineText}
    
    Provide a professional narrative history, an integrated synthesis, and clinical observations.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      history: { type: Type.STRING },
      summary: { type: Type.STRING },
      prognosis: { type: Type.STRING },
    },
    required: ['history', 'summary', 'prognosis']
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: responseSchema }
  });

  return JSON.parse(response.text || "{}") as ReportData;
};
