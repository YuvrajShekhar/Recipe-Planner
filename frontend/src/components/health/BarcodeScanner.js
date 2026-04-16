import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { healthAPI } from '../../services/api';
import '../../styles/Health.css';

// ── Open Food Facts lookup ────────────────────────────────────────────────────

async function fetchProductByBarcode(barcode) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  const data = await res.json();
  if (data.status !== 1) return null;

  const p = data.product;
  const n = p.nutriments || {};

  // Prefer per-serving values; fall back to per-100g scaled by serving_quantity
  const servingQty = parseFloat(p.serving_quantity) || null;

  const perServing = (key100g, keyServing) => {
    if (n[keyServing] != null) return parseFloat(n[keyServing]);
    if (n[key100g] != null && servingQty) return (parseFloat(n[key100g]) * servingQty) / 100;
    return 0;
  };

  return {
    name: p.product_name || p.abbreviated_product_name || 'Unknown Product',
    brand: p.brands || '',
    serving_size: p.serving_size || (servingQty ? `${servingQty}g` : ''),
    per_serving: {
      calories: perServing('energy-kcal_100g', 'energy-kcal_serving'),
      protein:  perServing('proteins_100g',    'proteins_serving'),
      carbs:    perServing('carbohydrates_100g','carbohydrates_serving'),
      fat:      perServing('fat_100g',         'fat_serving'),
      fiber:    perServing('fiber_100g',       'fiber_serving'),
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const BarcodeScanner = ({ onSubmit, onCancel, selectedDate }) => {
  // phase: 'idle' | 'scanning' | 'loading' | 'review' | 'error'
  const [phase, setPhase]       = useState('idle');
  const [product, setProduct]   = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes]       = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const videoRef   = useRef(null);
  const readerRef  = useRef(null);
  const controlsRef = useRef(null);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // ── Start camera / scanning ─────────────────────────────────────────────

  const startScanning = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg(
        'Camera access is not available. This feature requires a secure connection (HTTPS). ' +
        'Please use the production site or access via localhost.'
      );
      setPhase('error');
      return;
    }
    setPhase('scanning');
    setErrorMsg('');
  };

  useEffect(() => {
    if (phase !== 'scanning') return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    let stopped = false;

    const run = async () => {
      try {
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,          // use default (rear) camera
          videoRef.current,
          async (result, err) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              // Stop the camera stream
              if (controlsRef.current) controlsRef.current.stop();
              const barcode = result.getText();
              setPhase('loading');
              try {
                const info = await fetchProductByBarcode(barcode);
                if (!info) {
                  setErrorMsg(`No product found for barcode ${barcode}. Try a different item or add manually.`);
                  setPhase('error');
                } else {
                  setProduct(info);
                  setQuantity(1);
                  setPhase('review');
                }
              } catch {
                setErrorMsg('Failed to fetch product info. Check your connection and try again.');
                setPhase('error');
              }
            }
            if (err && !(err instanceof NotFoundException)) {
              // NotFoundException is normal (no barcode in frame yet) — ignore it
              console.error('Scanner error:', err);
            }
          }
        );
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Camera access was denied. Please allow camera permission in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('No camera found on this device.');
        } else {
          setErrorMsg(`Camera error: ${err.message}`);
        }
        setPhase('error');
      }
    };

    run();

    return () => {
      stopped = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
      }
    };
  }, [phase]);

  // ── Submit log entry ─────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product || quantity <= 0) return;

    const qty = parseFloat(quantity);
    const n = product.per_serving;

    setSubmitting(true);
    try {
      await healthAPI.createLog({
        date:      formatDate(selectedDate),
        dish_name: product.brand
          ? `${product.name} (${product.brand})`
          : product.name,
        calories: parseFloat((n.calories * qty).toFixed(2)),
        protein:  parseFloat((n.protein  * qty).toFixed(2)),
        carbs:    parseFloat((n.carbs    * qty).toFixed(2)),
        fat:      parseFloat((n.fat      * qty).toFixed(2)),
        fiber:    parseFloat((n.fiber    * qty).toFixed(2)),
        notes,
      });
      onSubmit();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setProduct(null);
    setErrorMsg('');
    setPhase('scanning');
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const qty = parseFloat(quantity) || 0;
  const n   = product?.per_serving;

  return (
    <div className="barcode-scanner-wrap">
      <h3>Scan Item</h3>

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div className="scanner-idle">
          <p>Point your camera at the barcode on the packaging.</p>
          <p className="scanner-hint">
            Nutrition details will be pulled automatically from the product database.
          </p>
          <div className="scanner-idle-actions">
            <button className="btn btn-primary" onClick={startScanning}>
              Start Camera
            </button>
            <button className="btn btn-outline" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Scanning ── */}
      {phase === 'scanning' && (
        <div className="scanner-active">
          <div className="scanner-video-wrap">
            <video ref={videoRef} className="scanner-video" autoPlay muted playsInline />
            <div className="scanner-overlay">
              <div className="scanner-crosshair" />
              <p className="scanner-tip">Align the barcode within the frame</p>
            </div>
          </div>
          <button className="btn btn-outline scanner-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {phase === 'loading' && (
        <div className="scanner-loading">
          <div className="scanner-spinner" />
          <p>Looking up product...</p>
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && (
        <div className="scanner-error-state">
          <p className="scanner-error-msg">{errorMsg}</p>
          <div className="scanner-idle-actions">
            <button className="btn btn-primary" onClick={handleRetry}>Try Again</button>
            <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Review ── */}
      {phase === 'review' && product && (
        <form className="scanner-review" onSubmit={handleSubmit}>
          <div className="product-info-box">
            <p className="product-name">{product.name}</p>
            {product.brand && <p className="product-brand">{product.brand}</p>}
            {product.serving_size && (
              <p className="product-serving">Serving size: {product.serving_size}</p>
            )}
          </div>

          <div className="form-group">
            <label>
              How many servings did you eat?
              {product.serving_size && (
                <span className="scanner-serving-hint"> (1 serving = {product.serving_size})</span>
              )}
            </label>
            <input
              className="form-control"
              type="number"
              min="0.1"
              step="0.1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>

          <div className="scanner-nutrition-preview">
            <h4>Nutrition for {qty.toFixed(1)} serving{qty !== 1 ? 's' : ''}</h4>
            <div className="nutrition-preview-grid">
              <div className="nutrient-cell">
                <span className="nutrient-val">{(n.calories * qty).toFixed(0)}</span>
                <span className="nutrient-label">kcal</span>
              </div>
              <div className="nutrient-cell">
                <span className="nutrient-val">{(n.protein * qty).toFixed(1)}g</span>
                <span className="nutrient-label">Protein</span>
              </div>
              <div className="nutrient-cell">
                <span className="nutrient-val">{(n.carbs * qty).toFixed(1)}g</span>
                <span className="nutrient-label">Carbs</span>
              </div>
              <div className="nutrient-cell">
                <span className="nutrient-val">{(n.fat * qty).toFixed(1)}g</span>
                <span className="nutrient-label">Fat</span>
              </div>
              <div className="nutrient-cell">
                <span className="nutrient-val">{(n.fiber * qty).toFixed(1)}g</span>
                <span className="nutrient-label">Fiber</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <input
              className="form-control"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. chocolate flavour"
            />
          </div>

          {errorMsg && <p className="scanner-error-msg">{errorMsg}</p>}

          <div className="fridge-entry-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Logging...' : 'Log Entry'}
            </button>
            <button type="button" className="btn btn-outline" onClick={handleRetry}>
              Scan Again
            </button>
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BarcodeScanner;
