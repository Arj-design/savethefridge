import { useState, useMemo } from 'react';
import { X, Trash2, Calendar, ShoppingCart, ImageOff, Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getDaysUntilExpiry, getExpiryStatus, formatDate } from '../utils/productUtils';

function StatusDot({ status }) {
  const dotColor =
    status.color === 'badge-success' ? 'bg-green-500' :
    status.color === 'badge-warning' ? 'bg-yellow-400' :
    'bg-red-500';
  return (
    <span
      className={`absolute top-2 right-2 w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow`}
      title={status.text}
    />
  );
}

const SORT_OPTIONS = [
  { value: 'expiry_asc', label: 'Scadenza ↑' },
  { value: 'expiry_desc', label: 'Scadenza ↓' },
  { value: 'name_asc', label: 'Nome A→Z' },
  { value: 'name_desc', label: 'Nome Z→A' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tutti', color: 'bg-gray-100 text-gray-700' },
  { value: 'ok', label: '🟢 OK', color: 'bg-green-100 text-green-700' },
  { value: 'soon', label: '🟡 In scadenza', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'urgent', label: '🔴 Urgente', color: 'bg-red-100 text-red-700' },
];

export default function GalleryView() {
  const { products, removeProduct, addShoppingItem } = useApp();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('expiry_asc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const processed = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    if (filter !== 'all') {
      list = list.filter(p => {
        const days = getDaysUntilExpiry(p.expiryDate);
        const status = getExpiryStatus(days);
        if (filter === 'ok') return status.color === 'badge-success';
        if (filter === 'soon') return status.color === 'badge-warning';
        if (filter === 'urgent') return status.color === 'badge-danger';
        return true;
      });
    }

    list.sort((a, b) => {
      if (sort === 'expiry_asc') return new Date(a.expiryDate) - new Date(b.expiryDate);
      if (sort === 'expiry_desc') return new Date(b.expiryDate) - new Date(a.expiryDate);
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      if (sort === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });

    return list;
  }, [products, search, filter, sort]);

  const handleRemove = (id, name) => {
    if (window.confirm(`Rimuovere "${name}" dal frigo?`)) {
      removeProduct(id);
      setSelectedProduct(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <ImageOff className="w-24 h-24 mx-auto mb-6 text-gray-300" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Frigo vuoto</h2>
        <p className="text-gray-600">Scansiona un prodotto per iniziare</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Apri Frigo ({processed.length}/{products.length})
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/>OK</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"/>Presto</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"/>Urgente</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca prodotto..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(v => !v)}
            className="btn btn-secondary px-3"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-36 overflow-hidden">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${sort === opt.value ? 'text-indigo-600 font-semibold' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === opt.value
                ? opt.color + ' ring-2 ring-offset-1 ring-indigo-300'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {processed.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nessun prodotto trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {processed.map((product, index) => {
            const daysLeft = getDaysUntilExpiry(product.expiryDate);
            const status = getExpiryStatus(daysLeft);
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="card relative overflow-hidden text-left animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageOff className="w-10 h-10" />
                    </div>
                  )}
                  <StatusDot status={status} />
                  {product.quantity > 1 && (
                    <span className="absolute bottom-1.5 left-1.5 bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      x{product.quantity}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-semibold text-gray-900 text-xs truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{status.icon} {status.text}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div className="card max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <div className="w-full h-52 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                {selectedProduct.image
                  ? <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain p-4" />
                  : <ImageOff className="w-16 h-16 text-gray-300" />
                }
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="p-5">
              <h3 className="text-xl font-bold text-gray-900 mb-0.5">{selectedProduct.name}</h3>
              <p className="text-sm text-gray-500 mb-1">{selectedProduct.brand}</p>
              {selectedProduct.quantity > 1 && (
                <p className="text-sm text-indigo-600 font-medium mb-3">Quantità: {selectedProduct.quantity}</p>
              )}

              {(() => {
                const daysLeft = getDaysUntilExpiry(selectedProduct.expiryDate);
                const status = getExpiryStatus(daysLeft);
                return (
                  <div className="flex items-center justify-between mb-5">
                    <span className={`badge ${status.color}`}>{status.icon} {status.text}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(selectedProduct.expiryDate)}
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => { addShoppingItem(selectedProduct.name, 'manual'); setSelectedProduct(null); }}
                  className="btn btn-secondary flex-1"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Lista spesa</span>
                </button>
                <button
                  onClick={() => handleRemove(selectedProduct.id, selectedProduct.name)}
                  className="btn btn-danger flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Rimuovi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
