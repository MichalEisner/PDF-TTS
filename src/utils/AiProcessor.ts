import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = "AIzaSyByTdx3HoO-ORweOs0UVnRWnU0VIrVOA80";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function refineTextForTts(text: string): Promise<string> {
  console.log("AiProcessor: Spouštím optimalizaci textu...", { length: text.length });
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const prompt = `
    Jsi asistent pro optimalizaci textu pro převod na řeč (TTS). 
    Tvým úkolem je upravit následující text tak, aby zněl co nejpřirozeněji při čtení AI hlasem.
    
    Pravidla:
    1. Odstraň nesmyslné znaky, rozbité konce řádků a artefakty z PDF.
    2. Rozepiš zkratky (např. "cca" na "přibližně", "atd." na "a tak dále").
    3. Formátuj data a čísla tak, aby se dala snadno přečíst (např. "1.1.2024" na "prvního ledna dva tisíce dvacet čtyři").
    4. Zachovej smysl a tón textu, neprováděj žádné shrnutí, pouze optimalizuj pro přednes.
    5. Vrať POUZE opravený text bez jakýchkoliv tvých komentářů.

    Text k optimalizaci:
    ${text}
  `;

  try {
    console.log("AiProcessor: Odesílám požadavek do Gemini API...");
    const result = await model.generateContent(prompt);
    
    // Kontrola, zda byl požadavek zablokován bezpečnostními filtry
    if (result.response.promptFeedback?.blockReason) {
      console.error("AiProcessor: Požadavek byl zablokován:", result.response.promptFeedback.blockReason);
    }

    const response = await result.response;
    let refinedText = response.text().trim();
    
    // Odstranění případných markdown bloků (např. ```text ... ```)
    refinedText = refinedText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
    
    // Normalizace mezer a konců řádků (odstranění vícenásobných mezer a ticha)
    refinedText = refinedText.replace(/\s+/g, ' ').trim();
    
    console.log("AiProcessor: Optimalizace úspěšně dokončena.");
    return refinedText;
  } catch (error: any) {
    console.error("AiProcessor: Detailní chyba:", {
      message: error.message,
      status: error.status,
      details: error.response?.data || error
    });
    
    if (error.message?.includes("API key not valid")) {
      console.error("AiProcessor: Klíč API není platný.");
    }
    
    return text;
  }
}
