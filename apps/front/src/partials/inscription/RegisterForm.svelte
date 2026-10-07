<!--
  Îlot de la page d'inscription (écran 04 ; cadrage.md § 4 « 04 », § 2.6).

  - Formulaire `novalidate` : contraintes HTML natives lues par `fieldValidationMessage` à la
    soumission, puis à la sortie de chaque champ en erreur.
  - Soumission en erreur : récapitulatif focalisé (`ErrorSummary`) avec un lien par champ, et
    message sous chaque champ.
  - `register()` crée le compte puis connecte (décision 7) ; `409` → e-mail déjà utilisé.
  - Succès : `redirect` s'il est sûr, sinon le catalogue (fiche 04 du cadrage).
  - Utilisateur déjà connecté : redirigé comme sur la page de connexion.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import ErrorSummary, { type ErrorSummaryItem } from '../../components/ErrorSummary.svelte';
  import Field from '../../components/Field.svelte';
  import Input from '../../components/Input.svelte';
  import { register } from '../../data/auth/auth.queries';
  import { restoreSession } from '../../data/auth/session.svelte';
  import { errorMessage } from '../../data/errors';
  import { resolveRedirect, safeRedirectPath } from '../../utils/redirect';
  import {
    fieldValidationMessage,
    type ValidatableElement,
    type ValidationOptions,
  } from '../../utils/validationMessage';
  import AuthCard from '../connexion/AuthCard.svelte';

  type FieldName = 'firstName' | 'lastName' | 'email' | 'password';

  interface FieldConfig {
    /** `id` du contrôle, cible des liens du récapitulatif (ceux de la maquette). */
    id: string;
    label: string;
    rules: ValidationOptions;
  }

  const fields: Record<FieldName, FieldConfig> = {
    firstName: { id: 'firstName', label: 'Prénom', rules: { subject: 'Le prénom' } },
    lastName: { id: 'lastName', label: 'Nom', rules: { subject: 'Le nom' } },
    email: { id: 'reg-email', label: 'Adresse e-mail', rules: { subject: "L'adresse e-mail" } },
    password: { id: 'reg-password', label: 'Mot de passe', rules: { subject: 'Le mot de passe' } },
  };
  const order: FieldName[] = ['firstName', 'lastName', 'email', 'password'];

  const redirect = new URL(location.href).searchParams.get('redirect');
  const loginHref = redirect ? `/connexion?redirect=${encodeURIComponent(redirect)}` : '/connexion';

  let ready = $state(false);
  let values = $state<Record<FieldName, string>>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  /** Message affiché sous le champ. */
  let errors = $state<Record<FieldName, string | null>>({
    firstName: null,
    lastName: null,
    email: null,
    password: null,
  });
  /** Message court du récapitulatif (« format invalide », « 8 caractères minimum »). */
  let summaryMessages = $state<Record<FieldName, string | null>>({
    firstName: null,
    lastName: null,
    email: null,
    password: null,
  });
  let failure = $state<string | null>(null);
  let submitting = $state(false);
  let form = $state<HTMLFormElement>();
  let summary = $state<ReturnType<typeof ErrorSummary>>();

  const summaryErrors = $derived<ErrorSummaryItem[]>(
    order.flatMap((name) => {
      const message = summaryMessages[name];
      return message ? [{ id: fields[name].id, label: fields[name].label, message }] : [];
    }),
  );

  const summaryTitle = $derived(
    summaryErrors.length > 1
      ? `${summaryErrors.length} erreurs empêchent la création du compte`
      : '1 erreur empêche la création du compte',
  );

  onMount(() => {
    const user = restoreSession();
    if (user) {
      location.replace(resolveRedirect(redirect, user.role));
      return;
    }
    ready = true;
  });

  /** Formulation courte du récapitulatif, d'après la maquette ; message complet sinon. */
  function shortMessage(element: ValidatableElement, full: string): string {
    const { validity } = element;
    if (validity.valueMissing) return 'champ obligatoire';
    if (validity.typeMismatch) return 'format invalide';
    if (validity.tooShort && element.minLength !== undefined && element.minLength > 0) {
      return `${element.minLength} caractères minimum`;
    }
    return full;
  }

  function control(name: FieldName): HTMLInputElement | null {
    const element = form?.elements.namedItem(name);
    return element instanceof HTMLInputElement ? element : null;
  }

  /** Calcule les messages d'un champ ; renvoie vrai s'il est valide. */
  function validate(name: FieldName): boolean {
    const element = control(name);
    const message = element ? fieldValidationMessage(element, fields[name].rules) : null;
    errors[name] = message;
    summaryMessages[name] = element && message ? shortMessage(element, message) : null;
    return message === null;
  }

  /** À la sortie d'un champ, on ne réévalue qu'un champ déjà en erreur (cadrage.md § 2.6). */
  function revalidate(name: FieldName): void {
    if (errors[name]) validate(name);
  }

  async function onsubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    failure = null;

    const valid = order.map(validate).every(Boolean);
    if (!valid) {
      await tick();
      summary?.focus();
      return;
    }

    submitting = true;
    const result = await register({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      password: values.password,
    });
    if (result.ok) {
      location.assign(safeRedirectPath(redirect) ?? '/');
      return;
    }
    submitting = false;
    failure = errorMessage(result.error, {
      409: 'Un compte existe déjà avec cette adresse e-mail.',
    });
  }
</script>

{#if ready}
  <AuthCard title="Créer un compte">
    {#snippet intro()}
      Les champs marqués d'un astérisque (<span class="text-danger-text">*</span>) sont
      obligatoires.
    {/snippet}

    <ErrorSummary bind:this={summary} errors={summaryErrors} title={summaryTitle} />

    {#if failure}
      <Alert variant="danger" title="Création du compte impossible">
        <p>{failure}</p>
      </Alert>
    {/if}

    <form bind:this={form} class="flex flex-col gap-(--space-4)" novalidate {onsubmit}>
      <div class="grid gap-(--space-4) md:grid-cols-2">
        <Field
          label={fields.firstName.label}
          id={fields.firstName.id}
          required
          error={errors.firstName}
        >
          {#snippet children(attrs)}
            <Input
              {...attrs}
              name="firstName"
              type="text"
              autocomplete="given-name"
              required
              bind:value={values.firstName}
              onblur={() => revalidate('firstName')}
            />
          {/snippet}
        </Field>
        <Field
          label={fields.lastName.label}
          id={fields.lastName.id}
          required
          error={errors.lastName}
        >
          {#snippet children(attrs)}
            <Input
              {...attrs}
              name="lastName"
              type="text"
              autocomplete="family-name"
              required
              bind:value={values.lastName}
              onblur={() => revalidate('lastName')}
            />
          {/snippet}
        </Field>
      </div>
      <Field label={fields.email.label} id={fields.email.id} required error={errors.email}>
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={values.email}
            onblur={() => revalidate('email')}
          />
        {/snippet}
      </Field>
      <Field
        label={fields.password.label}
        id={fields.password.id}
        required
        hint="8 caractères minimum"
        error={errors.password}
      >
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="password"
            type="password"
            autocomplete="new-password"
            required
            minlength={8}
            bind:value={values.password}
            onblur={() => revalidate('password')}
          />
        {/snippet}
      </Field>
      <Button type="submit" block aria-busy={submitting} aria-disabled={submitting}>
        Créer mon compte
      </Button>
    </form>

    {#snippet switchLink()}
      Déjà un compte ? <a href={loginHref}>Se connecter</a>
    {/snippet}
  </AuthCard>
{:else}
  <p class="visually-hidden" role="status">Chargement…</p>
{/if}
