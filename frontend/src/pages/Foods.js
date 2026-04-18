import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { foodAPI, foodPantryAPI } from '../services/api';
import { fetchProductByBarcode } from '../services/openFoodFacts';
import '../styles/Foods.css';

const CATEGORIES = [
  'fruit', 'vegetable', 'dairy', 'meat', 'grain', 'snack', 'beverage', 'packaged', 'other',
];

const EMPTY_MANUAL = {
  name: '', brand: '', category: 'other', serving_description: '1 serving',
  calories: '', protein: '', carbs: '', fat: '', fiber: '', quantity: 1,
};

// ── Scanner hook ──────────────────────────────────────────────────────────────

function useScanner(onDetected) {
  const videoRef     = useRef(null);
  const controlsRef  = useRef(null);
  const [active, setActive]     = useState(false);
  const [camError, setCamError] = useState('');

  const start = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Camera requires HTTPS. Use the production site or localhost.');
      return;
    }
    setCamError('');
    setActive(true);
  };

  const stop = () => {
    try { controlsRef.current?.stop(); } catch {}
    setActive(false);
  };

  useEffect(() => {
    if (!active || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
      if (stopped) return;
      if (result) {
        stopped = true;
        try { controlsRef.current?.stop(); } catch {}
        setActive(false);
        onDetected(result.getText());
      }
      if (err && !(err instanceof NotFoundException)) console.error(err);
    }).then(c => { controlsRef.current = c; }).catch(e => {
      setCamError(e.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera in browser settings.'
        : `Camera error: ${e.message}`);
      setActive(false);
    });

    return () => {
      stopped = true;
      try { controlsRef.current?.stop(); } catch {}
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, active, camError, start, stop };
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Foods = () => {
  // All food items the user has ever created
  const [allFoods,  setAllFoods]  = useState([]);
  // Map: food_item_id → pantry entry (quantity in stock)
  const [stockMap,  setStockMap]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // 'stock' | 'all'
  const [tab, setTab] = useState('stock');

  // Add modal: null | 'scan' | 'manual'
  const [addMode, setAddMode] = useState(null);

  // Scan flow
  const [scanPhase,   setScanPhase]   = useState('scanning');
  const [scanProduct, setScanProduct] = useState(null);
  const [scanQty,     setScanQty]     = useState(1);
  const [scanError,   setScanError]   = useState('');
  const [scanSaving,  setScanSaving]  = useState(false);

  // Manual form
  const [manualForm,   setManualForm]   = useState(EMPTY_MANUAL);
  const [manualError,  setManualError]  = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  // Inline qty editor
  const [editingId, setEditingId] = useState(null);
  const [editQty,   setEditQty]   = useState('');

  // ── Scanner ─────────────────────────────────────────────────────────────

  const scanner = useScanner(async (barcode) => {
    setScanPhase('fetching');
    setScanError('');
    try {
      const product = await fetchProductByBarcode(barcode);
      if (!product) {
        setScanError(`No product found for barcode ${barcode}. Try another item or add manually.`);
        setScanPhase('scanning');
      } else {
        setScanProduct(product);
        setScanQty(1);
        setScanPhase('review');
      }
    } catch {
      setScanError('Failed to fetch product info. Check your connection.');
      setScanPhase('scanning');
    }
  });

  // ── Load data ────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      setLoading(true);
      const [foodsRes, pantryRes] = await Promise.all([
        foodAPI.getAll(),
        foodPantryAPI.getAll(),
      ]);
      setAllFoods(foodsRes.data.food_items || []);
      const map = {};
      (pantryRes.data.pantry || []).forEach(p => {
        map[p.food_item.id] = p;
      });
      setStockMap(map);
    } catch {
      setError('Failed to load food items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived lists ────────────────────────────────────────────────────────

  const inStockFoods = allFoods.filter(fi => stockMap[fi.id]);

  const displayedFoods = tab === 'stock' ? inStockFoods : allFoods;

  // ── Open modals ──────────────────────────────────────────────────────────

  const openScan = () => {
    setScanPhase('scanning');
    setScanProduct(null);
    setScanError('');
    setAddMode('scan');
    setTimeout(() => scanner.start(), 100);
  };

  const openManual = () => {
    setManualForm(EMPTY_MANUAL);
    setManualError('');
    setAddMode('manual');
  };

  const closeModal = () => {
    scanner.stop();
    setAddMode(null);
    setScanPhase('scanning');
    setScanProduct(null);
  };

  // ── Save scanned item ────────────────────────────────────────────────────

  const handleSaveScan = async () => {
    if (!scanProduct) return;
    setScanSaving(true);
    setScanError('');
    try {
      const p = scanProduct;
      await foodAPI.create({
        name:                p.name,
        brand:               p.brand,
        barcode:             p.barcode,
        category:            'packaged',
        serving_description: p.serving_size || '1 serving',
        calories:            p.per_serving.calories,
        protein:             p.per_serving.protein,
        carbs:               p.per_serving.carbs,
        fat:                 p.per_serving.fat,
        fiber:               p.per_serving.fiber,
        thumbnail_url:       p.thumbnail_url || '',
        quantity:            parseFloat(scanQty),
      });
      closeModal();
      await loadData();
    } catch (err) {
      setScanError(err.response?.data?.error || 'Failed to save item.');
    } finally {
      setScanSaving(false);
    }
  };

  // ── Save manual item ─────────────────────────────────────────────────────

  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualForm.name.trim()) { setManualError('Name is required.'); return; }
    if (!manualForm.quantity || manualForm.quantity <= 0) {
      setManualError('Quantity must be greater than 0.'); return;
    }
    setManualSaving(true);
    setManualError('');
    try {
      await foodAPI.create({
        ...manualForm,
        calories: parseFloat(manualForm.calories) || 0,
        protein:  parseFloat(manualForm.protein)  || 0,
        carbs:    parseFloat(manualForm.carbs)    || 0,
        fat:      parseFloat(manualForm.fat)       || 0,
        fiber:    parseFloat(manualForm.fiber)     || 0,
        quantity: parseFloat(manualForm.quantity),
      });
      closeModal();
      await loadData();
    } catch (err) {
      setManualError(err.response?.data?.error || 'Failed to save item.');
    } finally {
      setManualSaving(false);
    }
  };

  // ── Qty editing (only for in-stock items) ────────────────────────────────

  const startEdit = (pantryEntry) => {
    setEditingId(pantryEntry.id);
    setEditQty(String(parseFloat(pantryEntry.quantity)));
  };

  const saveEdit = async (pantryEntry) => {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) { setEditingId(null); return; }
    try {
      await foodPantryAPI.update(pantryEntry.id, qty);
      setStockMap(m => ({ ...m, [pantryEntry.food_item.id]: { ...pantryEntry, quantity: qty } }));
    } catch { setError('Failed to update quantity.'); }
    setEditingId(null);
  };

  const handleRemoveFromStock = async (pantryEntry) => {
    if (!window.confirm(`Remove "${pantryEntry.food_item.name}" from stock? The item stays in All Foods.`)) return;
    try {
      await foodPantryAPI.remove(pantryEntry.id);
      setStockMap(m => { const n = { ...m }; delete n[pantryEntry.food_item.id]; return n; });
    } catch { setError('Failed to remove from stock.'); }
  };

  const handleDeleteFood = async (fi) => {
    if (!window.confirm(`Delete "${fi.name}" permanently? This removes it from All Foods.`)) return;
    try {
      await foodAPI.delete(fi.id);
      setAllFoods(f => f.filter(x => x.id !== fi.id));
      setStockMap(m => { const n = { ...m }; delete n[fi.id]; return n; });
    } catch { setError('Failed to delete food item.'); }
  };

  // ── Add qty to existing food item stock ──────────────────────────────────

  const handleAddToStock = async (fi) => {
    const input = window.prompt(`How many ${fi.serving_description} to add to stock?`, '1');
    if (!input) return;
    const qty = parseFloat(input);
    if (isNaN(qty) || qty <= 0) return;
    try {
      await foodPantryAPI.add(fi.id, qty);
      await loadData();
    } catch { setError('Failed to add to stock.'); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (v) => parseFloat(v).toFixed(1);

  const categoryIcon = (cat) => ({
    fruit: '🍎', vegetable: '🥦', dairy: '🧀', meat: '🥩',
    grain: '🌾', snack: '🍫', beverage: '🥤', packaged: '📦', other: '🍽',
  }[cat] || '🍽');

  return (
    <div className="foods-page">
      <div className="foods-container">
        <header className="foods-header">
          <div>
            <h1>My Foods</h1>
            <p>Standalone food items you buy and eat — track stock and log intake.</p>
          </div>
          <div className="foods-header-actions">
            <button className="btn btn-outline" onClick={openManual}>+ Add Manually</button>
            <button className="btn btn-primary" onClick={openScan}>📷 Scan Barcode</button>
          </div>
        </header>

        {error && <div className="foods-error">{error}</div>}

        {/* Tabs */}
        <div className="foods-tabs">
          <button
            className={`foods-tab ${tab === 'stock' ? 'active' : ''}`}
            onClick={() => setTab('stock')}
          >
            In Stock
            <span className="foods-tab-count">{inStockFoods.length}</span>
          </button>
          <button
            className={`foods-tab ${tab === 'all' ? 'active' : ''}`}
            onClick={() => setTab('all')}
          >
            All Foods
            <span className="foods-tab-count">{allFoods.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="foods-loading">Loading...</div>
        ) : displayedFoods.length === 0 ? (
          <div className="foods-empty">
            <span className="foods-empty-icon">{tab === 'stock' ? '📦' : '🛒'}</span>
            {tab === 'stock' ? (
              <>
                <p>Nothing in stock.</p>
                <p>Add items via scan or manually, or check All Foods to restock.</p>
              </>
            ) : (
              <>
                <p>No food items yet.</p>
                <p>Scan a barcode or add manually to get started.</p>
              </>
            )}
          </div>
        ) : (
          <div className="foods-grid">
            {displayedFoods.map(fi => {
              const pantryEntry = stockMap[fi.id];
              const inStock = !!pantryEntry;
              return (
                <div key={fi.id} className={`food-card ${!inStock ? 'out-of-stock' : ''}`}>
                  <div className="food-card-top">
                    {fi.thumbnail_url
                      ? <img src={fi.thumbnail_url} alt={fi.name} className="food-card-img" />
                      : <span className="food-card-icon">{categoryIcon(fi.category)}</span>
                    }
                    <div className="food-card-info">
                      <p className="food-card-name">{fi.name}</p>
                      {fi.brand && <p className="food-card-brand">{fi.brand}</p>}
                      <p className="food-card-serving">{fi.serving_description}</p>
                    </div>
                  </div>

                  <div className="food-card-nutrition">
                    <span>{fmt(fi.calories)} kcal</span>
                    <span>{fmt(fi.protein)}g P</span>
                    <span>{fmt(fi.carbs)}g C</span>
                    <span>{fmt(fi.fat)}g F</span>
                  </div>

                  <div className="food-card-bottom">
                    {inStock ? (
                      <div className="food-qty-row">
                        <span className="food-qty-label">In stock:</span>
                        {editingId === pantryEntry.id ? (
                          <span className="food-qty-edit">
                            <input
                              type="number" min="0.1" step="0.1"
                              value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              className="food-qty-input"
                              autoFocus
                            />
                            <button className="btn btn-small btn-primary" onClick={() => saveEdit(pantryEntry)}>✓</button>
                            <button className="btn btn-small btn-outline" onClick={() => setEditingId(null)}>✕</button>
                          </span>
                        ) : (
                          <button className="food-qty-val" onClick={() => startEdit(pantryEntry)}>
                            {parseFloat(pantryEntry.quantity)} ✏
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="food-out-of-stock-label">Out of stock</span>
                    )}

                    <div className="food-card-actions-row">
                      {inStock ? (
                        <button className="btn btn-small btn-outline" onClick={() => handleRemoveFromStock(pantryEntry)}>
                          Clear Stock
                        </button>
                      ) : (
                        <button className="btn btn-small btn-outline" onClick={() => handleAddToStock(fi)}>
                          + Add to Stock
                        </button>
                      )}
                      <button className="btn btn-small btn-danger" onClick={() => handleDeleteFood(fi)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scan Modal ── */}
      {addMode === 'scan' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box foods-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Scan Barcode</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="foods-modal-body">
              <div className={`scanner-video-wrap ${scanPhase !== 'scanning' ? 'hidden' : ''}`}>
                <video ref={scanner.videoRef} className="scanner-video" autoPlay muted playsInline />
                <div className="scanner-overlay">
                  <div className="scanner-crosshair" />
                  <p className="scanner-tip">Align the barcode within the frame</p>
                </div>
              </div>

              {scanner.camError && <p className="foods-error">{scanner.camError}</p>}

              {scanPhase === 'fetching' && (
                <div className="scanner-loading">
                  <div className="scanner-spinner" />
                  <p>Looking up product...</p>
                </div>
              )}

              {scanError && scanPhase === 'scanning' && (
                <div>
                  <p className="foods-error">{scanError}</p>
                  <button className="btn btn-primary" onClick={() => { setScanError(''); scanner.start(); }}>
                    Try Again
                  </button>
                </div>
              )}

              {scanPhase === 'review' && scanProduct && (
                <div className="scan-review">
                  <div className="product-info-box">
                    {scanProduct.thumbnail_url && (
                      <img src={scanProduct.thumbnail_url} alt={scanProduct.name} className="product-thumb" />
                    )}
                    <div>
                      <p className="product-name">{scanProduct.name}</p>
                      {scanProduct.brand && <p className="product-brand">{scanProduct.brand}</p>}
                      <p className="product-serving">Per serving: {scanProduct.serving_size}</p>
                    </div>
                  </div>

                  <div className="scanner-nutrition-preview">
                    <h4>Nutrition per serving</h4>
                    <div className="nutrition-preview-grid">
                      {[
                        { label: 'kcal',    val: scanProduct.per_serving.calories.toFixed(0) },
                        { label: 'Protein', val: `${scanProduct.per_serving.protein.toFixed(1)}g` },
                        { label: 'Carbs',   val: `${scanProduct.per_serving.carbs.toFixed(1)}g` },
                        { label: 'Fat',     val: `${scanProduct.per_serving.fat.toFixed(1)}g` },
                        { label: 'Fiber',   val: `${scanProduct.per_serving.fiber.toFixed(1)}g` },
                      ].map(n => (
                        <div key={n.label} className="nutrient-cell">
                          <span className="nutrient-val">{n.val}</span>
                          <span className="nutrient-label">{n.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>How many did you buy?</label>
                    <input
                      className="form-control" type="number" min="0.1" step="0.1"
                      value={scanQty} onChange={e => setScanQty(e.target.value)}
                    />
                  </div>

                  {scanError && <p className="foods-error">{scanError}</p>}

                  <div className="modal-actions">
                    <button className="btn btn-primary" onClick={handleSaveScan} disabled={scanSaving}>
                      {scanSaving ? 'Saving...' : 'Add to My Foods'}
                    </button>
                    <button className="btn btn-outline" onClick={() => { setScanPhase('scanning'); setScanProduct(null); scanner.start(); }}>
                      Scan Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Modal ── */}
      {addMode === 'manual' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box foods-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Food Item</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form className="foods-modal-body" onSubmit={handleSaveManual}>
              <div className="foods-form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input className="form-control" value={manualForm.name}
                    onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Apple" />
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <input className="form-control" value={manualForm.brand}
                    onChange={e => setManualForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="optional" />
                </div>
              </div>

              <div className="foods-form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={manualForm.category}
                    onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Serving description</label>
                  <input className="form-control" value={manualForm.serving_description}
                    onChange={e => setManualForm(f => ({ ...f, serving_description: e.target.value }))}
                    placeholder="e.g. 1 piece, 100g" />
                </div>
              </div>

              <p className="foods-section-label">Nutrition per serving</p>
              <div className="foods-nutrition-row">
                {[
                  { key: 'calories', label: 'Calories (kcal)' },
                  { key: 'protein',  label: 'Protein (g)' },
                  { key: 'carbs',    label: 'Carbs (g)' },
                  { key: 'fat',      label: 'Fat (g)' },
                  { key: 'fiber',    label: 'Fiber (g)' },
                ].map(({ key, label }) => (
                  <div className="form-group" key={key}>
                    <label>{label}</label>
                    <input className="form-control" type="number" min="0" step="0.1"
                      value={manualForm[key]}
                      onChange={e => setManualForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>How many do you have?</label>
                <input className="form-control" type="number" min="0.1" step="0.1"
                  value={manualForm.quantity}
                  onChange={e => setManualForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>

              {manualError && <p className="foods-error">{manualError}</p>}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={manualSaving}>
                  {manualSaving ? 'Saving...' : 'Add to My Foods'}
                </button>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Foods;
