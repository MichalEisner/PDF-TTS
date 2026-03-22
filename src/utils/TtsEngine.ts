// @ts-ignore - lamejs doesn't have types
import * as lamejs from 'lamejs';

export class TtsEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {}

  getVoices(): SpeechSynthesisVoice[] {
    // Return both system voices (for playback) and AI labels (for the UI)
    const systemVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('cs') || v.lang.startsWith('en'));
    
    // If no system voices yet (chrome loading bug), return placeholders
    if (systemVoices.length === 0) {
      return [
        { name: 'Standard AI Voice (Czech)', lang: 'cs-CZ', voiceURI: 'google-cs', default: true } as SpeechSynthesisVoice,
        { name: 'Standard AI Voice (English)', lang: 'en-US', voiceURI: 'google-en', default: false } as SpeechSynthesisVoice
      ];
    }
    return systemVoices;
  }

  async speakAndRecord(text: string, voiceURI: string, onProgress: (progress: number) => void): Promise<Blob> {
    const cleanText = text.replace(/[*#]/g, '').replace(/[ \t]+/g, ' ').trim();
    const lang = voiceURI.includes('cs') || voiceURI.includes('Czech') ? 'cs' : 'en';

    // 1. Instant Playback via Web Speech API
    this.playSpeech(cleanText, voiceURI);

    // 2. Sequential Background MP3 Generation
    const chunks = this.splitText(cleanText, 180); // Slightly smaller chunks for safety
    const audioBlobs: Blob[] = [];

    console.log(`TtsEngine: Startuju sekvenční generování ${chunks.length} bloků...`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=gtx`;
        
        // Try multiple proxies if one fails
        const proxies = [
            (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];

        let blob: Blob | null = null;
        for (const proxyFn of proxies) {
            try {
                const response = await fetch(proxyFn(ttsUrl));
                if (!response.ok) throw new Error(`Status ${response.status}`);
                blob = await response.blob();
                break; // Success!
            } catch (e) {
                console.warn(`Proxy selhala, zkouším další...`, e);
            }
        }

        if (blob) {
            audioBlobs.push(blob);
        }
        
        // Update progress based on chunks fetched
        onProgress((i + 1) / chunks.length);
        
        // Add a small delay between requests to be nice to proxies
        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    if (audioBlobs.length === 0) {
        throw new Error("Nepodařilo se vygenerovat MP3 soubor (proxy servery jsou přetížené).");
    }

    return new Blob(audioBlobs, { type: 'audio/mpeg' });
  }

  private playSpeech(text: string, voiceURI: string) {
    this.stop();
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.voiceURI === voiceURI) || 
                  voices.find(v => v.lang.startsWith('cs')) || 
                  voices[0];

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    if (voice) this.currentUtterance.voice = voice;
    this.currentUtterance.lang = voice?.lang || 'cs-CZ';
    window.speechSynthesis.speak(this.currentUtterance);
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
    window.speechSynthesis.cancel();
    this.currentUtterance = null;
  }
}
