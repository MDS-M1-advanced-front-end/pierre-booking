<!--
  Îlot de l'écran 09 « Ajouter / modifier une salle » : garde d'accès (gestionnaire ou
  administrateur) autour de `RoomForm`. Monté en `client:only="svelte"` par
  `pages/gestion/salles/nouvelle.astro` (sans `roomId`) et `[id]/modifier.astro` (avec).

  Props :
    roomId?: string   salle à modifier ; absent en création
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import RoomForm from './RoomForm.svelte';

  interface Props {
    roomId?: string;
  }

  let { roomId }: Props = $props();
</script>

<RequireAuth roles={['GESTIONNAIRE', 'ADMINISTRATEUR']}>
  {#snippet children(user)}
    <RoomForm {user} {roomId} />
  {/snippet}
</RequireAuth>
