const root = document.documentElement;

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
  }
};

const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
root.dataset.theme = storage.get('portfolio-theme') || (prefersLight ? 'light' : 'dark');

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.querySelector('.theme-toggle');
  const year = document.querySelector('footer .footer-inner span');

  if (year) {
    year.textContent = `© ${new Date().getFullYear()} Catalin Mihai Pop`;
  }

  if (themeToggle) {
    const updateThemeButton = () => {
      const isLight = root.dataset.theme === 'light';
      themeToggle.textContent = isLight ? '☾' : '☼';
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.setAttribute('aria-label', isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
    };

    updateThemeButton();
    themeToggle.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      storage.set('portfolio-theme', root.dataset.theme);
      updateThemeButton();
    });
  }

  // Menú móvil: se abre con el botón y se cierra con Escape, al pulsar un enlace o al ampliar la ventana.
  const menuToggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#menu');
  if (menuToggle && menu) {
    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        menuToggle.focus();
      }
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  // Barra de progreso de lectura y sombra del header al hacer scroll.
  const header = document.querySelector('header');
  const progress = document.querySelector('.scroll-progress');
  let ticking = false;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  // Aparición escalonada de tarjetas dentro de cada sección.
  document.querySelectorAll('.stack-group, .project, .timeline-item, .fact').forEach((item) => {
    const siblings = [...item.parentElement.children];
    item.style.setProperty('--i', siblings.indexOf(item));
    item.classList.add('stagger');
  });

  // Copiar el email con un clic.
  document.querySelectorAll('.copy-email').forEach((button) => {
    const label = button.textContent;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = '¡Copiado!';
        button.classList.add('is-copied');
      } catch {
        button.textContent = 'Usa el enlace';
      }
      window.setTimeout(() => {
        button.textContent = label;
        button.classList.remove('is-copied');
      }, 1800);
    });
  });

  // Aparición suave de las secciones al hacer scroll.
  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }

  // Marca en el menú la sección visible.
  const sections = [...document.querySelectorAll('main section[id]')];
  const navigationLinks = [...document.querySelectorAll('nav a[href^="#"]')];
  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navigationLinks.forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  // Botón de volver arriba.
  const topButton = document.createElement('button');
  topButton.type = 'button';
  topButton.className = 'back-to-top';
  topButton.textContent = '↑';
  topButton.setAttribute('aria-label', 'Volver arriba');
  document.body.append(topButton);
  window.addEventListener('scroll', () => {
    topButton.classList.toggle('is-visible', window.scrollY > 500);
  }, { passive: true });
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
});
