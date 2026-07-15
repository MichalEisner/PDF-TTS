import { Settings, Loader2, Sparkles, Mail, Send } from 'lucide-react';

const SHOW_CLOUD_FEATURES = false; // Nastavte na true pro zapnutí odesílání na mail

interface VoiceSettingsProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceChange: (voiceURI: string) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
  onConvert: () => void;
  isProcessing: boolean;
  canConvert: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  onSendToCloud: () => void;
}

export const VoiceSettings = ({ 
  voices, 
  selectedVoice, 
  onVoiceChange, 
  speed, 
  onSpeedChange, 
  disabled,
  onConvert,
  isProcessing,
  canConvert,
  email,
  onEmailChange,
  onSendToCloud
}: VoiceSettingsProps) => {
  const groupedVoices = voices.reduce((acc, voice) => {
    if (!acc[voice.lang]) acc[voice.lang] = [];
    acc[voice.lang].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);

  const sortedLangs = Object.keys(groupedVoices).sort();

  return (
    <div className="flex flex-col gap-6 bg-white dark:bg-slate-800/50 p-8 rounded-xl border border-primary/10 h-full">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="text-primary w-5 h-5" />
        <h3 className="text-lg font-bold">Nastavení hlasu</h3>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold opacity-70">Jazyk a hlas</label>
          <select 
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-primary/10 bg-background-light dark:bg-background-dark p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
          >
            {sortedLangs.map((lang) => (
              <optgroup key={lang} label={lang}>
                {groupedVoices[lang].map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold opacity-70">Rychlost řeči ({speed.toFixed(1)}x)</label>
          <input 
            className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" 
            max="2.0" 
            min="0.5" 
            step="0.1" 
            type="range" 
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            disabled={disabled}
          />
          <div className="flex justify-between text-[10px] opacity-50 px-1">
            <span>Pomaleji</span>
            <span>Rychleji</span>
          </div>
        </div>
      </div>

      <button 
        onClick={onConvert}
        disabled={disabled || !canConvert}
        className="mt-4 w-full h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
        {isProcessing ? 'Zpracovávám frontu...' : 'Převést na řeč'}
      </button>

      {SHOW_CLOUD_FEATURES && (
        <div className="flex flex-col gap-2 pt-2 border-t border-primary/5">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Zpracovat v cloudu a poslat na mail</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input 
                type="email"
                placeholder="Váš e-mail..."
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <button 
              onClick={onSendToCloud}
              disabled={disabled || !canConvert || !email}
              className="p-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 transition-all disabled:opacity-30 group"
              title="Optimalizovat AI a poslat na mail"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
          <p className="text-[10px] opacity-40 leading-relaxed">
            Tato volba text vyčistí pomocí AI a výsledek vám pošle na mail. Můžete pak kartu ihned zavřít.
          </p>
        </div>
      )}
    </div>
  );
};
