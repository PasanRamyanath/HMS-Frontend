/**
 * Sri Lanka Cloud SaaS HMS - Embeddable Direct Booking Bar Widget
 * 1-Line Embed Snippet for external Hotel WordPress, Webflow, and Static Sites:
 * <script src="https://app.hotel.lk/booking-widget.js" data-tenant="galle-fort" data-hotel-name="Galle Fort Villa" data-discount="15%"></script>
 */

(() => {
  // Prevent multiple injections
  if (document.getElementById("hms-booking-widget-container")) {
    return;
  }

  function findScriptTag() {
    if (document.currentScript) {
      return document.currentScript;
    }
    return (
      document.querySelector("script[src*='booking-widget.js']") ||
      document.querySelector("script[data-tenant]")
    );
  }

  function resolveBaseUrl(scriptTag) {
    const explicitUrl = scriptTag?.getAttribute("data-base-url");
    if (explicitUrl) {
      return explicitUrl;
    }
    if (!scriptTag?.src) {
      return "https://app.hotel.lk";
    }
    try {
      return new URL(scriptTag.src).origin;
    } catch {
      return "https://app.hotel.lk";
    }
  }

  function getWidgetConfig() {
    const scriptTag = findScriptTag();
    const tenantId = scriptTag?.getAttribute("data-tenant") || "demo";
    const hotelName = scriptTag?.getAttribute("data-hotel-name") || "Boutique Villa";
    const discount = scriptTag?.getAttribute("data-discount") || "15%";
    const customAccent = scriptTag?.getAttribute("data-accent") || "#007aff";
    const baseUrl = resolveBaseUrl(scriptTag);
    const bookingUrl = `${baseUrl.replace(/\/$/, "")}/book/${encodeURIComponent(tenantId)}`;

    return { tenantId, hotelName, discount, customAccent, bookingUrl };
  }

  function injectWidgetStyles(accent) {
    const styleEl = document.createElement("style");
    styleEl.id = "hms-booking-widget-style";
    styleEl.textContent = `
      .hms-bw-wrapper {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        z-index: 2147483640;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
        opacity: 1;
        max-width: calc(100vw - 32px);
      }
      .hms-bw-hidden {
        transform: translateX(-50%) translateY(120px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .hms-bw-glass-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 10px 8px 16px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.6);
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.05);
        color: #1c1c1e;
      }
      @media (prefers-color-scheme: dark) {
        .hms-bw-glass-bar {
          background: rgba(28, 28, 30, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.2);
          color: #f5f5f7;
        }
      }
      @media (prefers-reduced-transparency: reduce) {
        .hms-bw-glass-bar {
          background: #ffffff !important;
        }
        @media (prefers-color-scheme: dark) {
          .hms-bw-glass-bar {
            background: #1c1c1e !important;
          }
        }
      }
      .hms-bw-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 9999px;
        background: rgba(0, 122, 255, 0.12);
        color: ${accent};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: -0.2px;
        white-space: nowrap;
      }
      .hms-bw-text-block {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .hms-bw-title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.3px;
        white-space: nowrap;
      }
      .hms-bw-subtitle {
        font-size: 11px;
        opacity: 0.7;
        white-space: nowrap;
      }
      .hms-bw-book-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: ${accent};
        color: #ffffff !important;
        border: none;
        border-radius: 9999px;
        padding: 10px 18px;
        min-height: 44px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        box-shadow: 0 4px 14px rgba(0, 122, 255, 0.28);
        transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
        white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
      }
      .hms-bw-book-btn:hover {
        opacity: 0.92;
        transform: translateY(-1px);
      }
      .hms-bw-book-btn:active {
        transform: scale(0.97);
      }
      .hms-bw-close-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        min-width: 28px;
        min-height: 28px;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.05);
        color: inherit;
        opacity: 0.6;
        cursor: pointer;
        font-size: 14px;
        transition: opacity 0.2s, background 0.2s;
        padding: 0;
        margin-left: 2px;
      }
      @media (prefers-color-scheme: dark) {
        .hms-bw-close-btn {
          background: rgba(255, 255, 255, 0.1);
        }
      }
      .hms-bw-close-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }
      @media (max-width: 580px) {
        .hms-bw-subtitle {
          display: none;
        }
        .hms-bw-badge {
          display: none;
        }
        .hms-bw-glass-bar {
          padding: 6px 8px 6px 14px;
        }
        .hms-bw-book-btn {
          padding: 8px 14px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  function createWidgetDOM(config) {
    const container = document.createElement("aside");
    container.id = "hms-booking-widget-container";
    container.className = "hms-bw-wrapper";
    container.setAttribute("role", "complementary");
    container.setAttribute("aria-label", "Direct Hotel Booking Offer");

    const bar = document.createElement("div");
    bar.className = "hms-bw-glass-bar";

    const badge = document.createElement("span");
    badge.className = "hms-bw-badge";
    badge.textContent = `Save ${config.discount}`;
    bar.appendChild(badge);

    const textBlock = document.createElement("div");
    textBlock.className = "hms-bw-text-block";

    const titleSpan = document.createElement("span");
    titleSpan.className = "hms-bw-title";
    titleSpan.textContent = "Book Direct & Save";

    const subtitleSpan = document.createElement("span");
    subtitleSpan.className = "hms-bw-subtitle";
    subtitleSpan.textContent = `Official Rates for ${config.hotelName} • Free Cancellation`;

    textBlock.appendChild(titleSpan);
    textBlock.appendChild(subtitleSpan);
    bar.appendChild(textBlock);

    const ctaBtn = document.createElement("a");
    ctaBtn.className = "hms-bw-book-btn";
    ctaBtn.href = config.bookingUrl;
    ctaBtn.target = "_blank";
    ctaBtn.rel = "noopener noreferrer";
    ctaBtn.setAttribute(
      "aria-label",
      `Book directly at ${config.hotelName} and save ${config.discount}`,
    );
    ctaBtn.innerHTML = `
      <span>Check Availability</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Arrow icon">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    `;
    bar.appendChild(ctaBtn);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "hms-bw-close-btn";
    closeBtn.setAttribute("aria-label", "Dismiss direct booking bar");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      container.classList.add("hms-bw-hidden");
    });
    bar.appendChild(closeBtn);

    container.appendChild(bar);
    return container;
  }

  const config = getWidgetConfig();
  injectWidgetStyles(config.customAccent);
  const widgetContainer = createWidgetDOM(config);

  function mount() {
    if (!document.body.contains(widgetContainer)) {
      document.body.appendChild(widgetContainer);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
