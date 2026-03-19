import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, LogIn, UserPlus, Chrome, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetState = () => {
    setIsForgotPassword(false);
    setError('');
    setMessage(null);
    setIsLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Neplatný e-mail nebo heslo.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Tento e-mail se již používá.');
      } else if (err.code === 'auth/weak-password') {
        setError('Heslo musí mít alespoň 6 znaků.');
      } else {
        setError('Nastala chyba při autentizaci. Zkuste to znovu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage(null);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: 'success', text: 'E-mail pro resetování hesla byl odeslán!' });
    } catch (err: any) {
      console.error("Reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('Uživatel s tímto e-mailem nebyl nalezen.');
      } else {
        setError('Chyba při odesílání e-mailu. Zkuste to znovu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage(null);
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError('Přihlášení přes Google selhalo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl pointer-events-auto border border-primary/10"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>

              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  {isForgotPassword && (
                    <button 
                      onClick={resetState}
                      type="button"
                      className="absolute left-6 top-8 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                    >
                      <ArrowLeft className="size-3" />
                      Zpět
                    </button>
                  )}
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    {isForgotPassword ? 'Reset hesla' : (isLogin ? 'Vítejte zpět' : 'Vytvořit účet')}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isForgotPassword 
                      ? 'Zadejte svůj e-mail a my vám pošleme odkaz pro resetování hesla.'
                      : (isLogin ? 'Přihlaste se a uložte si své přepisy do cloudu.' : 'Získejte přístup k historii svých dokumentů zdarma.')
                    }
                  </p>
                </div>

                {!isForgotPassword && (
                  <>
                    {/* Social Login */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold transition-all hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Chrome className="size-5 text-primary" />
                      <span>Pokračovat přes Google</span>
                    </button>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium tracking-wider">Nebo e-mailem</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Email Form */}
                <form onSubmit={isForgotPassword ? handlePasswordReset : handleEmailAuth} className="space-y-4">
                  {!isLogin && !isForgotPassword && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Jméno</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                          <UserPlus className="size-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Jan Novák"
                          className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">E-mail</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                        <Mail className="size-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vas@email.cz"
                        className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:text-white"
                      />
                    </div>
                  </div>

                  {!isForgotPassword && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Heslo</label>
                        {isLogin && (
                          <button 
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-[10px] font-bold text-primary hover:underline underline-offset-2"
                          >
                            Zapomněli jste heslo?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                          <Lock className="size-4" />
                        </div>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl rounded-l-none border-l-2 border-red-500"
                    >
                      <AlertCircle className="size-4 shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  {message && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-2 p-3 text-sm rounded-xl rounded-l-none border-l-2 ${
                        message.type === 'success' 
                        ? 'text-green-600 bg-green-50 dark:bg-green-500/10 border-green-500' 
                        : 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-500'
                      }`}
                    >
                      <CheckCircle2 className="size-4 shrink-0" />
                      <p>{message.text}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {isLoading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      isForgotPassword ? <Mail className="size-5" /> : (isLogin ? <LogIn className="size-5" /> : <UserPlus className="size-5" />)
                    )}
                    {isForgotPassword ? 'Resetovat heslo' : (isLogin ? 'Přihlásit se' : 'Zaregistrovat se')}
                  </button>
                </form>

                {/* Switch Footer */}
                {!isForgotPassword && (
                  <div className="mt-8 text-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isLogin ? 'Ještě nemáte účet?' : 'Již máte účet?'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                        setMessage(null);
                      }}
                      className="ml-2 font-bold text-primary hover:underline underline-offset-4"
                    >
                      {isLogin ? 'Zaregistrovat se' : 'Přihlásit se'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
