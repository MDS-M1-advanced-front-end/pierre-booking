<script lang="ts" module>
  // Icônes de la maquette Quorum (tracés repris de maquettes/composants.html et ecrans/).
  const paths = {
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    building:
      '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    euro: '<path d="M4 10h12M4 14h9M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    trash:
      '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
  } as const;

  export type IconName = keyof typeof paths;
</script>

<script lang="ts">
  interface Props {
    name: IconName;
    class?: string;
  }

  let { name, class: className }: Props = $props();

  // Taille par défaut seulement si l'appelant n'en donne pas : dans la feuille générée par
  // Tailwind, `size-[1.25em]` arrive après `size-10` et l'emporterait sinon.
  const hasSize = $derived(/(^|\s)size-/.test(className ?? ''));
</script>

<svg
  class={[!hasSize && 'size-[1.25em]', 'flex-none', className]}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- tracés statiques de la maquette, jamais de donnée externe -->
  {@html paths[name]}
</svg>
