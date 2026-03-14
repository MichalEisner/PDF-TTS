import { Settings, Loader2, Sparkles } from 'lucide-react';

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
  canConvert
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
        <h3 className="text-lg font-bold">Voice Settings</h3>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold opacity-70">Language & Voice</label>
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
          <label className="text-sm font-semibold opacity-70">Speaking Speed ({speed.toFixed(1)}x)</label>
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
            <span>Slower</span>
            <span>Faster</span>
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
        {isProcessing ? 'Processing Queue...' : 'Convert to Speech'}
      </button>
    </div>
  );
};
