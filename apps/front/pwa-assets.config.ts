import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icônes de la PWA, générées depuis le logo (public/favicon.svg) : pnpm generate:pwa-assets.
// Préréglage « minimal 2023 » : favicon.ico, icônes 64, 192 et 512 px, icône « maskable » (Android
// la découpe en cercle ou en carré arrondi : le logo est mis en retrait sur un fond plein) et icône
// Apple 180 px. Le fond des icônes maskable et Apple reprend --color-action, pour que le logo
// sarcelle ne se détache pas sur un fond blanc.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0f5e5a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0f5e5a' } },
  },
  images: ['public/favicon.svg'],
});
