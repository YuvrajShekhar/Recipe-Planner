/**
 * Fetches product info from the Open Food Facts public API.
 * Returns a normalised object or null if the barcode isn't found.
 */
export async function fetchProductByBarcode(barcode) {
  const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();
  if (data.status !== 1) return null;

  const p          = data.product;
  const n          = p.nutriments || {};
  const servingQty = parseFloat(p.serving_quantity) || null;

  const perServing = (key100g, keyServing) => {
    let val;
    if (n[keyServing] != null) val = parseFloat(n[keyServing]);
    else if (n[key100g] != null && servingQty) val = (parseFloat(n[key100g]) * servingQty) / 100;
    else val = 0;
    return Math.round(val * 100) / 100;   // round to 2 dp — prevents DecimalField rejection
  };

  return {
    name:             p.product_name || p.abbreviated_product_name || 'Unknown Product',
    brand:            p.brands || '',
    barcode,
    serving_size:     p.serving_size || (servingQty ? `${servingQty}g` : '1 serving'),
    thumbnail_url:    p.image_front_small_url || p.image_small_url || '',
    per_serving: {
      calories: perServing('energy-kcal_100g', 'energy-kcal_serving'),
      protein:  perServing('proteins_100g',    'proteins_serving'),
      carbs:    perServing('carbohydrates_100g','carbohydrates_serving'),
      fat:      perServing('fat_100g',         'fat_serving'),
      fiber:    perServing('fiber_100g',       'fiber_serving'),
    },
  };
}
