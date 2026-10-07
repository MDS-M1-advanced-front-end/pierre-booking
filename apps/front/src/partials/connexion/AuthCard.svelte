<!--
  Carte centrée des pages d'authentification (maquette : `.auth`, `.card`, `.auth__switch` ;
  ecrans/03-connexion.html, 04-inscription.html). Partagée par la connexion et l'inscription,
  et rendue en HTML statique dans le contenu de repli des pages.

  Props :
    title: string        titre `h1` de la carte
    intro?: Snippet      paragraphe sous le titre (texte atténué)
    switchLink?: Snippet ligne centrée sous la carte (« Pas encore de compte ? … »)
    children?: Snippet   corps de la carte (alertes, formulaire)
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    intro?: Snippet;
    switchLink?: Snippet;
    children?: Snippet;
  }

  let { title, intro, switchLink, children }: Props = $props();
</script>

<div
  class="mx-auto flex max-w-(--size-container-narrow) flex-col gap-(--space-4) md:pt-(--space-6)"
>
  <div class="rounded-lg border border-border bg-surface shadow-sm">
    <div class="flex flex-col gap-(--space-4) p-(--space-5) md:p-(--space-6)">
      <div class="flex flex-col gap-(--space-2)">
        <h1>{title}</h1>
        {#if intro}
          <p class="text-text-muted">{@render intro()}</p>
        {/if}
      </div>
      {@render children?.()}
    </div>
  </div>
  {#if switchLink}
    <p class="text-center">{@render switchLink()}</p>
  {/if}
</div>
