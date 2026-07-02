import { useState } from 'react';
import { Plus, Calendar, Bell, CheckCircle, PenLine } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getTodayString } from '../utils/productUtils';

export default function AddProductView() {
  const { scannedProduct, addProduct, setScannedProduct, setCurrentView } = useApp();
  const [expiryDate, setExpiryDate] = useState('');
  const [reminderDays, setReminderDays] = useState(3);
  const [quantity, setQuantity] = useState(1);

  if (!scannedProduct) {
    setCurrentView('fridge');
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!expiryDate) return;
    addProduct({
      ...scannedProduct,
      expiryDate,
      reminderDays: parseInt(reminderDays),
      quantity: parseInt(quantity),
      addedDate: new Date().toISOString(),
    });
    setScannedProduct(null);
    setCurrentView('fridge');
  };

  const handleCancel = () => {
    setScannedProduct(null);
    setCurrentView('scan');
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Info prodotto */}
      <div className="card overflow-hidden">
        <div className={`text-white p-5 flex items-center gap-3 ${scannedProduct.isManual ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
          {scannedProduct.isManual
            ? <PenLine className="w-6 h-6" />
            : <CheckCircle className="w-6 h-6" />
          }
          <h2 className="text-lg font-bold">
            {scannedProduct.isManual ? 'Prodotto manuale' : 'Prodotto trovato!'}
          </h2>
        </div>

        <div className="p-6">
          {scannedProduct.image && (
            <div className="mb-5">
              <img
                src={scannedProduct.image}
                alt={scannedProduct.name}
                className="w-full h-48 object-contain bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4"
              />
            </div>
          )}

          <h3 className="text-xl font-bold text-gray-900 mb-3">{scannedProduct.name}</h3>

          <div className="space-y-2 text-sm text-gray-600">
            {scannedProduct.brand && (
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24">Marca:</span>
                <span>{scannedProduct.brand}</span>
              </div>
            )}
            {scannedProduct.barcode && (
              <div className="flex">
                <span className="font-semibold text-gray-700 w-24">Barcode:</span>
                <span className="font-mono text-xs">{scannedProduct.barcode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5">Dettagli prodotto</h3>

          <div className="space-y-5">

            {/* Quantità — PRIMA della scadenza */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Plus className="w-4 h-4" />
                Quantità
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-2xl font-bold text-gray-700 transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-3xl font-bold text-gray-900 w-10 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(99, q + 1))}
                  className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-2xl font-bold text-gray-700 transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Data di scadenza */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                Data di scadenza *
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                min={getTodayString()}
                required
                className="input"
              />
            </div>

            {/* Avviso */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Bell className="w-4 h-4" />
                Avvisami (giorni prima)
              </label>
              <select
                value={reminderDays}
                onChange={e => setReminderDays(e.target.value)}
                className="input"
              >
                <option value="1">1 giorno prima</option>
                <option value="2">2 giorni prima</option>
                <option value="3">3 giorni prima</option>
                <option value="5">5 giorni prima</option>
                <option value="7">7 giorni prima</option>
                <option value="10">10 giorni prima</option>
                <option value="14">14 giorni prima</option>
              </select>
            </div>

            {/* Bottoni */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleCancel} className="btn btn-secondary flex-1">
                Annulla
              </button>
              <button type="submit" disabled={!expiryDate} className="btn btn-primary flex-1">
                <Plus className="w-5 h-5" />
                <span>Aggiungi al frigo</span>
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
