import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from "firebase/ai";
import { ai } from "../firebase/firebase";

export async function refineTextForTts(text: string): Promise<string> {
  console.log("AiProcessor: Spouštím optimalizaci textu...", { length: text.length });
  
  const model = getGenerativeModel(ai, { 
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
    2. Identifikuj nadpisy a podnadpisy na základě jejich struktury v textu (velká písmena, odsazení, osamocené řádky).
    3. Před každý HLAVNÍ nadpis (např. název kapitoly) přidej text "Nová kapitola: ".
    4. Před každý PODNADPIS (mezinadpis sekce) přidej text "Nová podkapitola: ".
    5. Rozepiš zkratky (např. "cca" na "přibližně", "atd." na "a tak dále").
    6. Formátuj data a čísla tak, aby se dala snadno přečíst.
    7. Zachovej smysl a tón textu, neprováděj žádné shrnutí.
    8. Vrať POUZE opravený text bez jakýchkoliv tvých komentářů.

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
    
    // Normalizace mezer při zachování konců řádků pro lepší strukturu
    refinedText = refinedText.replace(/[ \t]+/g, ' ').trim();
    
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
