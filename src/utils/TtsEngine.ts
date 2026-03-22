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

    // 1. Sequential Background MP3 Generation ONLY (Live playback removed)
    const chunks = this.splitText(cleanText, 180);
    const audioBlobs: Blob[] = [];

    console.log(`TtsEngine: Startuju sekvenční generování ${chunks.length} bloků...`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=gtx`;
        
        const proxies = [
            (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`
        ];

        let blob: Blob | null = null;
        for (const proxyFn of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch(proxyFn(ttsUrl), { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error(`Status ${response.status}`);
                blob = await response.blob();
                break;
            } catch (e) {
                console.warn(`Proxy selhala, zkouším další...`, e);
            }
        }

        if (blob) audioBlobs.push(blob);
        onProgress((i + 1) / chunks.length);
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 400));
    }

    if (audioBlobs.length === 0) {
        throw new Error("Nepodařilo se vygenerovat MP3 (všechny proxy selhaly).");
    }

    return new Blob(audioBlobs, { type: 'audio/mpeg' });
  }

  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    while (currentPos < text.length) {
      let endPos = currentPos + maxLength;
      if (endPos >= text.length) {
        chunks.push(text.substring(currentPos));
        break;
      }
      const lastSpace = text.lastIndexOf(' ', endPos);
      const bestBreak = lastSpace > currentPos ? lastSpace : endPos;
      chunks.push(text.substring(currentPos, bestBreak).trim());
      currentPos = bestBreak;
    }
    return chunks.filter(c => c.length > 0);
  }

  stop() {
    // No live speech to stop anymore
  }
}
