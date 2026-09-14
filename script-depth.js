(() => {
  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const mobileLinks = mobileMenu ? [...mobileMenu.querySelectorAll("a")] : [];
  const wordmark = document.querySelector(".wordmark");
  const main = document.querySelector("main");
  const footer = document.querySelector(".site-footer");
  const soundGate = document.querySelector("[data-sound-gate]");
  const enterWithSound = document.querySelector("[data-enter-sound]");
  const enterMuted = document.querySelector("[data-enter-muted]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let soundEnabled = false;

  if (soundGate) {
    document.body.classList.add("sound-gate-open");
    if (header) header.inert = true;
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    requestAnimationFrame(() => enterWithSound?.focus({ preventScroll: true }));
  }

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 28);
  };

  const closeMenu = () => {
    if (!menuButton || !mobileMenu) return;
    const wasOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
    mobileMenu.classList.remove("is-open");
    header?.classList.remove("menu-open");
    if (main) main.inert = false;
    if (footer) footer.inert = false;
    document.body.style.overflow = "";
    if (wasOpen) requestAnimationFrame(() => menuButton.focus({ preventScroll: true }));
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  menuButton?.addEventListener("click", () => {
    if (!mobileMenu) return;
    const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(isOpen));
    mobileMenu.setAttribute("aria-hidden", String(!isOpen));
    mobileMenu.classList.toggle("is-open", isOpen);
    header?.classList.toggle("menu-open", isOpen);
    if (main) main.inert = isOpen;
    if (footer) footer.inert = isOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) requestAnimationFrame(() => mobileLinks[0]?.focus({ preventScroll: true }));
  });

  mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));
  wordmark?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    const menuIsOpen = menuButton?.getAttribute("aria-expanded") === "true";
    if (event.key === "Escape" && menuIsOpen) {
      closeMenu();
      return;
    }
    if (event.key !== "Tab" || !menuIsOpen || !menuButton) return;
    const focusableItems = [menuButton, ...mobileLinks];
    const currentIndex = focusableItems.indexOf(document.activeElement);
    if (event.shiftKey && currentIndex <= 0) {
      event.preventDefault();
      focusableItems[focusableItems.length - 1].focus();
    } else if (!event.shiftKey && currentIndex === focusableItems.length - 1) {
      event.preventDefault();
      focusableItems[0].focus();
    }
  });

  const revealItems = [...document.querySelectorAll(".reveal")];
  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7%" },
    );

    requestAnimationFrame(() => {
      revealItems.forEach((item) => {
        if (item.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
        item.classList.add("reveal-pending");
        revealObserver.observe(item);
      });
    });
  }

  const videoCards = [...document.querySelectorAll("[data-video-card]")];
  const getVideo = (card) => card.querySelector("video");

  const loadVideo = (card) => {
    const video = getVideo(card);
    const source = video?.querySelector("source[data-src]");
    if (!video || !source || source.getAttribute("src")) return video;
    source.setAttribute("src", source.dataset.src);
    video.load();
    return video;
  };

  const updateVideoUI = (card) => {
    const video = getVideo(card);
    const playButton = card.querySelector("[data-play]");
    const playLabel = card.querySelector("[data-play-label]");
    const soundButton = card.querySelector("[data-sound]");
    if (!video || !playButton || !playLabel || !soundButton) return;

    const isPlaying = !video.paused && !video.ended;
    card.classList.toggle("is-playing", isPlaying);
    playLabel.textContent = video.ended ? "Replay" : isPlaying ? "Pause" : "Play";
    playButton.setAttribute(
      "aria-label",
      video.ended ? "Replay visual episode" : isPlaying ? "Pause visual episode" : "Play visual episode",
    );
    soundButton.textContent = soundEnabled ? "Sound off" : "Sound on";
    soundButton.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
  };

  const pauseOtherVideos = (activeCard) => {
    videoCards.forEach((card) => {
      if (card === activeCard) return;
      const video = getVideo(card);
      if (!video) return;
      if (!video.paused) video.pause();
      if (!video.muted) video.muted = true;
      updateVideoUI(card);
    });
  };

  const playCard = async (card) => {
    const video = loadVideo(card);
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    pauseOtherVideos(card);
    video.muted = !soundEnabled;

    try {
      await video.play();
      card.dataset.userPaused = "false";
    } catch (_) {
      if (!video.muted) {
        video.muted = true;
        try {
          await video.play();
          card.dataset.userPaused = "false";
        } catch (_) {
          // The manual Play control remains available when a browser blocks playback.
        }
      }
      updateVideoUI(card);
    }
  };

  videoCards.forEach((card) => {
    const video = getVideo(card);
    const playButton = card.querySelector("[data-play]");
    const soundButton = card.querySelector("[data-sound]");
    if (!video || !playButton || !soundButton) return;

    video.autoplay = true;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    playButton.addEventListener("click", async () => {
      if (!video.paused && !video.ended) {
        card.dataset.userPaused = "true";
        video.pause();
        return;
      }
      await playCard(card);
    });

    soundButton.addEventListener("click", async () => {
      soundEnabled = !soundEnabled;
      video.muted = !soundEnabled;
      if (soundEnabled && video.paused) await playCard(card);
      videoCards.forEach(updateVideoUI);
    });

    ["play", "playing", "pause", "ended", "volumechange"].forEach((eventName) => {
      video.addEventListener(eventName, () => updateVideoUI(card));
    });

    video.addEventListener("error", () => {
      card.classList.add("has-video-error");
      const label = card.querySelector("[data-play-label]");
      if (label) label.textContent = "Unavailable";
    });

    updateVideoUI(card);
  });

  let activeVideoCard = null;
  let videoCheckFrame = 0;

  const getVisibleRatio = (card) => {
    const rect = card.getBoundingClientRect();
    const visibleHeight = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
    );
    return visibleHeight / Math.max(1, Math.min(rect.height, window.innerHeight));
  };

  const updateActiveVideo = () => {
    videoCheckFrame = 0;
    if (document.hidden) return;
    let selectedCard = null;
    let closestToCenter = Number.POSITIVE_INFINITY;

    videoCards.forEach((card) => {
      const video = getVideo(card);
      const visibleRatio = getVisibleRatio(card);

      if (visibleRatio < 0.04) {
        if (video && !video.paused) video.pause();
        if (video && !video.muted) video.muted = true;
        card.dataset.userPaused = "false";
        updateVideoUI(card);
        if (activeVideoCard === card) activeVideoCard = null;
        return;
      }

      if (visibleRatio < 0.12) return;
      const rect = card.getBoundingClientRect();
      const distanceToCenter = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
      if (distanceToCenter < closestToCenter) {
        closestToCenter = distanceToCenter;
        selectedCard = card;
      }
    });

    if (!selectedCard) {
      videoCards.forEach((card) => {
        const video = getVideo(card);
        if (video && !video.paused) video.pause();
      });
      activeVideoCard = null;
      return;
    }

    activeVideoCard = selectedCard;
    pauseOtherVideos(selectedCard);
    const video = getVideo(selectedCard);
    if (
      selectedCard.dataset.userPaused !== "true" &&
      video &&
      video.paused &&
      (!video.ended || video.loop)
    ) {
      playCard(selectedCard);
    }
  };

  const requestVideoCheck = () => {
    if (videoCheckFrame) return;
    videoCheckFrame = requestAnimationFrame(updateActiveVideo);
  };

  window.addEventListener("scroll", requestVideoCheck, { passive: true });
  window.addEventListener("resize", requestVideoCheck);
  window.addEventListener("load", requestVideoCheck);
  window.addEventListener("pageshow", requestVideoCheck);
  videoCards.forEach((card) => {
    const video = getVideo(card);
    video?.addEventListener("loadeddata", requestVideoCheck);
    video?.addEventListener("canplay", requestVideoCheck);
  });
  videoCheckFrame = requestAnimationFrame(updateActiveVideo);

  const dismissSoundGate = (enableSound) => {
    soundEnabled = enableSound;
    soundGate?.classList.add("is-dismissed");
    document.body.classList.remove("sound-gate-open");
    if (header) header.inert = false;
    if (main) main.inert = false;
    if (footer) footer.inert = false;

    if (enableSound && activeVideoCard) {
      const video = getVideo(activeVideoCard);
      if (video) video.muted = false;
      playCard(activeVideoCard);
    } else {
      requestVideoCheck();
    }

    videoCards.forEach(updateVideoUI);
    wordmark?.focus({ preventScroll: true });
    soundGate?.setAttribute("aria-hidden", "true");
    window.setTimeout(() => soundGate?.remove(), 950);
  };

  enterWithSound?.addEventListener("click", () => dismissSoundGate(true));
  enterMuted?.addEventListener("click", () => dismissSoundGate(false));
  soundGate?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      dismissSoundGate(false);
      return;
    }
    if (event.key !== "Tab" || soundGate.classList.contains("is-dismissed")) return;
    const gateControls = [enterWithSound, enterMuted].filter(Boolean);
    const currentIndex = gateControls.indexOf(document.activeElement);
    if (event.shiftKey && currentIndex <= 0) {
      event.preventDefault();
      gateControls[gateControls.length - 1]?.focus();
    } else if (!event.shiftKey && currentIndex === gateControls.length - 1) {
      event.preventDefault();
      gateControls[0]?.focus();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      videoCards.forEach((card) => getVideo(card)?.pause());
      return;
    }
    requestVideoCheck();
  });

  if (!reducedMotion && window.innerWidth > 760) {
    const wordsSection = document.querySelector(".words-section");
    const driftWords = [...document.querySelectorAll("[data-drift]")];
    let driftFrame = 0;

    const updateDrift = () => {
      driftFrame = 0;
      if (!wordsSection) return;
      const rect = wordsSection.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = Math.max(
        0,
        Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
      );
      const shift = (progress - 0.5) * Math.min(window.innerWidth * 0.1, 150);
      driftWords.forEach((word) => {
        const direction = word.dataset.drift === "right" ? -1 : 1;
        word.style.setProperty("--drift", String(shift * direction) + "px");
      });
    };

    const requestDrift = () => {
      if (driftFrame) return;
      driftFrame = requestAnimationFrame(updateDrift);
    };

    updateDrift();
    window.addEventListener("scroll", requestDrift, { passive: true });
    window.addEventListener("resize", requestDrift);
  }

  if (!reducedMotion) {
    document.documentElement.classList.add("depth-space");

    const depthScenes = [...document.querySelectorAll("[data-depth-scene]")];
    const depthProfiles = {
      far: {
        enterZ: -520,
        centerZ: -150,
        exitZ: 90,
        enterY: 90,
        exitY: -65,
        lookX: 10,
        lookY: 7,
        rotateX: 0.8,
        rotateY: 1.1,
      },
      copy: {
        enterZ: -270,
        centerZ: 35,
        exitZ: 175,
        enterY: 65,
        exitY: -50,
        lookX: 18,
        lookY: 12,
        rotateX: 1.45,
        rotateY: 2,
      },
      visual: {
        enterZ: -470,
        centerZ: 110,
        exitZ: 285,
        enterY: 100,
        exitY: -85,
        lookX: -25,
        lookY: -16,
        rotateX: 2.7,
        rotateY: 3.4,
      },
      near: {
        enterZ: -330,
        centerZ: 175,
        exitZ: 350,
        enterY: 90,
        exitY: -105,
        lookX: -34,
        lookY: -22,
        rotateX: 3.5,
        rotateY: 4.5,
      },
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const lerp = (start, end, amount) => start + (end - start) * amount;
    const smoothstep = (value) => value * value * (3 - 2 * value);
    const camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let depthFrame = 0;

    const updateDepthSpace = () => {
      depthFrame = 0;
      camera.x += (camera.targetX - camera.x) * 0.12;
      camera.y += (camera.targetY - camera.y) * 0.12;

      const viewportHeight = window.innerHeight;
      const isCompact = window.innerWidth <= 760;
      const depthMultiplier = isCompact ? 0.42 : 1;
      const pointerMultiplier = isCompact ? 0.3 : 1;

      depthScenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        const isNearby = rect.bottom > -viewportHeight * 0.35 && rect.top < viewportHeight * 1.35;
        if (!isNearby) {
          scene.classList.remove("is-depth-active");
          return;
        }

        const progress = clamp(
          (viewportHeight - rect.top) / Math.max(1, viewportHeight + rect.height),
          0,
          1,
        );
        const entering = progress <= 0.5;
        const phase = smoothstep(entering ? progress * 2 : (progress - 0.5) * 2);
        scene.classList.add("is-depth-active");
        scene.style.setProperty("--depth-origin-x", (50 + camera.x * 7).toFixed(2) + "%");
        scene.style.setProperty("--depth-origin-y", (50 + camera.y * 5).toFixed(2) + "%");

        const layers = [...scene.querySelectorAll("[data-depth-layer]")];
        layers.forEach((layer, index) => {
          const profile = depthProfiles[layer.dataset.depthLayer] || depthProfiles.copy;
          const z = entering
            ? lerp(profile.enterZ, profile.centerZ, phase)
            : lerp(profile.centerZ, profile.exitZ, phase);
          const baseY = entering
            ? lerp(profile.enterY, 0, phase)
            : lerp(0, profile.exitY, phase);
          const layerOffset = (index - (layers.length - 1) / 2) * 2.5;
          const x = camera.x * profile.lookX * pointerMultiplier + layerOffset;
          const y = baseY * depthMultiplier + camera.y * profile.lookY * pointerMultiplier;
          const rotateX = -camera.y * profile.rotateX * pointerMultiplier;
          const rotateY = camera.x * profile.rotateY * pointerMultiplier;

          layer.style.setProperty("--depth-x", x.toFixed(2) + "px");
          layer.style.setProperty("--depth-y", y.toFixed(2) + "px");
          layer.style.setProperty("--depth-z", (z * depthMultiplier).toFixed(2) + "px");
          layer.style.setProperty("--depth-rx", rotateX.toFixed(3) + "deg");
          layer.style.setProperty("--depth-ry", rotateY.toFixed(3) + "deg");
        });
      });

      if (
        Math.abs(camera.targetX - camera.x) > 0.002 ||
        Math.abs(camera.targetY - camera.y) > 0.002
      ) {
        depthFrame = requestAnimationFrame(updateDepthSpace);
      }
    };

    const requestDepthUpdate = () => {
      if (depthFrame) return;
      depthFrame = requestAnimationFrame(updateDepthSpace);
    };

    window.addEventListener("scroll", requestDepthUpdate, { passive: true });
    window.addEventListener("resize", requestDepthUpdate);
    window.addEventListener("mousemove", (event) => {
      camera.targetX = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      camera.targetY = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
      requestDepthUpdate();
    });
    document.documentElement.addEventListener("mouseleave", () => {
      camera.targetX = 0;
      camera.targetY = 0;
      requestDepthUpdate();
    });

    requestDepthUpdate();
  }
})();
