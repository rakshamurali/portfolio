(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Scroll-scrubbed video background ---------------- */
  const stage = document.getElementById("scroll-video");

  if (stage) {
    const video = stage.querySelector("video");
    const canvas = stage.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const frames = [];
    let framesReady = false;
    let target = 0;
    let smoothed = 0;
    let lastIndex = -1;
    let lastSeek = -1;

    const markFrame = () => stage.classList.add("has-frame");
    video.addEventListener("loadeddata", markFrame, { once: true });
    if (video.readyState >= 2) markFrame();

    const progressFromScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      lastIndex = -1;
    };

    // object-fit: cover, centred
    const drawCover = (img, w, h) => {
      const scale = Math.max(canvas.width / w, canvas.height / h);
      const dw = w * scale;
      const dh = h * scale;
      ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    };

    const render = () => {
      if (framesReady) {
        const index = Math.round(smoothed * (frames.length - 1));
        if (index !== lastIndex) {
          const frame = frames[index];
          drawCover(frame, frame.width, frame.height);
          lastIndex = index;
        }
      } else if (video.duration) {
        const time = smoothed * (video.duration - 0.05);
        if (Math.abs(time - lastSeek) > 0.04 && !video.seeking) {
          video.currentTime = time;
          lastSeek = time;
        }
      }
    };

    const tick = () => {
      smoothed += (target - smoothed) * 0.12;
      if (Math.abs(target - smoothed) < 0.0005) smoothed = target;
      render();
      requestAnimationFrame(tick);
    };

    // Decode frames up-front from an offscreen copy so scrubbing never waits on seeks.
    const seekTo = (v, time) =>
      new Promise((resolve) => {
        v.addEventListener("seeked", resolve, { once: true });
        v.currentTime = time;
      });

    const buildFrameCache = async () => {
      const source = document.createElement("video");
      source.muted = true;
      source.playsInline = true;
      source.preload = "auto";
      source.src = video.currentSrc || video.src;

      await new Promise((resolve, reject) => {
        source.addEventListener("loadeddata", resolve, { once: true });
        source.addEventListener("error", reject, { once: true });
      });

      const small = window.innerWidth < 768;
      const maxWidth = small ? 640 : 960;
      const count = Math.min(small ? 60 : 90, Math.max(24, Math.round(source.duration * 12)));
      const width = Math.min(maxWidth, source.videoWidth);
      const height = Math.round((width / source.videoWidth) * source.videoHeight);
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const sctx = scratch.getContext("2d");

      for (let i = 0; i < count; i++) {
        await seekTo(source, (i / (count - 1)) * (source.duration - 0.05));
        sctx.drawImage(source, 0, 0, width, height);
        frames.push(await createImageBitmap(scratch));
      }

      source.removeAttribute("src");
      source.load();
      framesReady = true;
      lastIndex = -1;
      stage.classList.add("frames-ready");
    };

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    if (reduceMotion) {
      // Show a single still frame; no scroll-linked motion.
      video.addEventListener("loadedmetadata", () => (video.currentTime = 0), { once: true });
    } else {
      target = smoothed = progressFromScroll();
      window.addEventListener("scroll", () => (target = progressFromScroll()), { passive: true });
      window.addEventListener("resize", () => (target = progressFromScroll()));
      requestAnimationFrame(tick);

      const startCache = () =>
        setTimeout(() => {
          if (!("createImageBitmap" in window)) return;
          buildFrameCache().catch(() => {
            /* keep the seek fallback */
          });
        }, 300);
      if (video.readyState >= 2) startCache();
      else video.addEventListener("loadeddata", startCache, { once: true });
    }
  }

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
