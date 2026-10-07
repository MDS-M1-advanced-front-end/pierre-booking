<!--
  Îlot de la page de connexion (écran 03 ; cadrage.md § 4 « 03 », § 2.3).

  - Utilisateur déjà connecté : redirection immédiate vers `redirect` (s'il est sûr) ou sa page
    d'accueil (`resolveRedirect`).
  - `401` : message générique, qui ne dit pas lequel des deux champs est faux.
  - Succès : session enregistrée par `login()`, puis `location.assign(resolveRedirect(…))`.
  - Pas de lien « Mot de passe oublié » : aucun endpoint (anomalie 10).
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import Field from '../../components/Field.svelte';
  import Input from '../../components/Input.svelte';
  import { login } from '../../data/auth/auth.queries';
  import { restoreSession } from '../../data/auth/session.svelte';
  import { errorMessage } from '../../data/errors';
  import { resolveRedirect } from '../../utils/redirect';
  import { fieldValidationMessage, type ValidationOptions } from '../../utils/validationMessage';
  import AuthCard from './AuthCard.svelte';

  const redirect = new URL(location.href).searchParams.get('redirect');
  const signupHref = redirect
    ? `/inscription?redirect=${encodeURIComponent(redirect)}`
    : '/inscription';

  const rules = {
    email: { subject: "L'adresse e-mail" },
    password: { subject: 'Le mot de passe' },
  } satisfies Record<string, ValidationOptions>;

  type FieldName = keyof typeof rules;

  /** Faux tant qu'on vérifie l'existence d'une session (évite d'afficher le formulaire pour rien). */
  let ready = $state(false);
  let email = $state('');
  let password = $state('');
  let errors = $state<Record<FieldName, string | null>>({ email: null, password: null });
  let failure = $state<string | null>(null);
  let submitting = $state(false);
  let form = $state<HTMLFormElement>();

  onMount(() => {
    const user = restoreSession();
    if (user) {
      location.replace(resolveRedirect(redirect, user.role));
      return;
    }
    ready = true;
  });

  function control(name: FieldName): HTMLInputElement | null {
    const element = form?.elements.namedItem(name);
    return element instanceof HTMLInputElement ? element : null;
  }

  /** Revalide un champ déjà en erreur à la sortie (cadrage.md § 2.6). */
  function revalidate(name: FieldName, element: HTMLInputElement): void {
    if (errors[name]) errors[name] = fieldValidationMessage(element, rules[name]);
  }

  async function onsubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    failure = null;

    const names: FieldName[] = ['email', 'password'];
    for (const name of names) {
      const element = control(name);
      errors[name] = element ? fieldValidationMessage(element, rules[name]) : null;
    }
    const firstInvalid = names.find((name) => errors[name]);
    if (firstInvalid) {
      await tick();
      control(firstInvalid)?.focus();
      return;
    }

    submitting = true;
    const result = await login({ email: email.trim(), password });
    if (result.ok) {
      location.assign(resolveRedirect(redirect, result.data.user.role));
      return;
    }
    submitting = false;
    failure =
      result.error.status === 401
        ? 'Adresse e-mail ou mot de passe incorrect.'
        : errorMessage(result.error);
  }
</script>

{#if ready}
  <AuthCard title="Connexion">
    {#snippet intro()}Retrouvez vos réservations et réservez en quelques clics.{/snippet}

    {#if failure}
      <Alert variant="danger" title="Connexion impossible">
        <p>{failure}</p>
      </Alert>
    {/if}

    <form bind:this={form} class="flex flex-col gap-(--space-4)" novalidate {onsubmit}>
      <Field label="Adresse e-mail" id="email" error={errors.email}>
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            onblur={(event) => revalidate('email', event.currentTarget)}
          />
        {/snippet}
      </Field>
      <Field label="Mot de passe" id="password" error={errors.password}>
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="password"
            type="password"
            autocomplete="current-password"
            required
            bind:value={password}
            onblur={(event) => revalidate('password', event.currentTarget)}
          />
        {/snippet}
      </Field>
      <Button type="submit" block aria-busy={submitting} aria-disabled={submitting}>
        Se connecter
      </Button>
    </form>

    {#snippet switchLink()}
      Pas encore de compte ? <a href={signupHref}>Créer un compte</a>
    {/snippet}
  </AuthCard>
{:else}
  <p class="visually-hidden" role="status">Chargement…</p>
{/if}
