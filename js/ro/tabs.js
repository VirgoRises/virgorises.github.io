// Minimal tab controller. No global leaks.
// Usage: buttons with `.tablinks[data-tab="id"]`, panels with `.tabcontent#id`.
// Default tab from `.tab[data-default-tab="id"]`.

function showTab(tabName) {
  const contents = document.querySelectorAll('.tabcontent');
  const links = document.querySelectorAll('.tab .tablinks');

  contents.forEach(c => c.style.display = (c.id === tabName ? 'block' : 'none'));
  links.forEach(b => b.classList.remove('active'));

  const btn = Array.from(links).find(b => b.dataset.tab === tabName);
  if (btn) btn.classList.add('active');
}

function wireTabs() {
  const bar = document.querySelector('.tab');
  if (!bar) return;

  bar.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.tablinks');
    if (!btn) return;
    const target = btn.dataset.tab;
    if (!target) return;
    ev.preventDefault();
    showTab(target);
  });

  const def = bar.getAttribute('data-default-tab')
           || (bar.querySelector('.tablinks')?.dataset.tab) || '';
  if (def) showTab(def);
}

document.addEventListener('DOMContentLoaded', wireTabs);
export {};
