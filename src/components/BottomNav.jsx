import { LayoutGrid, ShoppingCart, Refrigerator, ChefHat, ScanLine } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function BottomNav() {
  const { currentView, setCurrentView } = useApp();

  const navItems = [
    { id: 'fridge', label: 'Fridge', icon: Refrigerator },
    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
    { id: 'shopping', label: 'List', icon: ShoppingCart },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass shadow-lg border-t border-gray-200 z-50">
      <div className="container mx-auto px-2 py-2.5">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${
                  currentView === item.id
                    ? 'text-indigo-500 bg-indigo-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ItemIcon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setCurrentView('scan')}
            className="flex flex-col items-center gap-0.5 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-500/40 transform hover:scale-105 active:scale-95 transition-all"
          >
            <ScanLine className="w-6 h-6" />
            <span className="text-[10px] font-bold">Scan</span>
          </button>
        </div>
      </div>
    </nav>
  );
}