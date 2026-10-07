<!--
  Îlot de l'écran 10 « Disponibilités » : garde d'accès (gestionnaire ou administrateur) autour de
  `AvailabilityEditor`. Monté en `client:only="svelte"` par
  `pages/gestion/salles/[id]/disponibilites.astro`.

  Props :
    roomId: string   identifiant de la salle (paramètre de route)
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import AvailabilityEditor from './AvailabilityEditor.svelte';

  interface Props {
    roomId: string;
  }

  let { roomId }: Props = $props();
</script>

<RequireAuth roles={['GESTIONNAIRE', 'ADMINISTRATEUR']}>
  {#snippet children(user)}
    <AvailabilityEditor {roomId} {user} />
  {/snippet}
</RequireAuth>
