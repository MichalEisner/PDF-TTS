// @ts-ignore - lamejs doesn't have types
import * as lamejs from 'lamejs';

export class TtsEngine {
  constructor() {}

  getVoices(): SpeechSynthesisVoice[] {
    // Return standard AI voice options for the API
    return [
      { 
        name: 'Standard AI Voice (Czech)', 
        lang: 'cs-CZ', 
        voiceURI: 'google-cs',
        default: true,
        localService: false
      } as SpeechSynthesisVoice,
      { 
        name: 'Standard AI Voice (English)', 
        lang: 'en-US', 
        voiceURI: 'google-en',
        default: false,
        localService: false
      } as SpeechSynthesisVoice
    ];
  }

  async speakAndRecord(text: string, voiceURI: string, onProgress: (progress: number) => void): Promise<Blob> {
    const lang = voiceURI.includes('cs') || voiceURI.includes('Czech') ? 'cs' : 'en';
    const chunks = this.splitText(text, 200);
    const audioBlobs: Blob[] = [];

    console.log(`TtsEngine: Startuju generování ${chunks.length} bloků...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Use client=gtx which is more reliable for free usage
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=gtx`;
      
      // Use AllOrigins as a robust raw proxy for static sites
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(ttsUrl)}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const blob = await response.blob();
        audioBlobs.push(blob);
        onProgress((i + 1) / chunks.length);
      } catch (error) {
        console.error(`TtsEngine Error (Chunk ${i}):`, error);
        // If one chunk fails, we continue but warn
      }
    }

    if (audioBlobs.length === 0) throw new Error("Nepodařilo se vygenerovat audio přes API.");

    return new Blob(audioBlobs, { type: 'audio/mpeg' });
  }

  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const cleanText = text.replace(/[*#]/g, '').replace(/[ \t]+/g, ' ').trim();
    
    let currentPos = 0;
    while (currentPos < cleanText.length) {
      let endPos = currentPos + maxLength;
      if (endPos >= cleanText.length) {
        chunks.push(cleanText.substring(currentPos));
        break;
      }

      const lookbackLimit = Math.max(currentPos, endPos - 50);
      let bestBreak = -1;

      const newlineIdx = cleanText.substring(lookbackLimit, endPos).indexOf('\n');
      if (newlineIdx !== -1) {
        bestBreak = lookbackLimit + newlineIdx + 1;
      } else {
        const punctuationIdx = cleanText.substring(lookbackLimit, endPos).search(/[.!?]\s/);
        if (punctuationIdx !== -1) {
          bestBreak = lookbackLimit + punctuationIdx + 1;
        } else {
          const lastSpace = cleanText.lastIndexOf(' ', endPos);
          bestBreak = lastSpace > currentPos ? lastSpace : endPos;
        }
      }

      chunks.push(cleanText.substring(currentPos, bestBreak).trim());
      currentPos = bestBreak;
    }
    return chunks.filter(c => c.length > 0);
  }

  stop() {
    // API based generation cannot be stopped easily once started
  }
}
