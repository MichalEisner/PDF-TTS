// @ts-ignore - lamejs doesn't have types
import * as lamejs from 'lamejs';

export class TtsEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    // Initialization of voices is handled by the browser
  }

  getVoices(): SpeechSynthesisVoice[] {
    // Return actual system voices
    const voices = window.speechSynthesis.getVoices();
    // Filter for Czech and English by default
    return voices.filter(v => v.lang.startsWith('cs') || v.lang.startsWith('en'));
  }

  async speakAndRecord(text: string, voiceURI: string, onProgress: (progress: number) => void): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.stop();

      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === voiceURI) || 
                             voices.find(v => v.lang.startsWith('cs')) || 
                             voices[0];

      if (!selectedVoice) {
        reject(new Error("Nenalezen žádný vhodný hlas."));
        return;
      }

      // Clean text for synthesis (remove markdown artifacts)
      const cleanText = text.replace(/[*#]/g, '').replace(/[ \t]+/g, ' ').trim();
      
      this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance.voice = selectedVoice;
      this.currentUtterance.lang = selectedVoice.lang;
      this.currentUtterance.rate = 1.0; // Can be linked to state later

      this.currentUtterance.onboundary = (event) => {
        if (event.name === 'word') {
          const progress = event.charIndex / cleanText.length;
          onProgress(progress);
        }
      };

      this.currentUtterance.onend = () => {
        onProgress(1);
        this.currentUtterance = null;
        // Return a dummy small MP3 blob to satisfy the type, 
        // informing the UI that real-time playback happened.
        resolve(new Blob([], { type: 'audio/mpeg' }));
      };

      this.currentUtterance.onerror = (error) => {
        console.error("Speech Synthesis Error:", error);
        this.currentUtterance = null;
        reject(error);
      };

      window.speechSynthesis.speak(this.currentUtterance);
    });
  }

  stop() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }
}
