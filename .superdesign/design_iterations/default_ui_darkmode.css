/* ========================================
   Dark Mode UI Framework
   A beautiful dark mode design system
   ======================================== */

/* ========================================
   CSS Variables & Theme
   ======================================== */
:root {
    /* Dark Mode Color Palette */
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    
    /* Spacing & Layout */
    --radius: 0.625rem;
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 0.75rem;
    --spacing-lg: 1rem;
    --spacing-xl: 1.5rem;
    --spacing-2xl: 2rem;
    --spacing-3xl: 3rem;
    
    /* Typography */
    --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2.25rem;
}

/* ========================================
   Base Styles
   ======================================== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-family);
    line-height: 1.6;
    min-height: 100vh;
}

html.dark {
    color-scheme: dark;
}

/* ========================================
   Layout Components
   ======================================== */
.container {
    max-width: 64rem;
    margin: 0 auto;
    padding: var(--spacing-2xl) var(--spacing-lg);
}

.container-sm {
    max-width: 42rem;
}

.container-lg {
    max-width: 80rem;
}

.grid {
    display: grid;
}

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-auto { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }
.gap-xl { gap: var(--spacing-xl); }

.flex {
    display: flex;
}

.flex-col {
    flex-direction: column;
}

.items-center {
    align-items: center;
}

.justify-center {
    justify-content: center;
}

.justify-between {
    justify-content: space-between;
}

.text-center {
    text-align: center;
}

/* ========================================
   Card Components
   ======================================== */
.card {
    background-color: var(--card);
    color: var(--card-foreground);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) + 4px);
    padding: var(--spacing-xl);
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    transition: all 0.2s ease;
}

.card:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* ========================================
   Button Components
   ======================================== */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    white-space: nowrap;
    border-radius: var(--radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-lg);
    min-height: 2.25rem;
    outline: none;
    text-decoration: none;
}

.btn:disabled {
    pointer-events: none;
    opacity: 0.5;
}

.btn-primary {
    background-color: var(--primary);
    color: var(--primary-foreground);
}

.btn-primary:hover {
    background-color: rgba(236, 236, 236, 0.9);
}

.btn-outline {
    background-color: transparent;
    border: 1px solid var(--border);
    color: var(--foreground);
}

.btn-outline:hover {
    background-color: var(--accent);
}

.btn-ghost {
    background-color: transparent;
    color: var(--foreground);
}

.btn-ghost:hover {
    background-color: var(--accent);
}

.btn-destructive {
    background-color: var(--destructive);
    color: white;
}

.btn-destructive:hover {
    background-color: rgba(220, 38, 38, 0.9);
}

/* Button Sizes */
.btn-sm {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: var(--font-size-xs);
    min-height: 2rem;
}

.btn-lg {
    padding: var(--spacing-md) var(--spacing-xl);
    font-size: var(--font-size-base);
    min-height: 2.75rem;
}

.btn-icon {
    padding: var(--spacing-sm);
    width: 2.25rem;
    height: 2.25rem;
}

/* ========================================
   Form Components
   ======================================== */
.form-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--spacing-sm) var(--spacing-md);
    color: var(--foreground);
    font-size: var(--font-size-sm);
    outline: none;
    transition: all 0.2s;
}

.form-input:focus {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px rgba(136, 136, 136, 0.5);
}

.form-input::placeholder {
    color: var(--muted-foreground);
}

/* ========================================
   Badge Components
   ======================================== */
.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius);
    border: 1px solid;
    padding: 0.125rem var(--spacing-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
}

/* Priority Badge Variants */
.badge-priority-high {
    background: rgba(127, 29, 29, 0.3);
    color: rgb(252, 165, 165);
    border: 1px solid rgba(153, 27, 27, 0.5);
}

.badge-priority-medium {
    background: rgba(120, 53, 15, 0.3);
    color: rgb(252, 211, 77);
    border: 1px solid rgba(146, 64, 14, 0.5);
}

.badge-priority-low {
    background: rgba(20, 83, 45, 0.3);
    color: rgb(134, 239, 172);
    border: 1px solid rgba(22, 101, 52, 0.5);
}

/* ========================================
   Tab Components
   ======================================== */
.tab-list {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xl);
}

.tab-button {
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--foreground);
    text-transform: capitalize;
    font-weight: 500;
    transition: all 0.2s ease;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: var(--font-size-sm);
}

.tab-button:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
}

.tab-button.active {
    background-color: #f8f9fa !important;
    color: #1a1a1a !important;
    border-color: #f8f9fa !important;
    font-weight: 600;
}

.tab-button.active:hover {
    background-color: #e9ecef !important;
    border-color: #e9ecef !important;
}

/* ========================================
   Typography
   ======================================== */
.text-xs { font-size: var(--font-size-xs); }
.text-sm { font-size: var(--font-size-sm); }
.text-base { font-size: var(--font-size-base); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }
.text-2xl { font-size: var(--font-size-2xl); }
.text-3xl { font-size: var(--font-size-3xl); }
.text-4xl { font-size: var(--font-size-4xl); }

.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.text-primary { color: var(--primary); }
.text-muted { color: var(--muted-foreground); }
.text-destructive { color: var(--destructive); }

.gradient-text {
    background: linear-gradient(to right, var(--primary), rgba(236, 236, 236, 0.6));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* ========================================
   Icon System
   ======================================== */
.icon {
    width: 1rem;
    height: 1rem;
    fill: currentColor;
    flex-shrink: 0;
}

.icon-sm { width: 0.875rem; height: 0.875rem; }
.icon-lg { width: 1.25rem; height: 1.25rem; }
.icon-xl { width: 1.5rem; height: 1.5rem; }
.icon-2xl { width: 2rem; height: 2rem; }

/* ========================================
   Interactive Components
   ======================================== */
.checkbox {
    width: 1rem;
    height: 1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.2s;
}

.checkbox:hover {
    border-color: var(--ring);
}

.checkbox.checked {
    background-color: rgb(22, 163, 74);
    border-color: rgb(22, 163, 74);
}

.checkbox.checked::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 0.75rem;
    font-weight: bold;
}

/* ========================================
   List Components
   ======================================== */
.list-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background-color 0.2s;
}

.list-item:hover {
    background-color: rgba(255, 255, 255, 0.025);
}

.list-item:last-child {
    border-bottom: none;
}

.list-item.completed {
    opacity: 0.6;
}

/* ========================================
   Empty State Component
   ======================================== */
.empty-state {
    text-align: center;
    padding: var(--spacing-3xl) var(--spacing-lg);
    color: var(--muted-foreground);
}

.empty-state .icon {
    width: 3rem;
    height: 3rem;
    margin: 0 auto var(--spacing-lg);
    opacity: 0.5;
}

/* ========================================
   Utility Classes
   ======================================== */
.hidden { display: none; }
.block { display: block; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }

.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }

.opacity-50 { opacity: 0.5; }
.opacity-60 { opacity: 0.6; }
.opacity-75 { opacity: 0.75; }

.transition-all { transition: all 0.2s ease; }
.transition-colors { transition: color 0.2s ease, background-color 0.2s ease; }
.transition-opacity { transition: opacity 0.2s ease; }

/* ========================================
   Responsive Design
   ======================================== */
@media (max-width: 768px) {
    .container {
        padding: var(--spacing-lg);
    }
    
    .grid-cols-auto {
        grid-template-columns: 1fr;
    }
    
    .flex-col-mobile {
        flex-direction: column;
    }
    
    .text-center-mobile {
        text-align: center;
    }
    
    .gap-sm-mobile { gap: var(--spacing-sm); }
    
    .hidden-mobile { display: none; }
    .block-mobile { display: block; }
}

@media (max-width: 640px) {
    .text-2xl { font-size: var(--font-size-xl); }
    .text-3xl { font-size: var(--font-size-2xl); }
    .text-4xl { font-size: var(--font-size-3xl); }
    
    .container {
        padding: var(--spacing-lg) var(--spacing-sm);
    }
}

/* ========================================
   Animation Utilities
   ======================================== */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

/* ========================================
   Focus & Accessibility
   ======================================== */
.focus-visible:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}