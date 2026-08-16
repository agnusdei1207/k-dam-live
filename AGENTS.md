# Agent Operating Contract & Code Quality Guidelines (k-dam-live)

## 📌 Repository Core Principles & Technology Contract

1. **Pure Edge Static Architecture**:
   - Zero runtime framework dependencies (React/Next/Vue/Tailwind runtime bundles forbidden unless explicitly instructed).
   - Lightweight, dependency-free vanilla JavaScript (ESM / modular IIFE) + native CSS Tokens.
   - Clean, performant, and accessible DOM manipulation without bloated virtual DOMs or external heavy libraries.

2. **Clean Repository Hygiene & Zero Legacy Cruft**:
   - **Never leave scratch scripts, temporary debug artifacts, or unused image assets** in the repository root or subdirectories.
   - Any refactoring or feature implementation must clean up orphaned CSS classes, unused dataset properties, and dead event handlers immediately.
   - Maintain a 100% clean, minimal file tree (`index.html`, `css/`, `js/`, `favicon.svg`, `robots.txt`, `sitemap.xml`, `.github/`).

3. **Geographical & Hydrological Domain Integrity**:
   - 34 South Korean dams with authentic WGS84 coordinates (`lat`, `lng`), catchment areas, full water levels, and total storage capacities.
   - Geolocation Haversine spherical calculations must remain mathematically accurate.
   - User coordinates and location preference must be safely persisted in `localStorage` (`kdam_user_location`, `kdam_geo_active`) for frictionless, zero-latency subsequent visits.

4. **UI/UX & Accessibility Standards (Radix / shadcn-grade)**:
   - **Eye-comfort Warm Palette**: Maintain the soothing dark (`#191715`) and light parchment (`#f4efe3`) theme tokens inherited from `/study`. Avoid piercing pure `#ffffff` or unnatural vibrant neons.
   - **Rock-Solid Table Layout**: Zero jitter or vertical/horizontal layout shifts during data filter changes. Keep column min-widths balanced and proportional.
   - **Full Visibility without PC Horizontal Scrolling**: 10 columns must fit seamlessly within standard desktop/laptop viewports.
   - **Smooth Animations**: Modal open/close, theme switches, and location banners must use buttery cubic-bezier easing (`0.16, 1, 0.3, 1`) with graceful exit/closing keyframes.

5. **Commit & Push Conventions**:
   - Use the configured maintainer git identity (`user.name: agnusdei1207`, `user.email: agnusdei1207@gmail.com`).
   - **Do NOT add AI assistant names, tool names, or co-author trailers** to commit messages.
   - Every commit must be concise, structured (`feat:`, `fix:`, `refactor:`, `ci:`), and pass `node --check` syntax validation before pushing.
