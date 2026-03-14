import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceChange: (voiceURI: string) => void;
  disabled?: boolean;
}

export const LanguageSelector = ({ voices, selectedVoice, onVoiceChange, disabled }: LanguageSelectorProps) => {
  const groupedVoices = voices.reduce((acc, voice) => {
    if (!acc[voice.lang]) acc[voice.lang] = [];
    acc[voice.lang].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);

  const sortedLangs = Object.keys(groupedVoices).sort();

  return (
    <div className="w-full max-w-xs space-y-2">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <Globe size={14} /> Jazyk a Hlas
      </label>
      <div className="relative">
        <select
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/10 text-slate-700 font-semibold disabled:opacity-50 transition-all cursor-pointer shadow-sm hover:border-slate-300"
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
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>
    </div>
  );
};
