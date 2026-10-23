(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Reveal on enter ---------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  /* ---------------- Navigation ---------------- */
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  const onScroll = () => navbar.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setMenu = (open) => {
    mobileMenu.hidden = !open;
    navbar.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", () => setMenu(mobileMenu.hidden));
    mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !mobileMenu.hidden) {
        setMenu(false);
        navToggle.focus();
      }
    });
  }

  /* ---------------- Back to top ---------------- */
  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    backToTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
    );
  }

  /* ---------------- Contact form (opens the visitor's mail client) ---------------- */
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const errorEl = document.getElementById("form-error");

    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fields = ["name", "email", "message"].map((id) => document.getElementById(id));
      const invalid = fields.filter((field) => !field.value.trim() || !field.checkValidity());
      fields.forEach((field) => field.setAttribute("aria-invalid", String(invalid.includes(field))));

      if (invalid.length) {
        errorEl.textContent = "Please fill in your name, a valid email address and a message.";
        invalid[0].focus();
        return;
      }
      errorEl.textContent = "";

      const [name, email, message] = fields.map((field) => field.value.trim());
      const subject = `New message from ${name}`;
      const body = `Hello Raksha,

You have received a new message from your portfolio:

Name: ${name}
Email: ${email}

Message:
${message}`;

      window.location.href = `mailto:rakshamuralimohan@gmail.com?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    });
  }
})();
