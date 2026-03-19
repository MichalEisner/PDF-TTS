import { LayoutDashboard, History, Folder, Settings, PieChart } from 'lucide-react';

export const Sidebar = () => {
  const menuItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Přehled', active: true },
    { icon: <History size={18} />, label: 'Historie', active: false },
    { icon: <Folder size={18} />, label: 'Moje soubory', active: false },
    { icon: <Settings size={18} />, label: 'Nastavení', active: false },
  ];

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 px-8 mb-10">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <PieChart size={22} />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-900">PDF Master</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl cursor-pointer transition-all ${
              item.active 
                ? 'bg-[#e7f1ff] text-[#1d7af2] font-bold shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {item.icon}
            <span className="text-sm font-semibold">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="px-6 mb-4">
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Využití úložiště</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '45%' }}></div>
          </div>
          <div className="text-[10px] text-slate-500 font-bold">
            450 MB z 1 GB
          </div>
        </div>
      </div>
    </aside>
  );
};
