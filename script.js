document.addEventListener('DOMContentLoaded', () => {
  const year = document.querySelector('footer .footer-inner span');

  if (year) {
    year.textContent = `© ${new Date().getFullYear()} Catalin Mihai Pop`;
  }
});
