/**
 * Oliesmeernippel — Main Website Script
 * Navigation, Scroll Spy, UI Interactions
 * De Meester Industries
 */

(function () {
  'use strict';

  // 1. Mobile Menu Toggle
  const nav = document.getElementById('siteNav');
  const menuToggle = document.getElementById('menuToggle');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when clicking nav links
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 2. Header shadow on scroll
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.style.boxShadow = '0 4px 18px rgba(15, 17, 19, 0.08)';
    } else {
      header.style.boxShadow = 'none';
    }
  }, { passive: true });

  // 3. Scroll Spy for navigation links
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  function onScroll() {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // 4. Quick button scroll helper
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-scroll-to');
      const targetElem = document.getElementById(targetId);
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 5. Algemene Verkoopsvoorwaarden Modal Handlers
  const termsModal = document.getElementById('termsModal');
  const btnCloseTerms = document.getElementById('btnCloseTerms');

  function openTerms(e) {
    if (e) e.preventDefault();
    if (termsModal) {
      termsModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeTerms() {
    if (termsModal) {
      termsModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  document.querySelectorAll('.open-terms-modal').forEach(link => {
    link.addEventListener('click', openTerms);
  });

  if (btnCloseTerms) {
    btnCloseTerms.addEventListener('click', closeTerms);
  }

  if (termsModal) {
    termsModal.addEventListener('click', (e) => {
      if (e.target === termsModal) closeTerms();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && termsModal && termsModal.classList.contains('open')) {
      closeTerms();
    }
  });

  // 6. Distributor License Form AJAX handler
  const distForm = document.getElementById('distributorForm');
  const btnDistSubmit = document.getElementById('btnDistSubmit');
  const distSuccessMsg = document.getElementById('distSuccessMsg');

  if (distForm) {
    distForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (btnDistSubmit) {
        btnDistSubmit.disabled = true;
        btnDistSubmit.textContent = 'Verzenden...';
      }

      const formData = new FormData(distForm);

      fetch('https://formsubmit.co/ajax/demeestersolutions@gmail.com', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        distForm.style.display = 'none';
        if (distSuccessMsg) {
          distSuccessMsg.style.display = 'block';
          distSuccessMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .catch(error => {
        console.warn('AJAX submit failed, submitting form natively:', error);
        distForm.submit();
      });
    });
  }

})();
