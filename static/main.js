/* ===== Mobile nav ===== */
const burgerBtn = document.getElementById('burgerBtn');
const primaryNav = document.getElementById('primaryNav');
if (burgerBtn && primaryNav) {
  burgerBtn.addEventListener('click', function(){
    primaryNav.classList.toggle('open');
  });
  document.querySelectorAll('#primaryNav a').forEach(a=>a.addEventListener('click',()=>{
    primaryNav.classList.remove('open');
  }));
}

/* ===== Back to top visibility ===== */
const topBtn = document.getElementById('topBtn');
if (topBtn) {
  window.addEventListener('scroll',function(){
    topBtn.classList.toggle('show', window.scrollY > 500);
  });
}

/* ===== FAQ accordion ===== */
document.querySelectorAll('.faq-item').forEach(item=>{
  const question = item.querySelector('.faq-q');
  if (!question) return;
  question.addEventListener('click',()=>{
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));
    if(!isOpen) item.classList.add('open');
  });
});

/* ===== Product filter + search ===== */
/* These elements only exist on the Products page -- every other page
   safely skips this block instead of throwing a "null" error. */
const filterBar = document.getElementById('filterBar');
const productGrid = document.getElementById('productGrid');
const productSearch = document.getElementById('productSearch');
const noResults = document.getElementById('noResults');
let activeFilter = 'all';

if (filterBar && productGrid && productSearch) {
  function applyProductFilters(){
    const term = productSearch.value.trim().toLowerCase();
    let visibleCount = 0;
    productGrid.querySelectorAll('.product-card').forEach(card=>{
      const cats = card.dataset.cat;
      const name = card.dataset.name;
      const matchesFilter = activeFilter === 'all' || cats.includes(activeFilter);
      const matchesSearch = term === '' || name.includes(term);
      const show = matchesFilter && matchesSearch;
      card.style.display = show ? '' : 'none';
      if(show) visibleCount++;
    });
    if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  filterBar.addEventListener('click',e=>{
    if(e.target.tagName !== 'BUTTON') return;
    filterBar.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    activeFilter = e.target.dataset.filter;
    applyProductFilters();
  });
  productSearch.addEventListener('input', applyProductFilters);
}
