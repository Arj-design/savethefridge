import { useState, useMemo } from 'react';
import { Plus, Trash2, ShoppingCart, X, Sparkles, CheckCircle2, Circle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getDaysUntilExpiry } from '../utils/productUtils';

export default function ShoppingListView() {
  const {
    products,
    shoppingList,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearCheckedShoppingItems,
    removedHistory,
    dismissedSuggestions,
    dismissSuggestion
  } = useApp();

  const [newItem, setNewItem] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    addShoppingItem(newItem, 'manual');
    setNewItem('');
  };

  // Build the suggestion list: recently removed products + currently expired
  // ones still sitting in the fridge, minus items already in the list and
  // minus suggestions the user dismissed.
  const suggestions = useMemo(() => {
    const inListNames = new Set(
      shoppingList.filter(i => !i.checked).map(i => i.name.toLowerCase())
    );
    const dismissedSet = new Set(dismissedSuggestions);

    const fromExpired = products
      .filter(p => getDaysUntilExpiry(p.expiryDate) < 0)
      .map(p => ({
        name: p.name,
        reason: 'Expired in your fridge'
      }));

    const fromRemoved = removedHistory.map(item => ({
      name: item.name,
      reason: 'Recently removed'
    }));

    const combined = [...fromExpired, ...fromRemoved];
    const seen = new Set();
    const deduped = [];

    for (const item of combined) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      if (inListNames.has(key)) continue;
      if (dismissedSet.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return deduped.slice(0, 8);
  }, [products, removedHistory, shoppingList, dismissedSuggestions]);

  const uncheckedItems = shoppingList.filter(i => !i.checked);
  const checkedItems = shoppingList.filter(i => i.checked);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-indigo-500" />
          Shopping List
        </h2>
        {checkedItems.length > 0 && (
          <button
            onClick={clearCheckedShoppingItems}
            className="text-sm font-medium text-red-500 hover:text-red-600"
          >
            Clear bought
          </button>
        )}
      </div>

      {/* Add item form */}
      <form onSubmit={handleAdd} className="card">
        <div className="p-4 flex gap-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item..."
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!newItem.trim()}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="card">
          <div className="p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Suggested for you
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full pl-3 pr-1.5 py-1.5"
                >
                  <span className="text-sm text-indigo-900 capitalize">{s.name}</span>
                  <button
                    onClick={() => addShoppingItem(s.name, 'auto')}
                    className="p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                    title={s.reason}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => dismissSuggestion(s.name)}
                    className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {shoppingList.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Your shopping list is empty
          </h3>
          <p className="text-gray-600 text-sm">
            Add items manually or use a suggestion above
          </p>
        </div>
      ) : (
        <div className="card">
          <ul className="divide-y divide-gray-100">
            {uncheckedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleShoppingItem(item.id)}
                  className="text-gray-300 hover:text-indigo-500 transition-colors"
                >
                  <Circle className="w-5 h-5" />
                </button>
                <span className="flex-1 text-gray-900">{item.name}</span>
                {item.source === 'auto' && (
                  <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                    suggested
                  </span>
                )}
                <button
                  onClick={() => removeShoppingItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}

            {checkedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-4 bg-gray-50/60">
                <button
                  onClick={() => toggleShoppingItem(item.id)}
                  className="text-green-500"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <span className="flex-1 text-gray-400 line-through">{item.name}</span>
                <button
                  onClick={() => removeShoppingItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
