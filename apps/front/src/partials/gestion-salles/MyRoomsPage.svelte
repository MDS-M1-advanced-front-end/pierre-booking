<!--
  Îlot de l'écran 08 « Mes salles » : garde d'accès (gestionnaire ou administrateur) autour de
  `MyRooms`. Monté en `client:only="svelte"` par `pages/gestion/salles/index.astro`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import MyRooms from './MyRooms.svelte';
</script>

<RequireAuth roles={['GESTIONNAIRE', 'ADMINISTRATEUR']}>
  {#snippet children(user)}
    <MyRooms userId={user.id} />
  {/snippet}
</RequireAuth>
