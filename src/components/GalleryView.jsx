import { useState } from 'react';
import { X, Trash2, Calendar, ShoppingCart, ImageOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getDaysUntilExpiry, getExpiryStatus, formatDate } from '../utils/productUtils';

// Small colored dot used as a quick-glance traffic-light indicator
function StatusDot({ status }) {
  const dotColor =
    status.color === 'badge-success' ? 'bg-green-500' :
    status.color === 'badge-warning' ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <span
      className={`absolute top-2 right-2 w-5 h-5 rounded-full ${dotColor} border-2 border-white shadow-md`}
      title={status.text}
    />
  );
}

export default function GalleryView() {
  const { products, removeProduct, addShoppingItem } = useApp();
  const [selectedProduct, setSelectedProduct] = useState(null);

  const sortedProducts = [...products].sort((a, b) =>
    new Date(a.expiryDate) - new Date(b.expiryDate)
  );

  const handleRemove = (id, name) => {
    if (window.confirm(`Remove "${name}" from your fridge?`)) {
      removeProduct(id);
      setSelectedProduct(null);
    }
  };

  const handleAddToShoppingList = (name) => {
    addShoppingItem(name, 'manual');
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
          <ImageOff className="w-full h-full" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Your gallery is empty
        </h2>
        <p className="text-gray-600">
          Scan a product to start filling your virtual fridge
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Gallery ({products.length})
        </h2>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> OK
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Soon
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Urgent
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {sortedProducts.map((product, index) => {
          const daysLeft = getDaysUntilExpiry(product.expiryDate);
          const status = getExpiryStatus(daysLeft);

          return (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="card relative overflow-hidden text-left animate-fade-in"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageOff className="w-10 h-10" />
                  </div>
                )}
                <StatusDot status={status} />
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {status.icon} {status.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="card max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="w-full h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <ImageOff className="w-16 h-16 text-gray-300" />
                )}
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {selectedProduct.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{selectedProduct.brand}</p>

              {(() => {
                const daysLeft = getDaysUntilExpiry(selectedProduct.expiryDate);
                const status = getExpiryStatus(daysLeft);
                return (
                  <div className="flex items-center justify-between mb-5">
                    <span className={`badge ${status.color}`}>
                      <span>{status.icon}</span>
                      <span>{status.text}</span>
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(selectedProduct.expiryDate)}
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => handleAddToShoppingList(selectedProduct.name)}
                  className="btn btn-secondary flex-1"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to list</span>
                </button>
                <button
                  onClick={() => handleRemove(selectedProduct.id, selectedProduct.name)}
                  className="btn btn-danger flex-1"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
