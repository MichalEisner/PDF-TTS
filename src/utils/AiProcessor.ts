import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from "firebase/ai";
import { ai } from "../firebase/firebase";

export async function refineTextForTts(text: string): Promise<string> {
  if (!text || text.length < 50) return text;

  console.log("AiProcessor: Spouštím optimalizaci textu...", { length: text.length });

  // Rozdělení textu na větší bloky (100 000 znaků), aby se optimalizoval počet volání
  const CHUNK_SIZE = 100000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }

  console.log(`AiProcessor: Text rozdělen na ${chunks.length} částí.`);
  const processedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`AiProcessor: Zpracovávám část ${i + 1}/${chunks.length}...`);

    const model = getGenerativeModel(ai, {
      model: "gemini-3-flash-preview",
      generationConfig: {
        maxOutputTokens: 65530,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    }, {
      timeout: 300000,
    });

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
      9. DŮLEŽITÉ: Nemaž žádné věty ani části textu, které nespadají pod pravidlo 1 a 8. Cílem je zachovat kompletní významový obsah.
      10. Vrať POUZE opravený text této části bez komentářů.
  
      Text k optimalizaci (část ${i + 1}/${chunks.length}):
      ${chunk}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let refinedChunk = response.text().trim();
      refinedChunk = refinedChunk.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
      processedChunks.push(refinedChunk);

      if (chunks.length > 1 && i < chunks.length - 1) {
        console.log(`AiProcessor: Čekám 5 sekund před částí ${i + 2}/${chunks.length}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error: any) {
      console.error(`AiProcessor: Chyba v části ${i + 1}:`, error);
      processedChunks.push(chunk);
    }
  }

  console.log("AiProcessor: Všechny části zpracovány, spojuji výsledek.");
  return processedChunks.join('\n\n');
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text) return "";

  console.log("AiProcessor: Spouštím překlad textu...", { length: text.length, targetLanguage });

  // Sjednocujeme velikost bloku na 100 000 jako u TTS AI
  const CHUNK_SIZE = 50000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }

  const processedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`AiProcessor: Překládám část ${i + 1}/${chunks.length} do ${targetLanguage}...`);

    const model = getGenerativeModel(ai, {
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        maxOutputTokens: 65530,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    }, {
      timeout: 300000,
    });

    const prompt = `Jsi profesionální překladatel. Tvým úkolem je přeložit následující text do jazyka: ${targetLanguage}.
Moc důležité: Pokud v textu narazíš na označení "Nová kapitola:" nebo "Nová podkapitola:", PONECHEJ JE PŘESNĚ TAK, JAK JSOU (nepřekládej je ani neměň jejich formát). 
Zachovej původní význam, tón a veškeré formátování (odstavce).
Zde je text k překladu:

${chunk}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let translatedChunk = response.text().trim();
      translatedChunk = translatedChunk.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
      processedChunks.push(translatedChunk);

      if (chunks.length > 1 && i < chunks.length - 1) {
        console.log(`AiProcessor: Čekám 5 sekund před další částí překladu...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error: any) {
      console.error(`AiProcessor: Chyba při překladu části ${i + 1}:`, error);
      processedChunks.push(chunk);
    }
  }

  return processedChunks.join('\n\n');
}
