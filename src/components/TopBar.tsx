import { Search, Bell, User } from 'lucide-react';

export const TopBar = () => {
  return (
    <header className="top-bar">
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Hledat soubory..."
            className="w-full bg-[#f8f9fa] border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative p-2.5 bg-slate-50 text-slate-500 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </div>
        <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-50 shadow-sm cursor-pointer">
             <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white">
                <User size={20} />
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};
