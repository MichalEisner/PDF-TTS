import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Download, FileAudio, Loader2, CheckCircle2, AlertCircle, FileText, Mail, Send } from 'lucide-react';
import { translateText } from '../utils/AiProcessor';
import { exportToPdf, exportToEpub } from '../utils/DocumentExporter';
import { FileUploader } from './FileUploader';
import { extractTextFromPdf } from '../utils/PdfProcessor';
import { extractTextFromEpub } from '../utils/EpubProcessor';
import { auth, db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendToCloudBackground } from '../utils/CloudProcessor';

const LANGUAGES = [
  { code: 'cs', name: 'Čeština' },
  { code: 'en', name: 'Angličtina' },
  { code: 'de', name: 'Němčina' },
  { code: 'fr', name: 'Francouzština' },
  { code: 'es', name: 'Španělština' },
  { code: 'it', name: 'Italština' },
  { code: 'sk', name: 'Slovenština' },
  { code: 'pl', name: 'Polština' },
  { code: 'ru', name: 'Ruština' },
  { code: 'uk', name: 'Ukrajinština' },
];

const SHOW_CLOUD_FEATURES = false; // Nastavte na true pro zapnutí odesílání na mail

interface TranslatorSectionProps {
  onQueueForAudio: (text: string, fileName: string) => void;
}

export function TranslatorSection({ onQueueForAudio }: TranslatorSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('cs');
  const [status, setStatus] = useState<'IDLE' | 'EXTRACTING' | 'TRANSLATING' | 'DONE' | 'ERROR' | 'CLOUD_SENDING' | 'CLOUD_DONE'>('IDLE');
  const [translatedText, setTranslatedText] = useState('');
  const [email, setEmail] = useState(auth.currentUser?.email || '');

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setStatus('IDLE');
      setTranslatedText('');
    }
  };

  const startTranslation = async () => {
    if (!file) return;

    try {
      setStatus('EXTRACTING');
      const isEpub = file.name.toLowerCase().endsWith('.epub');
      let text = '';
      let metadata: { title?: string, author?: string } = {};

      if (isEpub) {
        const epubData = await extractTextFromEpub(file);
        text = epubData.text;
        metadata = epubData.metadata;
      } else {
        text = await extractTextFromPdf(file);
      }

      setStatus('TRANSLATING');
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
      const result = await translateText(text, langName);
      setTranslatedText(result);
      setStatus('DONE');

      // Auto-save to history if user is logged in
      const user = auth.currentUser;
      if (user) {
        try {
          await addDoc(collection(db, 'transcriptions'), {
            userId: user.uid,
            userEmail: user.email,
            fileName: `${file.name.replace(/\.[^/.]+$/, "")}_${targetLang}`,
            text: result,
            createdAt: serverTimestamp(),
            isTranslation: true,
            targetLang: langName,
            metadata: {
              ...(metadata || {}),
              originalName: file.name
            }
          });
          console.log("TranslatorSection: Překlad automaticky uložen do historie s metadaty.");
        } catch (saveError) {
          console.error("TranslatorSection: Chyba při ukládání do historie:", saveError);
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
      setStatus('ERROR');
    }
  };

  const handleStartBackgroundJob = async () => {
    if (!file || !email) return;

    try {
      setStatus('EXTRACTING');
      const isEpub = file.name.toLowerCase().endsWith('.epub');
      let text = '';
      let metadata: { title?: string, author?: string } = {};

      if (isEpub) {
        const epubData = await extractTextFromEpub(file);
        text = epubData.text;
        metadata = epubData.metadata;
      } else {
        text = await extractTextFromPdf(file);
      }

      setStatus('CLOUD_SENDING');
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
      
      const success = await sendToCloudBackground({
        text,
        email,
        fileName: file.name,
        type: 'PREKLAD',
        targetLanguage: langName,
        author: metadata?.author
      });

      if (success) {
        setStatus('CLOUD_DONE');
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      console.error('Cloud processing error:', error);
      setStatus('ERROR');
    }
  };

  const handleDownloadPdf = () => {
    if (!translatedText) return;
    exportToPdf(translatedText, `${file?.name.replace(/\.[^/.]+$/, "")}_${targetLang}`);
  };

  const handleDownloadEpub = () => {
    if (!translatedText) return;
    exportToEpub(translatedText, `${file?.name.replace(/\.[^/.]+$/, "")}_${targetLang}`);
  };

  const handleGenerateAudio = () => {
    if (!translatedText) return;
    onQueueForAudio(translatedText, `${file?.name.replace(/\.[^/.]+$/, "")}_${targetLang}`);
  };

  return (
    <div className="w-full space-y-8">
      {!file ? (
        <FileUploader onFilesSelect={handleFileSelect} />
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-primary/10 overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{file.name}</h3>
                <p className="text-sm opacity-50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Languages className="w-4 h-4 text-primary ml-2" />
                <select 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  disabled={status !== 'IDLE' && status !== 'DONE' && status !== 'ERROR'}
                  className="bg-transparent text-sm font-medium border-none focus:ring-0 outline-none pr-8 py-1"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {status === 'IDLE' || status === 'ERROR' ? (
                <div className="flex flex-col md:flex-row gap-2">
                  <button 
                    onClick={startTranslation}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50"
                  >
                    Přeložit dokument
                  </button>

                  {SHOW_CLOUD_FEATURES && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                        <input 
                          type="email"
                          placeholder="Váš e-mail..."
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none w-48"
                        />
                      </div>
                      <button 
                        onClick={handleStartBackgroundJob}
                        disabled={!email}
                        className="p-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 transition-all disabled:opacity-30 group"
                        title="Zpracovat na pozadí a poslat na mail"
                      >
                        <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              ) : status === 'DONE' || status === 'CLOUD_DONE' ? (
                <button 
                  onClick={() => { setFile(null); setTranslatedText(''); setStatus('IDLE'); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Zkusit další
                </button>
              ) : null}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {(status === 'EXTRACTING' || status === 'TRANSLATING' || status === 'CLOUD_SENDING') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Languages className="w-5 h-5 text-primary/50" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">
                      {status === 'EXTRACTING' ? 'Načítám text z dokumentu...' : 
                       status === 'CLOUD_SENDING' ? 'Odesílám do cloudu na pozadí...' : 
                       'AI Překládá dokument...'}
                    </h4>
                    <p className="text-xs opacity-50">
                      {status === 'CLOUD_SENDING' 
                        ? 'Jakmile se dokument odešle, můžete tuto stránku zavřít.' 
                        : 'To může chvíli trvat u delších textů (cca 30s na každých 5 stran).'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'CLOUD_DONE' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="size-16 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-lg text-green-600 dark:text-green-400">Úkol byl přijat!</h4>
                    <p className="text-sm opacity-70 max-w-md mx-auto">
                      Dokument jsme úspěšně odeslali ke zpracování v cloudu. 
                      Až bude hotovo, přijde vám výsledek přímo na e-mail: <br/>
                      <strong className="text-primary">{email}</strong>
                    </p>
                    <p className="text-xs opacity-40 mt-4">Nyní můžete tuto kartu bez obav zavřít.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'DONE' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800"
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold">Dokument byl úspěšně přeložen!</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <button 
                      onClick={handleDownloadPdf}
                      className="flex items-center justify-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group"
                    >
                      <Download className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <div className="font-bold text-sm">Stáhnout PDF</div>
                        <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Přeložená verze</div>
                      </div>
                    </button>

                    <button 
                      onClick={handleDownloadEpub}
                      className="flex items-center justify-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group"
                    >
                      <Download className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <div className="font-bold text-sm">Stáhnout EPUB</div>
                        <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Přeložená verze</div>
                      </div>
                    </button>

                    <button 
                      onClick={handleGenerateAudio}
                      className="flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all group"
                    >
                      <FileAudio className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">Generovat Audio</div>
                        <div className="text-[10px] opacity-70 uppercase tracking-wider font-bold text-white">Převést na řeč</div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'ERROR' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center"
              >
                <div className="flex flex-col items-center gap-3 text-red-500">
                  <AlertCircle className="w-10 h-10" />
                  <div className="font-bold">Něco se nepovedlo při překladu</div>
                  <p className="text-sm opacity-70">Zkuste to prosím znovu nebo nahrát menší soubor.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
