// Pequenas melhorias progressivas: o site funciona sem JavaScript.
document.addEventListener('submit', (e) => {
  const msg = e.target.getAttribute('data-confirmar');
  if (msg && !window.confirm(msg)) e.preventDefault();
});
