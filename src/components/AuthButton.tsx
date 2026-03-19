import { useState, useEffect } from 'react';
import { User, LogIn, LogOut, ChevronDown, UserCircle } from 'lucide-react';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthButtonProps {
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  customPhotoURL?: string;
}

export const AuthButton = ({ onOpenAuth, onOpenProfile, customPhotoURL }: AuthButtonProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!user) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all active:scale-[0.98]"
      >
        <LogIn className="size-4" />
        <span>Přihlásit se</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all active:scale-[0.98]"
      >
        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden border border-primary/10">
          {customPhotoURL || user.photoURL ? (
            <img src={customPhotoURL || user.photoURL || ''} alt={user.displayName || 'User'} className="size-full object-cover" />
          ) : (
            <User className="size-5" />
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-none text-left">
          <span className="text-xs font-bold truncate max-w-[100px]">
            {user.displayName || user.email?.split('@')[0] || 'Uživatel'}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Profil</span>
        </div>
        <ChevronDown className={`size-3 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-56 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Účet</p>
                <p className="text-sm font-semibold truncate">{user.email}</p>
              </div>

              <button
                onClick={() => {
                  onOpenProfile();
                  setIsMenuOpen(false);
                }}
                className="w-full h-10 flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group"
              >
                <UserCircle className="size-4 group-hover:text-primary transition-colors" />
                <span className="group-hover:text-primary transition-colors">Můj Profil</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full h-10 flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors group"
              >
                <LogOut className="size-4 group-hover:translate-x-0.5 transition-transform" />
                <span>Odhlásit se</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
