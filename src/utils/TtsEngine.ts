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

    // Personal Google Apps Script Proxy (FAST & RELIABLE)
    const gasProxyUrl = 'https://script.google.com/macros/s/AKfycbzZ5bvOCg75Sqz-4EkLP3e1KHFtlRyQt2z8tZYfKRp0R08caQuFaOvfQ6GfhdMeTP2pUA/exec';

    console.log(`TtsEngine: Startuju BLESKOVÉ generování pro ${chunks.length} bloků...`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&total=1&idx=0&textlen=${chunk.length}&client=tw-ob&prev=input&ttsspeed=1`;
        
        let blob: Blob | null = null;
        let success = false;

        // Try Personal GAS Proxy first (returns base64)
        try {
            console.log(`TtsEngine: Zkouším GAS proxy pro blok ${i+1}/${chunks.length}...`);
            const response = await fetch(`${gasProxyUrl}?url=${encodeURIComponent(ttsUrl)}`);
            if (response.ok) {
                const base64Content = await response.text();
                if (!base64Content.startsWith('Error')) {
                    const binaryString = window.atob(base64Content);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let j = 0; j < binaryString.length; j++) {
                        bytes[j] = binaryString.charCodeAt(j);
                    }
                    blob = new Blob([bytes], { type: 'audio/mpeg' });
                    success = true;
                }
            }
        } catch (e) {
            console.warn(`GAS proxy selhala, zkouším veřejné zálohy...`, e);
        }

        // Fallback to public proxies if GAS fails
        if (!success) {
            const fallbackProxies = [
                (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
                (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`
            ];

            for (const proxyFn of fallbackProxies) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);
                    const response = await fetch(proxyFn(ttsUrl), { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        blob = await response.blob();
                        if (blob.size > 100) { success = true; break; }
                    }
                } catch (e) { console.warn(`Záložní proxy selhala...`, e); }
            }
        }

        if (success && blob) {
            audioBlobs.push(blob);
        }

        onProgress((i + 1) / chunks.length);
        
        // Much shorter delay with GAS (100ms)
        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    if (audioBlobs.length === 0) {
        throw new Error("Nepodařilo se vygenerovat MP3 soubor.");
    }

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
