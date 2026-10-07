<script lang="ts">
  import type { Room } from '@room-booking/core';
  import { formatPrice } from '../utils/formatPrice';
  import Badge from './Badge.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    room: Room;
    /** Destination du lien ; par défaut la fiche de la salle. */
    href?: string;
  }

  let { room, href }: Props = $props();

  const isActive = $derived(room.status === 'ACTIVE');
  const equipment = $derived(room.equipment ?? []);
  const link = $derived(href ?? `/salles/${room.id}`);
</script>

<!--
  Toute la carte est cliquable (pseudo-élément ::after du lien), mais un seul lien est annoncé :
  le nom de la salle. L'anneau de focus est porté par la carte quand le lien a le focus.
-->
<article
  class={[
    'relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm',
    'transition-shadow duration-(--duration-fast) ease-(--easing-standard) hover:shadow-md',
    'has-[a:focus-visible]:outline-(length:--focus-ring-width) has-[a:focus-visible]:outline-offset-(--focus-ring-offset) has-[a:focus-visible]:outline-(--color-focus) has-[a:focus-visible]:outline-solid',
  ]}
>
  {#if room.imageUrl}
    <img
      class={['aspect-video w-full object-cover', !isActive && 'grayscale']}
      src={room.imageUrl}
      alt=""
      loading="lazy"
    />
  {:else}
    <div
      class={[
        'grid aspect-video place-items-center bg-action-subtle text-action',
        'bg-[linear-gradient(135deg,transparent_48%,var(--palette-teal-100)_48%,var(--palette-teal-100)_52%,transparent_52%)]',
        !isActive && 'grayscale',
      ]}
      aria-hidden="true"
    >
      <Icon name="building" class="size-10 rounded-full bg-surface p-(--space-2) stroke-[1.5]" />
    </div>
  {/if}

  <div class="flex flex-1 flex-col gap-(--space-2) p-(--space-4)">
    <h3 class="text-md">
      <a
        class="text-text no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        href={link}>{room.name}</a
      >
    </h3>

    <p class="flex flex-wrap gap-x-(--space-4) gap-y-(--space-1) text-sm text-text-muted">
      <span class="inline-flex items-center gap-(--space-1)">
        <Icon name="pin" />
        {room.location}
      </span>
      <span class="inline-flex items-center gap-(--space-1)">
        <Icon name="users" />
        {room.capacity} pers. max
      </span>
    </p>

    {#if equipment.length > 0}
      <ul class="flex flex-wrap gap-(--space-1)" aria-label="Équipements">
        {#each equipment as item (item)}
          <li
            class="rounded-sm border border-border bg-bg px-(--space-2) py-0.5 text-xs text-text-muted"
          >
            {item}
          </li>
        {/each}
      </ul>
    {/if}

    <div class="mt-auto flex items-baseline justify-between pt-(--space-2)">
      {#if !isActive}
        <Badge variant="neutral">Inactive</Badge>
      {/if}
      <p class="ml-auto text-lg font-bold">
        {formatPrice(room.pricePerHour)}
        <small class="text-sm font-regular text-text-muted">/ heure</small>
      </p>
    </div>
  </div>
</article>
