function initHamburger({ toggleId, menuId }) {
  const btn  = document.getElementById(toggleId);
  const menu = document.getElementById(menuId);
  if (!btn || !menu) return;

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

module.exports = { initHamburger };