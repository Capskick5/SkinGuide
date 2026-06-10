---
name: Aura Radiant System
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#574048'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#8b7079'
  outline-variant: '#debec8'
  surface-tint: '#b4136d'
  primary: '#b10e6b'
  on-primary: '#ffffff'
  primary-container: '#d23284'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb0cd'
  secondary: '#8a486f'
  on-secondary: '#ffffff'
  secondary-container: '#ffaeda'
  on-secondary-container: '#7c3d63'
  tertiary: '#b5005d'
  on-tertiary: '#ffffff'
  tertiary-container: '#da2676'
  on-tertiary-container: '#fffbff'
  error: '#EF4444'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e4'
  primary-fixed-dim: '#ffb0cd'
  on-primary-fixed: '#3e0022'
  on-primary-fixed-variant: '#8c0053'
  secondary-fixed: '#ffd8ea'
  secondary-fixed-dim: '#ffaeda'
  on-secondary-fixed: '#3a0329'
  on-secondary-fixed-variant: '#6f3157'
  tertiary-fixed: '#ffd9e2'
  tertiary-fixed-dim: '#ffb1c7'
  on-tertiary-fixed: '#3f001c'
  on-tertiary-fixed-variant: '#8e0048'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
  surface-soft: '#FFF5F9'
  border-pink: '#FBCFE8'
  primary-light: '#FCE7F3'
  success: '#10B981'
  warning: '#F59E0B'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  sidebar-width: 90px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  stack-gap: 16px
---

## Brand & Style

The brand identity centers on a fusion of clinical precision and wellness-inspired warmth. Designed for the intersection of AI technology and skincare, this design system evokes a sense of personalized care, cleanliness, and premium expertise. The visual tone is welcoming and light, moving away from sterile medical aesthetics toward a sophisticated "rose-water" minimalism.

The chosen style is **Modern SaaS Minimalism** with a **Tactile** influence. It utilizes a QuillBot-inspired structural layout—prioritizing focus and utility—while softening the interface with organic roundedness and delicate pink-tinted surfaces. The interface should feel airy, utilizing generous white space to reduce cognitive load and emphasize the professional, trustworthy nature of the AI analysis.

## Colors

The palette is anchored by a vibrant pink primary hue, symbolizing both the beauty industry and vitality. 

- **Primary & Tints:** The core pink is used for primary actions and active states. Soft tints (`primary-light`) serve as the foundation for chips and subtle highlights.
- **Backgrounds:** Pure white is the dominant background color to maintain a clean "clinical" feel, while `surface-soft` is used for secondary content sections or background depth to prevent the UI from feeling too cold.
- **Neutrals:** Text uses a deep slate-gray rather than pure black to maintain softness, while borders use a specific pink-tinted gray (`border-pink`) to unify the components with the brand theme.
- **Semantic Colors:** Standard success, warning, and error colors are used for skin analysis feedback, kept in line with accessible contrast standards.

## Typography

This design system uses **Inter** for its systematic clarity and modern proportions. The typographic hierarchy is designed to guide the user through complex data (like skin reports) with ease.

- **Headlines:** Use tight letter-spacing and semi-bold weights to create a strong visual anchor. Hero sections utilize "Display Hero" for high-impact branding.
- **Body:** Standardized at 16px for optimal readability across web views.
- **Captions:** Used for metadata, history timestamps, and secondary labels within the sidebar.
- **Scale:** On mobile devices, headline sizes should scale down to ensure content fits within the narrower viewport without excessive line breaks.

## Layout & Spacing

The layout is a **Fixed-Fluid Hybrid** model inspired by high-productivity SaaS tools.

- **Sidebar:** A narrow, icon-based vertical sidebar (90px) remains fixed to the left. It uses high-contrast icons with small labels to maximize the central workspace.
- **Main Canvas:** Content is centered in a max-width container (1200px) to ensure readability on large monitors. 
- **Grid:** A 12-column grid is used for dashboard layouts, allowing cards to span 3, 4, 6, or 12 columns.
- **Responsiveness:** On mobile, the sidebar transitions to a bottom navigation bar or a hidden drawer, and margins reduce to 16px.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Soft Shadows**. 

Instead of heavy black shadows, this design system utilizes "Pink-Tinted Ambient Shadows" (e.g., `rgba(236, 72, 153, 0.08)`). These shadows are extremely diffused with a large blur radius, making cards appear to float gently above the `surface-soft` background.

Surfaces use low-contrast outlines (`border-pink`) to define boundaries without creating visual noise. This "ghost border" technique ensures that the UI remains clean and "SaaS-like" while maintaining the premium skincare aesthetic.

## Shapes

The shape language is defined by **Pill-shaped** and **Generously Rounded** geometry. 

- **Interactive Elements:** All buttons, chips, and input focus rings use a full "pill" radius to evoke a friendly, approachable feel.
- **Containers:** Dashboard cards and modal windows use a `rounded-lg` (16px) or `rounded-xl` (24px) radius, mirroring the soft contours of facial features and skincare packaging.

## Components

- **Buttons:** Primary buttons are pill-shaped with a gradient (`linear 135deg from #F9A8D4 to #EC4899`). Secondary buttons use a white fill with a `border-pink` outline.
- **Sidebar Items:** Icons should be medium-stroke (2px). The active state is indicated by a pink vertical bar or a soft pink circular background behind the icon.
- **Cards:** Cards must have a 1px border in `border-pink` and a subtle tinted shadow. Inside, icons are often placed in the top-left within a `primary-light` circular container.
- **Chips/Tags:** Used for skin types (e.g., "Oily", "Sensitive"). These are pill-shaped, using `primary-light` backgrounds with `tertiary` (pink 600) text for high legibility.
- **Inputs:** Text fields use a large 16px corner radius with a soft pink focus ring. Labels are positioned above the field in `label-md`.
- **Progress Indicators:** Circular gauges are recommended for skin analysis scores, utilizing the primary pink gradient to visualize health metrics.