import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Capacitor } from '@capacitor/core';
import { X, Search, Camera, Lightbulb, ScanLine, PenLine, ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { fetchProductInfo } from '../utils/productUtils';

const IS_NATIVE = Capacitor.isNativePlatform();

export default function ScanView() {
  const { setScannedProduct, setCurrentView } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Form inserimento manuale prodotto
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const html5QrCodeRef = useRef(null);
  const videoStreamRef = useRef(null);

  const cleanupCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        if (scanner.isScanning) await scanner.stop();
        await scanner.clear();
        html5QrCodeRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false; });
        videoStreamRef.current = null;
      }
      const video = document.querySelector('#reader video');
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        video.load();
      }
      const readerDiv = document.getElementById('reader');
      if (readerDiv) readerDiv.innerHTML = '';
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  useEffect(() => () => { cleanupCamera(); }, []);

  // Prodotto trovato → vai ad AddProductView
  const goToAddProduct = (productInfo) => {
    setScannedProduct(productInfo);
    setCurrentView('add');
  };

  // Prodotto non trovato → mostra form manuale
  const handleNotFound = () => {
    setError(null);
    setShowManualForm(true);
  };

  // Conferma inserimento manuale
  const handleManualProductSubmit = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    goToAddProduct({
      name: manualName.trim(),
      brand: manualBrand.trim() || '',
      image: null,
      quantity: '',
      barcode: null,
      isManual: true,
    });
  };

  const handleBarcodeScanned = async (barcode) => {
    setIsLoading(true);
    setError(null);
    try {
      const productInfo = await fetchProductInfo(barcode);
      if (productInfo) {
        goToAddProduct(productInfo);
      } else {
        handleNotFound();
      }
    } catch {
      setError('Errore nel recupero del prodotto. Controlla la connessione.');
    } finally {
      setIsLoading(false);
    }
  };

  const scanWithNativeCamera = async () => {
    setIsCapturing(true);
    setError(null);
    setShowManualForm(false);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (!photo.dataUrl) throw new Error('Nessuna foto acquisita');

      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'scan.jpg', { type: blob.type || 'image/jpeg' });

      const readerId = 'native-barcode-reader';
      let readerDiv = document.getElementById(readerId);
      if (!readerDiv) {
        readerDiv = document.createElement('div');
        readerDiv.id = readerId;
        readerDiv.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:400px;height:400px;';
        document.body.appendChild(readerDiv);
      }

      const decoder = new Html5Qrcode(readerId);
      try {
        const result = await decoder.scanFileV2(file, false);
        await handleBarcodeScanned(result.decodedText);
      } catch {
        setError('Codice a barre non trovato nella foto. Avvicinati e riprova oppure inserisci il prodotto manualmente.');
      } finally {
        try { await decoder.clear(); } catch (_) {}
      }
    } catch (err) {
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismissed')) {
        setError('Errore fotocamera: ' + msg);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const startWebScanner = async () => {
    if (isScanning) return;
    setError(null);
    setShowManualForm(false);
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 100));
    if (!document.getElementById('reader')) {
      setError('Inizializzazione scanner fallita. Riprova.');
      setIsScanning(false);
      return;
    }
    try {
      const html5QrCode = new Html5Qrcode('reader');
      html5QrCodeRef.current = html5QrCode;
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) throw new Error('Nessuna fotocamera trovata');
      const back = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      const cameraId = back ? back.id : devices[devices.length - 1].id;
      await html5QrCode.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => { await stopWebScanner(); await handleBarcodeScanned(decoded); }
      );
    } catch (err) {
      await cleanupCamera();
      let msg = 'Impossibile accedere alla fotocamera. ';
      if (err.name === 'NotAllowedError') msg += 'Abilita i permessi della fotocamera.';
      else if (err.name === 'NotFoundError') msg += 'Nessuna fotocamera rilevata.';
      else msg += 'Riprova o usa l\'inserimento manuale.';
      setError(msg);
      setIsScanning(false);
    }
  };

  const stopWebScanner = async () => { await cleanupCamera(); setIsScanning(false); };

  const handleManualBarcodeSearch = async () => {
    const barcode = manualBarcode.trim();
    if (!barcode) return;
    setIsLoading(true);
    setError(null);
    setShowManualForm(false);
    try {
      const productInfo = await fetchProductInfo(barcode);
      if (productInfo) {
        goToAddProduct(productInfo);
      } else {
        setManualBarcode('');
        handleNotFound();
      }
    } catch {
      setError('Errore nel recupero del prodotto. Controlla la connessione.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Form inserimento manuale prodotto ────────────────────────────────────────
  if (showManualForm) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="card">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5">
            <h2 className="text-lg font-bold">Prodotto non trovato</h2>
            <p className="text-sm text-white/80 mt-1">Inserisci i dati manualmente</p>
          </div>
          <form onSubmit={handleManualProductSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome prodotto *
              </label>
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Es. Latte intero, Pasta barilla..."
                className="input"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Marca (opzionale)
              </label>
              <input
                type="text"
                value={manualBrand}
                onChange={e => setManualBrand(e.target.value)}
                placeholder="Es. Barilla, Muller..."
                className="input"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="btn btn-secondary flex-1"
              >
                Indietro
              </button>
              <button
                type="submit"
                disabled={!manualName.trim()}
                className="btn btn-primary flex-1"
              >
                <ArrowRight className="w-5 h-5" />
                <span>Continua</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Schermata principale scanner ─────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Scansiona Barcode</h2>

          {IS_NATIVE ? (
            <div className="text-center py-10">
              <ScanLine className="w-20 h-20 mx-auto mb-4 text-indigo-300" />
              <p className="text-gray-600 mb-2 font-medium">
                Scatta una foto al codice a barre del prodotto
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Avvicinati, tieni fermo e assicurati che il codice sia ben illuminato
              </p>
              <button
                onClick={scanWithNativeCamera}
                disabled={isCapturing || isLoading}
                className="btn btn-primary"
              >
                {isCapturing
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-5 h-5" />
                }
                <span>{isCapturing ? 'Apertura fotocamera...' : 'Apri Fotocamera'}</span>
              </button>
            </div>
          ) : (
            !isScanning ? (
              <div className="text-center py-12">
                <Camera className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-6">Punta la fotocamera verso il barcode</p>
                <button onClick={startWebScanner} disabled={isLoading} className="btn btn-primary">
                  <Camera className="w-5 h-5" />
                  <span>Avvia Fotocamera</span>
                </button>
              </div>
            ) : (
              <div>
                <div id="reader" className="mb-4" />
                <button onClick={stopWebScanner} className="btn btn-danger w-full">
                  <X className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              </div>
            )
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Codice manuale */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Inserisci Codice Manualmente</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleManualBarcodeSearch()}
              placeholder="Es. 3017620422003"
              className="input flex-1"
              disabled={isLoading}
              inputMode="numeric"
            />
            <button
              onClick={handleManualBarcodeSearch}
              disabled={isLoading || !manualBarcode.trim()}
              className="btn btn-primary"
            >
              {isLoading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Search className="w-5 h-5" />
              }
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
            <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
            <span>Prova con <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">3017620422003</code> (Nutella)</span>
          </div>
        </div>
      </div>

      {/* Inserimento diretto senza barcode */}
      <button
        onClick={() => setShowManualForm(true)}
        className="w-full card p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <PenLine className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Aggiungi senza barcode</p>
          <p className="text-xs text-gray-500">Inserisci nome e marca manualmente</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
      </button>
    </div>
  );
}
