import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from "firebase/ai";
import { ai } from "../firebase/firebase";

export async function refineTextForTts(text: string): Promise<string> {
  if (!text || text.length < 50) return text;
  
  console.log("AiProcessor: Spouštím optimalizaci textu...", { length: text.length });
  
  const model = getGenerativeModel(ai, { 
    model: "gemini-3-flash-preview", // Uživatel si přeje ponechat tento název
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  // Rozdělení textu na bloky (cca 8000 znaků), aby se předešlo limitu výstupních tokenů
  const CHUNK_SIZE = 8000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }

  console.log(`AiProcessor: Text rozdělen na ${chunks.length} částí.`);
  const processedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`AiProcessor: Zpracovávám část ${i + 1}/${chunks.length}...`);

    const prompt = `
      Jsi asistent pro optimalizaci textu pro převod na řeč (TTS). 
      Tvým úkolem je upravit tuto ČÁST textu tak, aby zněla co nejpřirozeněji při čtení AI hlasem.
      
      Pravidla:
      1. Odstraň nesmyslné znaky, rozbité konce řádků a artefakty z PDF.
      2. Identifikuj nadpisy a podnadpisy na základě jejich struktury.
      3. Před hlavní nadpis přidej "Nová kapitola: ", před podnadpis "Nová podkapitola: ".
      4. Rozepiš zkratky (cca -> přibližně, atd. -> a tak dále).
      5. Formátuj data a čísla tak, aby se dala snadno přečíst.
      6. Fonetický přepis: Cizí slova/jména (English) přepiš foneticky česky (př. George -> Džordž, ChatGPT -> čet džípítý).
      7. Case Normalizace: SLOVA VELKÝMI PÍSMENY změň na Standardní (př. HORATIO -> Horatio).
      8. Odstranění stránkování: Identifikuj a vymaž čísla stránek z textu.
      9. Vrať POUZE opravený text této části bez komentářů.
  
      Text k optimalizaci (část ${i + 1}/${chunks.length}):
      ${chunk}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let refinedChunk = response.text().trim();
      
      // Sanitizace markdownu
      refinedChunk = refinedChunk.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
      processedChunks.push(refinedChunk);
      
      // Malá pauza mezi bloky (prevence limitu požadavků)
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`AiProcessor: Chyba v části ${i + 1}:`, error);
      // Pokud část selže, použijeme původní neošetřený text pro tuto část
      processedChunks.push(chunk);
    }
  }

  console.log("AiProcessor: Všechny části zpracovány, spojuji výsledek.");
  return processedChunks.join('\n\n');
}
