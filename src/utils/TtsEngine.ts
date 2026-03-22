// @ts-ignore - lamejs doesn't have types
import * as lamejs from 'lamejs';

export class TtsEngine {
  constructor() {}

  getVoices(): SpeechSynthesisVoice[] {
    // Return AI labels for the UI (used for choosing lang)
    return [
      { name: 'Standard AI Voice (Czech)', lang: 'cs-CZ', voiceURI: 'google-cs', default: true } as SpeechSynthesisVoice,
      { name: 'Standard AI Voice (English)', lang: 'en-US', voiceURI: 'google-en', default: false } as SpeechSynthesisVoice
    ];
  }

  async speakAndRecord(text: string, voiceURI: string, onProgress: (progress: number) => void): Promise<Blob> {
    const cleanText = text.replace(/[*#]/g, '').replace(/[ \t]+/g, ' ').trim();
    const lang = voiceURI.includes('cs') || voiceURI.includes('Czech') ? 'cs' : 'en';

    const chunks = this.splitText(cleanText, 200);
    const audioBlobs: Blob[] = [];

    console.log(`TtsEngine: Startuju robustní generování pro ${chunks.length} bloků...`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        // More robust URL structure
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&total=1&idx=0&textlen=${chunk.length}&client=tw-ob&prev=input&ttsspeed=1`;
        
        const proxies = [
            (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`
        ];

        let blob: Blob | null = null;
        let success = false;

        for (const proxyFn of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for stability
                
                const finalUrl = proxyFn(ttsUrl);
                console.log(`TtsEngine: Zkouším proxy ${i+1}/${chunks.length}...`);
                
                const response = await fetch(finalUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    blob = await response.blob();
                    if (blob.size > 100) { // Ensure we got a real audio file
                        success = true;
                        break;
                    }
                }
            } catch (e) {
                console.warn(`Proxy selhala u bloku ${i}, zkouším další variantu...`, e);
            }
        }

        if (success && blob) {
            audioBlobs.push(blob);
        } else {
            console.error(`Kritické selhání bloku ${i} - všechny cesty selhaly.`);
        }

        onProgress((i + 1) / chunks.length);
        
        // Wait 1 second between chunks to avoid being flagged as bot
        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (audioBlobs.length === 0) {
        throw new Error("Nepodařilo se vygenerovat MP3. Servery jsou dočasně přetížené.");
    }

    console.log("TtsEngine: Generování dokončeno, spojuji kousky.");
    return new Blob(audioBlobs, { type: 'audio/mpeg' });
  }

  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    
    while (currentPos < text.length) {
      if (currentPos + maxLength >= text.length) {
        chunks.push(text.substring(currentPos).trim());
        break;
      }

      let endPos = currentPos + maxLength;
      const lookbackLimit = Math.max(currentPos, endPos - 70); // Search in last 70 chars
      const segment = text.substring(lookbackLimit, endPos);
      
      let bestBreak = -1;

      // 1. Try to find end of sentence (. ! ? followed by space)
      const sentenceEnd = segment.search(/[.!?]\s/);
      if (sentenceEnd !== -1) {
        bestBreak = lookbackLimit + sentenceEnd + 1;
      } 
      // 2. Try to find comma or other punctuation
      else {
        const punctuation = segment.search(/[,:;]\s/);
        if (punctuation !== -1) {
          bestBreak = lookbackLimit + punctuation + 1;
        }
        // 3. Fallback to last space
        else {
          const lastSpace = text.lastIndexOf(' ', endPos);
          bestBreak = lastSpace > currentPos ? lastSpace : endPos;
        }
      }

      chunks.push(text.substring(currentPos, bestBreak).trim());
      currentPos = bestBreak;
    }
    
    return chunks.filter(c => c.length > 0);
  }

  stop() {
    // No live speech to stop anymore
  }
}
