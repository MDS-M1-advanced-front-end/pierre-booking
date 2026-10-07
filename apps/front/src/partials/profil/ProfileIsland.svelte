<!--
  Îlot de la page « Mon profil » (écran 05 ; cadrage.md § 4 « 05 ») : tout utilisateur connecté.
  La garde `RequireAuth` restaure la session ; le contenu (`ProfileContent`) n'est monté qu'ensuite,
  donc après que le jeton a été rendu au client de `core`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import ProfileContent from './ProfileContent.svelte';
</script>

<RequireAuth>
  {#snippet children(user)}
    <ProfileContent {user} />
  {/snippet}
</RequireAuth>
