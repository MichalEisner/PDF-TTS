// @ts-ignore - lamejs doesn't have types
import * as lamejs from 'lamejs';

export class TtsEngine {
  constructor() {
    // No longer need complex audio context setup for native recording
  }

  getVoices(): SpeechSynthesisVoice[] {
    // We return a small subset or mock voices to keep the UI compatible 
    // while we use the Google Translate API under the hood
    return window.speechSynthesis.getVoices();
  }

  async speakAndRecord(text: string, voiceURI: string, onProgress: (progress: number) => void): Promise<Blob> {
    // Identify target language from voiceURI or default to CZ
    const lang = voiceURI.includes('cs') || voiceURI.includes('Czech') ? 'cs' : 'en';
    
    // Split text into chunks to respect the 200 character limit of the Google Translate TTS API
    const chunks = this.splitText(text, 200);
    const audioBlobs: Blob[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Route through local CORS proxy
      const url = `http://localhost:8010/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TTS API failed for chunk ${i}`);
        const blob = await response.blob();
        audioBlobs.push(blob);
        
        // Update progress
        onProgress((i + 1) / chunks.length);
      } catch (error) {
        console.error("TTS Engine Error:", error);
      }
    }

    if (audioBlobs.length === 0) throw new Error("Nepodařilo se vygenerovat žádné audio.");

    // Merge audio blobs into a single MP3 Blob
    return new Blob(audioBlobs, { type: 'audio/mpeg' });
  }

  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const cleanText = text.replace(/[*#]/g, '').replace(/\s+/g, ' ').trim();
    console.log("TtsEngine: Dělím text na bloky pro plynulé čtení. Celková délka:", cleanText.length);
    
    let currentPos = 0;
    while (currentPos < cleanText.length) {
      let endPos = currentPos + maxLength;
      
      if (endPos >= cleanText.length) {
        chunks.push(cleanText.substring(currentPos));
        break;
      }

      // Try to find the best break point within the 200 char window
      const lookbackLimit = Math.max(currentPos, endPos - 50); // Look back up to 50 chars for punctuation
      let bestBreak = -1;

      // Priority 1: Sentence endings (. ! ?)
      const sentenceEnd = cleanText.substring(lookbackLimit, endPos).search(/[.!?]\s/);
      if (sentenceEnd !== -1) {
        bestBreak = lookbackLimit + sentenceEnd + 1;
      } else {
        // Priority 2: Clauses (, ; :)
        const clauseEnd = cleanText.substring(lookbackLimit, endPos).search(/[,;:]\s/);
        if (clauseEnd !== -1) {
          bestBreak = lookbackLimit + clauseEnd + 1;
        } else {
          // Priority 3: Spaces
          const lastSpace = cleanText.lastIndexOf(' ', endPos);
          if (lastSpace > currentPos) {
            bestBreak = lastSpace;
          } else {
            // Priority 4: Hard cut
            bestBreak = endPos;
          }
        }
      }

      chunks.push(cleanText.substring(currentPos, bestBreak).trim());
      currentPos = bestBreak;
    }

    return chunks.filter(c => c.length > 0);
  }

  stop() {
    // No-op for API based TTS in this implementation
  }
}
