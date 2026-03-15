/**
 * KitchuLab Theme JavaScript
 * Professional Kitchen Equipment Store
 */

(function () {
  'use strict';

  // ============================================================
  // Utility helpers
  // ============================================================
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || window.moneyFormat || '${{amount}}';

    function defaultTo(value, defaultValue) {
      return value == null || value !== value ? defaultValue : value;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultTo(precision, 2);
      thousands = defaultTo(thousands, ',');
      decimal = defaultTo(decimal, '.');

      if (isNaN(number) || number == null) return 0;

      number = (number / 100.0).toFixed(precision);
      const parts = number.split('.');
      const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsAmount = parts[1] ? decimal + parts[1] : '';
      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }

    return formatString.replace(placeholderRegex, value);
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function trapFocus(element) {
    const focusable = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }

  // ============================================================
  // Sticky Header
  // ============================================================
  function initStickyHeader() {
    const header = $('.site-header');
    if (!header) return;

    const announcementBar = $('.announcement-bar');
    let announcementHeight = announcementBar ? announcementBar.offsetHeight : 0;

    function handleScroll() {
      const scrolled = window.scrollY > announcementHeight + 10;
      header.classList.toggle('scrolled', scrolled);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // ============================================================
  // Mobile Menu
  // ============================================================
  function initMobileMenu() {
    const menu = $('#mobile-menu');
    const hamburger = $('.hamburger');
    const closeBtn = menu ? menu.querySelector('.mobile-menu__close') : null;
    const overlay = menu ? menu.querySelector('.mobile-menu__overlay') : null;

    if (!menu || !hamburger) return;

    let removeTrap = null;

    function openMenu() {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
      hamburger.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      removeTrap = trapFocus(menu);
      const firstFocusable = menu.querySelector('button, a');
      if (firstFocusable) firstFocusable.focus();
    }

    function closeMenu() {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (removeTrap) {
        removeTrap();
        removeTrap = null;
      }
      hamburger.focus();
    }

    hamburger.addEventListener('click', () => {
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Submenu toggles
    $$('.mobile-menu__item.has-children .mobile-menu__link').forEach(link => {
      link.addEventListener('click', (e) => {
        const item = link.closest('.mobile-menu__item');
        const isOpen = item.classList.contains('open');
        // Close all others
        $$('.mobile-menu__item.has-children').forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
          e.preventDefault();
        }
      });
    });

    // Esc key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
    });
  }

  // ============================================================
  // Search Overlay
  // ============================================================
  function initSearchOverlay() {
    const overlay = $('#search-overlay');
    const triggers = $$('[data-search-toggle]');
    const backdrop = overlay ? overlay.querySelector('.search-overlay__backdrop') : null;
    const closeBtn = overlay ? overlay.querySelector('.search-overlay__close') : null;
    const input = overlay ? overlay.querySelector('.search-overlay__input') : null;

    if (!overlay) return;

    function openSearch() {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => { if (input) input.focus(); }, 300);
    }

    function closeSearch() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    triggers.forEach(t => t.addEventListener('click', openSearch));
    if (backdrop) backdrop.addEventListener('click', closeSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch();
    });
  }

  // ============================================================
  // Cart Drawer
  // ============================================================
  const CartDrawer = {
    el: null,
    overlay: null,
    body: null,
    subtotalEl: null,
    removeTrap: null,

    init() {
      this.el = $('#cart-drawer');
      if (!this.el) return;

      this.overlay = this.el.querySelector('.cart-drawer__overlay');
      this.body = this.el.querySelector('#cart-drawer-body');
      this.subtotalEl = this.el.querySelector('#cart-drawer-subtotal');
      const closeBtn = this.el.querySelector('.cart-drawer__close');

      if (this.overlay) this.overlay.addEventListener('click', () => this.close());
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.el.classList.contains('open')) this.close();
      });

      // Intercept cart icon click
      $$('[data-cart-drawer]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });
    },

    open() {
      this.el.classList.add('open');
      this.el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      this.removeTrap = trapFocus(this.el);
      this.fetch();
    },

    close() {
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (this.removeTrap) {
        this.removeTrap();
        this.removeTrap = null;
      }
    },

    async fetch() {
      if (!this.body) return;
      this.body.innerHTML = '<div class="cart-drawer__loading"><div class="spinner"></div></div>';

      try {
        const response = await fetch('/cart.js');
        const cart = await response.json();
        this.render(cart);
      } catch (err) {
        console.error('Cart fetch error:', err);
        this.body.innerHTML = '<p style="padding:1rem;color:#6b7280;">Could not load cart.</p>';
      }
    },

    render(cart) {
      if (!this.body) return;

      if (cart.item_count === 0) {
        this.body.innerHTML = `
          <div style="text-align:center;padding:3rem 1rem;">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style="margin:0 auto 1rem;color:#e5e7eb;">
              <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2"/>
              <path d="M20 26h24l-3 16H23L20 26z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M27 26V22a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p style="font-size:1rem;font-weight:600;color:#1B2A3B;margin-bottom:0.5rem;">Your cart is empty</p>
            <p style="font-size:0.875rem;color:#6b7280;margin-bottom:1.5rem;">Add some items to get started.</p>
            <a href="/collections/all" class="btn btn--primary btn--sm">Shop Now</a>
          </div>
        `;
        if (this.subtotalEl) this.subtotalEl.textContent = '';
        return;
      }

      const itemsHTML = cart.items.map(item => `
        <div class="drawer-cart-item">
          <div class="drawer-cart-item__image">
            ${item.image
              ? `<img src="${item.image}" alt="${item.product_title}" loading="lazy">`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#d1d5db;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                </div>`
            }
          </div>
          <div class="drawer-cart-item__info">
            <div class="drawer-cart-item__title">${item.product_title}</div>
            ${item.variant_title && item.variant_title !== 'Default Title'
              ? `<div class="drawer-cart-item__variant">${item.variant_title}</div>`
              : ''
            }
            <div class="drawer-cart-item__footer">
              <span class="drawer-cart-item__price">${formatMoney(item.final_line_price, window.moneyFormat)}</span>
              <button
                class="drawer-cart-item__remove"
                data-remove-key="${item.key}"
                aria-label="Remove ${item.product_title}"
              >Remove</button>
            </div>
          </div>
        </div>
      `).join('');

      this.body.innerHTML = itemsHTML;

      if (this.subtotalEl) {
        this.subtotalEl.textContent = formatMoney(cart.total_price, window.moneyFormat);
      }

      // Bind remove buttons
      this.body.querySelectorAll('[data-remove-key]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.removeKey;
          await this.removeItem(key);
        });
      });
    },

    async removeItem(key) {
      try {
        const response = await fetch(window.routes.cart_change_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: 0 })
        });
        const cart = await response.json();
        this.render(cart);
        CartDrawer.updateCount(cart.item_count);
      } catch (err) {
        console.error('Remove item error:', err);
      }
    },

    updateCount(count) {
      $$('[data-cart-count]').forEach(el => {
        el.textContent = count;
        el.setAttribute('data-count', count);
        if (count === 0) {
          el.setAttribute('data-count', '0');
        }
      });
    }
  };

  // ============================================================
  // Add to Cart
  // ============================================================
  async function addToCart(variantId, quantity = 1, btn = null) {
    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Adding...';
    }

    try {
      const response = await fetch(window.routes.cart_add_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity })
      });

      if (!response.ok) throw new Error('Failed to add to cart');

      const data = await response.json();

      // Refresh cart count
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();
      CartDrawer.updateCount(cart.item_count);

      // Open drawer
      CartDrawer.open();

      if (btn) {
        btn.textContent = 'Added!';
        setTimeout(() => {
          btn.textContent = btn.dataset.originalText || 'Add to Cart';
          btn.disabled = false;
        }, 2000);
      }

      return data;
    } catch (err) {
      console.error('Add to cart error:', err);
      if (btn) {
        btn.textContent = 'Error — Try Again';
        btn.disabled = false;
        setTimeout(() => {
          btn.textContent = btn.dataset.originalText || 'Add to Cart';
        }, 2500);
      }
      throw err;
    }
  }

  function initAddToCart() {
    // Product page form
    const productForm = $('[data-product-form]');
    if (productForm) {
      productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const variantInput = productForm.querySelector('[name="id"]');
        const quantityInput = productForm.querySelector('[name="quantity"]');
        const submitBtn = productForm.querySelector('[type="submit"]');

        if (!variantInput) return;
        const variantId = variantInput.value;
        const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;

        await addToCart(variantId, quantity, submitBtn);
      });
    }

    // Quick-add buttons on product cards
    document.addEventListener('click', async (e) => {
      const quickAddBtn = e.target.closest('[data-quick-add]');
      if (!quickAddBtn) return;
      e.preventDefault();

      const variantId = quickAddBtn.dataset.variantId;
      if (!variantId) return;
      await addToCart(variantId, 1, quickAddBtn);
    });
  }

  // ============================================================
  // Product Gallery
  // ============================================================
  function initProductGallery() {
    const gallery = $('.product-gallery');
    if (!gallery) return;

    const mainImage = gallery.querySelector('.product-gallery__main-image');
    const thumbs = $$('.product-gallery__thumb', gallery);

    if (!mainImage || thumbs.length === 0) return;

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const newSrc = thumb.dataset.src;
        const newAlt = thumb.dataset.alt || '';

        if (newSrc) {
          mainImage.src = newSrc;
          mainImage.alt = newAlt;
          mainImage.style.opacity = '0';
          mainImage.onload = () => {
            mainImage.style.opacity = '1';
          };
        }

        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    // Keyboard navigation
    thumbs.forEach((thumb, idx) => {
      thumb.setAttribute('tabindex', '0');
      thumb.setAttribute('role', 'button');
      thumb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          thumb.click();
        }
      });
    });
  }

  // ============================================================
  // Quantity Selector
  // ============================================================
  function initQuantitySelectors() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.quantity-btn');
      if (!btn) return;

      const wrapper = btn.closest('.quantity-selector');
      if (!wrapper) return;

      const input = wrapper.querySelector('.quantity-input');
      if (!input) return;

      let value = parseInt(input.value, 10) || 1;
      const min = parseInt(input.min, 10) || 1;
      const max = parseInt(input.max, 10) || 9999;

      if (btn.dataset.action === 'increase') {
        value = Math.min(value + 1, max);
      } else if (btn.dataset.action === 'decrease') {
        value = Math.max(value - 1, min);
      }

      input.value = value;
      input.dispatchEvent(new Event('change'));
    });
  }

  // ============================================================
  // Product Tabs
  // ============================================================
  function initProductTabs() {
    const tabsContainers = $$('.product-tabs');

    tabsContainers.forEach(container => {
      const tabBtns = $$('.tab-btn', container);
      const tabPanels = $$('.tab-panel', container);

      tabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          tabPanels.forEach(p => {
            p.classList.remove('active');
            p.setAttribute('hidden', '');
          });

          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          if (tabPanels[idx]) {
            tabPanels[idx].classList.add('active');
            tabPanels[idx].removeAttribute('hidden');
          }
        });
      });

      // Init first tab
      if (tabBtns[0]) tabBtns[0].click();
    });
  }

  // ============================================================
  // Filter Panels
  // ============================================================
  function initFilterPanels() {
    $$('.filter-panel').forEach(panel => {
      const header = panel.querySelector('.filter-panel__header');
      if (!header) return;

      // Open by default on desktop
      if (window.innerWidth >= 1024) {
        panel.classList.add('open');
      }

      header.addEventListener('click', () => {
        panel.classList.toggle('open');
      });
    });

    // Sort select
    const sortSelect = $('.sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', sortSelect.value);
        window.location.href = url.href;
      });
    }

    // Mobile filter toggle
    const filterToggle = $('[data-filter-toggle]');
    const filterSidebar = $('.collection-sidebar');
    if (filterToggle && filterSidebar) {
      filterToggle.addEventListener('click', () => {
        filterSidebar.classList.toggle('open');
        const isOpen = filterSidebar.classList.contains('open');
        filterToggle.setAttribute('aria-expanded', isOpen.toString());
      });
    }
  }

  // ============================================================
  // Mega Menu Accessibility
  // ============================================================
  function initMegaMenu() {
    $$('.nav-item').forEach(item => {
      const trigger = item.querySelector('a');
      const dropdown = item.querySelector('.mega-menu, .dropdown-menu');
      if (!dropdown) return;

      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');

      item.addEventListener('mouseenter', () => {
        trigger.setAttribute('aria-expanded', 'true');
      });
      item.addEventListener('mouseleave', () => {
        trigger.setAttribute('aria-expanded', 'false');
      });

      // Keyboard support
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const isOpen = trigger.getAttribute('aria-expanded') === 'true';
          trigger.setAttribute('aria-expanded', (!isOpen).toString());
          dropdown.style.pointerEvents = isOpen ? 'none' : 'auto';
        }
        if (e.key === 'Escape') {
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      });
    });
  }

  // ============================================================
  // Announcement Bar
  // ============================================================
  function initAnnouncementBar() {
    const bar = $('.announcement-bar');
    if (!bar) return;

    // Update CSS variable for header offset
    document.documentElement.style.setProperty(
      '--announcement-height',
      bar.offsetHeight + 'px'
    );

    window.addEventListener('resize', debounce(() => {
      document.documentElement.style.setProperty(
        '--announcement-height',
        bar.offsetHeight + 'px'
      );
    }, 200));
  }

  // ============================================================
  // Lazy Load Images
  // ============================================================
  function initLazyLoad() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px 0px' });

      $$('img[data-src], img[data-srcset]').forEach(img => observer.observe(img));
    } else {
      // Fallback
      $$('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
    }
  }

  // ============================================================
  // Cart Page — Remove Items
  // ============================================================
  function initCartPage() {
    document.addEventListener('click', async (e) => {
      const removeBtn = e.target.closest('[data-remove-item]');
      if (!removeBtn) return;

      const key = removeBtn.dataset.removeItem;
      if (!key) return;

      removeBtn.disabled = true;
      removeBtn.textContent = 'Removing...';

      try {
        await fetch(window.routes.cart_change_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: 0 })
        });
        window.location.reload();
      } catch (err) {
        console.error('Remove error:', err);
        removeBtn.disabled = false;
        removeBtn.textContent = 'Remove';
      }
    });

    // Quantity change on cart page
    document.addEventListener('change', async (e) => {
      const quantityInput = e.target.closest('[data-cart-quantity]');
      if (!quantityInput) return;

      const key = quantityInput.dataset.cartQuantity;
      const quantity = parseInt(quantityInput.value, 10);

      if (isNaN(quantity) || quantity < 0) return;

      try {
        await fetch(window.routes.cart_change_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity })
        });
        window.location.reload();
      } catch (err) {
        console.error('Quantity update error:', err);
      }
    });
  }

  // ============================================================
  // Smooth Scroll
  // ============================================================
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;

      const target = $(anchor.getAttribute('href'));
      if (!target) return;

      e.preventDefault();
      const headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height')
      ) || 72;

      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  // ============================================================
  // Newsletter Form
  // ============================================================
  function initNewsletterForm() {
    $$('.footer-newsletter__form, [data-newsletter-form]').forEach(form => {
      form.addEventListener('submit', (e) => {
        // Shopify handles subscription via the form action
        // We just provide visual feedback
        const btn = form.querySelector('button[type="submit"]');
        const input = form.querySelector('input[type="email"]');
        if (!btn || !input) return;

        if (!input.value.includes('@')) {
          e.preventDefault();
          input.style.borderColor = '#dc2626';
          setTimeout(() => { input.style.borderColor = ''; }, 2000);
        }
      });
    });
  }

  // ============================================================
  // Init on DOM ready
  // ============================================================
  function init() {
    initStickyHeader();
    initMobileMenu();
    initSearchOverlay();
    CartDrawer.init();
    initAddToCart();
    initProductGallery();
    initQuantitySelectors();
    initProductTabs();
    initFilterPanels();
    initMegaMenu();
    initAnnouncementBar();
    initLazyLoad();
    initCartPage();
    initSmoothScroll();
    initNewsletterForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
