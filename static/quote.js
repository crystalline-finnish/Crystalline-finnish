/* ===== Quote calculator ===== */
/*
 * Calls the server-side /api/quote-calculator endpoint instead of doing
 * the pricing math here in the browser. This means there's exactly one
 * place the pricing formula lives -- if rates or multipliers ever change,
 * updating the backend is enough; the frontend just displays whatever
 * the server returns.
 */
async function calculateQuote(){
  const select = document.getElementById('calcType');
  const selectedOption = select.options[select.selectedIndex];
  const productId = selectedOption.getAttribute('data-product-id');

  const width = parseFloat(document.getElementById('calcWidth').value);
  const height = parseFloat(document.getElementById('calcHeight').value);
  const qty = parseFloat(document.getElementById('calcQty').value) || 1;
  const glassMult = parseFloat(document.getElementById('calcGlass').value);
  const colorMult = parseFloat(document.getElementById('calcColor').value);

  const amountEl = document.getElementById('estAmount');

  if(!width || !height || width<=0 || height<=0){
    amountEl.textContent = 'Enter dimensions';
    return;
  }

  amountEl.textContent = 'Calculating…';

  try {
    const response = await fetch('/api/quote-calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        width_mm: width,
        height_mm: height,
        quantity: qty,
        glass_multiplier: glassMult,
        color_multiplier: colorMult,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      amountEl.textContent = data.error || 'Could not calculate estimate';
      return;
    }

    amountEl.textContent = data.currency + ' ' + Math.round(data.total_price).toLocaleString();
    document.getElementById('bArea').textContent = data.total_area_m2.toFixed(2) + ' m²';
    document.getElementById('bRate').textContent = data.currency + ' ' + data.base_rate_per_m2.toLocaleString();
    document.getElementById('bQty').textContent = data.quantity + ' unit(s)';
  } catch (err) {
    amountEl.textContent = 'Could not reach the server. Please try again.';
  }
}

/* ===== Quote request form ===== */
document.getElementById('qFile').addEventListener('change',function(){
  const names = Array.from(this.files).map(f=>f.name).join(', ');
  document.getElementById('fileNames').textContent = names ? ('Attached: ' + names) : '';
});

document.getElementById('quoteForm').addEventListener('submit', async function(e){
  e.preventDefault();

  const form = this;
  const submitBtn = document.getElementById('quoteSubmitBtn');
  const successEl = document.getElementById('formSuccess');
  const errorEl = document.getElementById('formError');

  successEl.style.display = 'none';
  errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  // FormData automatically picks up every input's name="" attribute,
  // including the file input — this is what lets us send files + text
  // fields together in one multipart/form-data request.
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/quote-requests', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    successEl.style.display = 'block';
    form.reset();
    document.getElementById('fileNames').textContent = '';
  } catch (err) {
    errorEl.textContent = '✗ ' + err.message;
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Quote Request';
  }
});
