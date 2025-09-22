export const criticalCss = `:root {
  color-scheme: light;
  --critical-bg: #f8fafc;
  --critical-fg: #0f172a;
  --critical-muted: #475569;
  --critical-primary: #2563eb;
  --critical-border: rgba(15, 23, 42, 0.08);
  --critical-card: rgba(255, 255, 255, 0.85);
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --critical-bg: #0b1220;
    --critical-fg: #e2e8f0;
    --critical-muted: #94a3b8;
    --critical-primary: #93c5fd;
    --critical-border: rgba(148, 163, 184, 0.2);
    --critical-card: rgba(15, 23, 42, 0.7);
  }
}

body.critical-body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-sans, 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  background-color: var(--critical-bg);
  color: var(--critical-fg);
}

body.critical-body * {
  box-sizing: border-box;
}

[data-critical="header"] {
  position: sticky;
  top: 0;
  z-index: 40;
  width: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--critical-border);
}

@media (prefers-color-scheme: dark) {
  [data-critical="header"] {
    background: rgba(15, 23, 42, 0.9);
    border-bottom-color: rgba(148, 163, 184, 0.28);
  }
}

[data-critical="header-container"] {
  max-width: 1200px;
  margin: 0 auto;
  height: 4rem;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

[data-critical="main-nav"] {
  display: none;
}

@media (min-width: 768px) {
  [data-critical="main-nav"] {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
}

[data-critical="logo"] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

[data-critical="logo-subtitle"] {
  display: block;
  font-size: 0.75rem;
  color: var(--critical-muted);
  font-weight: 500;
}

[data-critical="main-nav-items"] {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 0.875rem;
  color: var(--critical-muted);
}

[data-critical="header-actions"] {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

[data-critical="header-auth"] {
  display: none;
  align-items: center;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  [data-critical="header-auth"] {
    display: flex;
  }
}

[data-critical="header-theme"] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

[data-critical="hero"] {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--critical-border);
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.28), transparent 65%),
    linear-gradient(to bottom, rgba(37, 99, 235, 0.06), rgba(255, 255, 255, 0));
}

@media (prefers-color-scheme: dark) {
  [data-critical="hero"] {
    background:
      radial-gradient(circle at top, rgba(59, 130, 246, 0.2), transparent 60%),
      linear-gradient(to bottom, rgba(37, 99, 235, 0.18), rgba(2, 6, 23, 0.92));
    border-bottom-color: rgba(148, 163, 184, 0.24);
  }
}

[data-critical="hero-container"] {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 6rem 1.5rem 4rem;
  text-align: center;
}

[data-critical="hero-badge"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding: 0.4rem 1.15rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: rgba(37, 99, 235, 0.15);
  color: var(--critical-primary);
  border: 1px solid rgba(37, 99, 235, 0.35);
  text-transform: lowercase;
}

[data-critical="hero-title"] {
  margin-top: 1.5rem;
  font-size: clamp(2.5rem, 5vw, 3.75rem);
  line-height: 1.1;
  font-weight: 600;
  color: var(--critical-fg);
}

[data-critical="hero-description"] {
  margin: 1rem auto 0;
  max-width: 640px;
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--critical-muted);
}

[data-critical="hero-cta"] {
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

@media (min-width: 640px) {
  [data-critical="hero-cta"] {
    flex-direction: row;
    justify-content: center;
  }
}

[data-critical="hero-primary"],
[data-critical="hero-secondary"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 2.4rem;
  border-radius: 0.75rem;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

[data-critical="hero-primary"] {
  background: linear-gradient(135deg, rgba(37, 99, 235, 1), rgba(79, 70, 229, 1));
  color: #ffffff;
  box-shadow: 0 18px 45px rgba(37, 99, 235, 0.35);
}

[data-critical="hero-primary"]:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 50px rgba(37, 99, 235, 0.4);
}

[data-critical="hero-secondary"] {
  border: 1px solid rgba(37, 99, 235, 0.35);
  background: rgba(255, 255, 255, 0.86);
  color: var(--critical-primary);
}

[data-critical="hero-secondary"]:hover {
  background: rgba(37, 99, 235, 0.08);
}

@media (prefers-color-scheme: dark) {
  [data-critical="hero-secondary"] {
    background: rgba(15, 23, 42, 0.65);
    border-color: rgba(148, 163, 184, 0.3);
    color: #bfdbfe;
  }
}

[data-critical="hero-metrics"] {
  margin-top: 3rem;
  display: grid;
  gap: 1rem;
}

@media (min-width: 640px) {
  [data-critical="hero-metrics"] {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

[data-critical="hero-metric"] {
  border-radius: 1.25rem;
  border: 1px solid var(--critical-border);
  background: var(--critical-card);
  padding: 1.35rem;
  text-align: left;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

@media (prefers-color-scheme: dark) {
  [data-critical="hero-metric"] {
    background: rgba(15, 23, 42, 0.7);
    box-shadow: 0 22px 45px rgba(2, 6, 23, 0.65);
  }
}

[data-critical="hero-metric-value"] {
  display: block;
  font-size: 2rem;
  font-weight: 600;
  color: var(--critical-fg);
}

[data-critical="hero-metric-label"] {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.9rem;
  color: var(--critical-muted);
}

[data-critical="hero-background"] {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

`
