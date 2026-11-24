"use client";

import { useEffect } from "react";

export function LandingEnhancer() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));

    if (prefersReduced) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach((el) => observer.observe(el));

    const glideEls = Array.from(document.querySelectorAll<HTMLElement>(".scroll-glide"));
    const progressEl = document.querySelector<HTMLElement>(".landing-scroll-progress");
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".landing-links a[href^='#']"));
    const sections = navLinks
      .map((a) => {
        const id = a.getAttribute("href")?.slice(1);
        return id ? { link: a, el: document.getElementById(id) } : null;
      })
      .filter((item): item is { link: HTMLAnchorElement; el: HTMLElement } => Boolean(item && item.el));

    let rafId = 0;

    const updateOnScroll = () => {
      rafId = 0;
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (progressEl && maxScroll > 0) {
        const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
        progressEl.style.transform = `scaleX(${ratio})`;
      }

      const vh = window.innerHeight || 800;
      glideEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerOffset = (rect.top + rect.height / 2 - vh / 2) / vh;
        const clamped = Math.max(-1, Math.min(1, centerOffset));
        const shiftX = (clamped * -14).toFixed(2);
        const shiftY = (clamped * 8).toFixed(2);
        el.style.setProperty("--glide-x", `${shiftX}px`);
        el.style.setProperty("--glide-y", `${shiftY}px`);
      });

      let activeId = "";
      for (const s of sections) {
        const top = s.el.getBoundingClientRect().top;
        if (top <= 160) activeId = s.el.id;
      }
      sections.forEach((s) => {
        s.link.classList.toggle("is-nav-active", s.el.id === activeId);
      });
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateOnScroll);
    };

    updateOnScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return <div className="landing-scroll-progress" aria-hidden="true" />;
}
