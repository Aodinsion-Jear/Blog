"use client";

import { useEffect, useRef } from "react";

export function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const pres = Array.from(root.querySelectorAll("pre"));
    const wrappers: HTMLDivElement[] = [];

    for (const pre of pres) {
      if (pre.parentElement?.classList.contains("code-block")) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentElement?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-btn";
      button.setAttribute("aria-label", "复制代码");
      button.textContent = "复制";

      const onClick = async () => {
        const code = pre.querySelector("code");
        const text = (code?.textContent ?? pre.textContent ?? "").replace(/\n$/, "");
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
          }
          button.textContent = "已复制";
          button.classList.add("is-copied");
        } catch {
          button.textContent = "失败";
        }
        window.setTimeout(() => {
          button.textContent = "复制";
          button.classList.remove("is-copied");
        }, 1500);
      };

      button.addEventListener("click", onClick);
      wrapper.appendChild(button);
      wrappers.push(wrapper);
    }

    // Image zoom
    const imgs = Array.from(root.querySelectorAll("img"));
    const abortController = new AbortController();

    for (const img of imgs) {
      img.style.cursor = "zoom-in";
      img.addEventListener(
        "click",
        () => {
          const overlay = document.createElement("div");
          overlay.style.position = "fixed";
          overlay.style.inset = "0";
          overlay.style.zIndex = "9999";
          overlay.style.display = "flex";
          overlay.style.alignItems = "center";
          overlay.style.justifyContent = "center";
          overlay.style.background = "rgba(0, 0, 0, 0.75)";
          overlay.style.cursor = "zoom-out";
          overlay.style.animation = "img-zoom-in 200ms ease";

          const zoomed = document.createElement("img");
          zoomed.src = img.src;
          zoomed.alt = img.alt;
          zoomed.style.maxWidth = "90vw";
          zoomed.style.maxHeight = "90vh";
          zoomed.style.borderRadius = "6px";
          zoomed.style.boxShadow = "0 8px 40px rgba(0, 0, 0, 0.4)";
          zoomed.style.objectFit = "contain";

          const close = () => {
            overlay.style.animation = "img-zoom-out 180ms ease forwards";
            overlay.addEventListener("animationend", () => overlay.remove(), { once: true });
          };

          overlay.addEventListener("click", close);
          document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
          }, { once: true });

          overlay.appendChild(zoomed);
          document.body.appendChild(overlay);
        },
        { signal: abortController.signal },
      );
    }

    return () => {
      abortController.abort();
      for (const wrapper of wrappers) {
        const pre = wrapper.querySelector("pre");
        if (pre && wrapper.parentElement) {
          wrapper.parentElement.insertBefore(pre, wrapper);
        }
        wrapper.remove();
      }
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className="prose-content min-w-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
