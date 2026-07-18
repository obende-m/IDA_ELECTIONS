---
name: Sovereign Trust System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#4d4635'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#7f7663'
  outline-variant: '#d0c5af'
  surface-tint: '#735c00'
  primary: '#735c00'
  on-primary: '#ffffff'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#e9c349'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#5d5f5b'
  on-tertiary: '#ffffff'
  tertiary-container: '#b2b3af'
  on-tertiary-container: '#444542'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e3e3de'
  tertiary-fixed-dim: '#c6c7c2'
  on-tertiary-fixed: '#1a1c19'
  on-tertiary-fixed-variant: '#454744'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
spacing:
  base: 8px
  margin-mobile: 24px
  margin-desktop: 64px
  gutter: 32px
  container-max: 1280px
---

## Brand & Style

The design system is engineered to project **institutional authority, absolute transparency, and civic stability**. For the IDA Electronic Voting System, the visual language must transcend trends, opting instead for a "Government-Grade Minimalism" that prioritizes clarity over decoration. 

The aesthetic is characterized by:
- **High-Contrast Precision:** Utilizing a stark Black/White base to ensure maximum readability for all demographics.
- **Premium Accents:** Strategic use of Premium Gold to signify the gravity and value of the democratic process.
- **Utilitarian Elegance:** A focus on structured data, generous negative space, and a lack of unnecessary ornamentation to foster a sense of security and focus.
- **Institutional Weight:** Bold, unwavering typography and thick strokes for structural elements to communicate strength and reliability.

## Colors

The palette is rooted in a tri-color hierarchy that emphasizes importance and accessibility.

- **Primary Gold (#D4AF37):** Reserved exclusively for high-value interactions, verified states, and primary calls to action. It symbolizes the "Golden Standard" of the voting process.
- **Deep Black (#000000):** Used for primary text and heavy structural borders to establish an authoritative ground.
- **Pure White (#FFFFFF):** The primary canvas color, ensuring a clean and legible interface.
- **Surface Neutral (#F5F5F0):** A warm, off-white used for secondary containers and background grouping to reduce eye strain while maintaining a premium feel.
- **Semantic Feedback:** Success states should utilize a deep forest green, while error states use a high-visibility crimson, both balanced to maintain contrast against the gold and black.

## Typography

This design system utilizes **Inter** for its neutral, highly legible, and systematic qualities. The type hierarchy is intentionally "top-heavy" with bold, authoritative headlines to guide users through the voting stages with confidence.

- **Headlines:** Use tight letter-spacing and heavy weights (700+) to command attention.
- **Body:** Standardized at 16px for optimal legibility across all age groups.
- **Labels:** Capitalized and tracked-out for metadata, ensuring a clear distinction from interactive content.
- **Scaling:** For mobile devices, headline sizes scale down strictly to maintain a single-column integrity without breaking word wraps.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid with Fluid Margins**. This ensures that the voting experience remains consistent and centered, creating a focused "stage" for the user.

- **Grid:** A 12-column grid is used for desktop (max-width 1280px) to handle complex data tables and analytics. 
- **Spaciousness:** Generous gutters (32px) and margins (64px) are used to prevent information density from overwhelming the user, fostering a calm, premium environment.
- **Mobile:** On mobile, the layout collapses to a single column with 24px side margins to accommodate larger touch targets.
- **Rhythm:** All vertical spacing follows an 8px base unit (8, 16, 24, 32, 48, 64) to maintain mathematical harmony across all components.

## Elevation & Depth

To maintain a "Government-Grade" feel, this design system avoids soft shadows and excessive blurs, opting instead for **Tonal Layering and Sharp Outlines**.

- **Surface Tiers:** Background is White (#FFFFFF). Secondary containers use Surface Neutral (#F5F5F0). Third-level interactive elements (like input fields) use a 1px solid Black (#000000) border.
- **Strict Flatness:** Depth is conveyed through structural lines rather than shadows. This mimics the feel of high-end official documents.
- **Active State:** When an element is selected or focused, it gains a 2px Primary Gold (#D4AF37) border. No ambient shadows are permitted, ensuring the UI feels "fast" and electronically native.

## Shapes

The design system utilizes **Sharp (0px)** corners for all primary UI elements. 

- **Rationale:** Sharp corners evoke precision, technical accuracy, and institutional rigidity. 
- **Exceptions:** Circular geometry is reserved strictly for user avatars or specific status indicators to provide a soft contrast to the otherwise rectangular, high-security grid.
- **Dividers:** 2px solid lines are used to separate content sections, reinforcing the "form-based" nature of the voting system.

## Components

### Buttons
- **Primary:** Solid Black (#000000) background, White text, 0px radius. On hover, the border changes to Primary Gold.
- **Secondary:** White background, 2px Black border, Black text. 
- **Action:** For the final "Cast Vote" action, use a Primary Gold background with Black text for maximum visibility.

### Form Fields (High-Security)
- Inputs feature a heavy 2px Black bottom border only. 
- Labels sit above the field in Label-MD style.
- Focus state triggers a full 2px Primary Gold box around the input to signify active data entry.

### Data Tables
- Header rows use Surface Neutral (#F5F5F0) with Black text.
- Row dividers are 1px light grey (#E0E0E0).
- High-contrast text only; no alternating row colors to keep the interface clean.

### Professional Analytics Cards
- Flat cards with a 1px Black border.
- Headers are separated by a 2px Gold top-accent line.
- Content is strictly aligned to the 8px grid, using Bold-MD headlines for key metrics.

### Verification Chips
- Small, rectangular tags with Primary Gold backgrounds and Black text, used to indicate "Verified" or "Secure" statuses.