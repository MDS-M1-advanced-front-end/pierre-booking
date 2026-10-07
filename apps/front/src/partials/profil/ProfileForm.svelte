<!--
  Formulaire « Modifier mes informations » de l'écran 05 (cadrage.md § 4 « 05 »).

  Envoie `updateUser(user.id, { firstName, lastName, email })` : jamais `role` (anomalie 7,
  `updateUser` le retire aussi du corps). Succès : `Alert` « Vos informations ont été
  enregistrées. » et session mise à jour (`updateSessionUser`).

  Props :
    user: User   utilisateur connecté (valeurs initiales ; un `getMe()` plus récent les remplace
                 tant que le formulaire n'a pas été modifié)
-->
<script lang="ts">
  import type { User } from '@room-booking/core';
  import { tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import Field from '../../components/Field.svelte';
  import Input from '../../components/Input.svelte';
  import { updateSessionUser } from '../../data/auth/session.svelte';
  import { errorMessage } from '../../data/errors';
  import { updateUser } from '../../data/users/users.queries';
  import { fieldValidationMessage, type ValidationOptions } from '../../utils/validationMessage';

  interface Props {
    user: User;
  }

  let { user }: Props = $props();

  type FieldName = 'firstName' | 'lastName' | 'email';

  const rules: Record<FieldName, ValidationOptions> = {
    firstName: { subject: 'Le prénom' },
    lastName: { subject: 'Le nom' },
    email: { subject: "L'adresse e-mail" },
  };
  const order: FieldName[] = ['firstName', 'lastName', 'email'];

  let values = $state<Record<FieldName, string>>({ firstName: '', lastName: '', email: '' });
  let errors = $state<Record<FieldName, string | null>>({
    firstName: null,
    lastName: null,
    email: null,
  });
  /** Vrai dès que l'utilisateur a modifié un champ : on n'écrase plus sa saisie (même après
   * l'enregistrement, le formulaire garde ce qui a été saisi). */
  let dirty = $state(false);
  let saved = $state(false);
  let failure = $state<string | null>(null);
  let submitting = $state(false);
  let form = $state<HTMLFormElement>();

  // Remplit le formulaire avec l'utilisateur à jour (session, puis réponse de `getMe()`).
  $effect.pre(() => {
    const { firstName, lastName, email } = user;
    if (!dirty) values = { firstName, lastName, email };
  });

  function control(name: FieldName): HTMLInputElement | null {
    const element = form?.elements.namedItem(name);
    return element instanceof HTMLInputElement ? element : null;
  }

  function validate(name: FieldName): boolean {
    const element = control(name);
    errors[name] = element ? fieldValidationMessage(element, rules[name]) : null;
    return errors[name] === null;
  }

  function revalidate(name: FieldName): void {
    if (errors[name]) validate(name);
  }

  async function onsubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    saved = false;
    failure = null;

    const [firstInvalid] = order.filter((name) => !validate(name));
    if (firstInvalid) {
      await tick();
      control(firstInvalid)?.focus();
      return;
    }

    submitting = true;
    const result = await updateUser(user.id, {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
    });
    submitting = false;
    if (result.ok) {
      updateSessionUser(result.data);
      // La saisie reste affichée : la session suit la réponse du serveur, pas le formulaire.
      dirty = true;
      saved = true;
    } else {
      failure = errorMessage(result.error, {
        409: 'Un compte existe déjà avec cette adresse e-mail.',
      });
    }
  }
</script>

<section class="rounded-lg border border-border bg-surface shadow-sm" aria-labelledby="edit-title">
  <form
    bind:this={form}
    class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)"
    novalidate
    {onsubmit}
    oninput={() => (dirty = true)}
  >
    <h2 id="edit-title">Modifier mes informations</h2>

    {#if saved}
      <Alert variant="success">
        <p>Vos informations ont été enregistrées.</p>
      </Alert>
    {/if}
    {#if failure}
      <Alert variant="danger">
        <p>{failure}</p>
      </Alert>
    {/if}

    <div class="grid gap-(--space-4) md:grid-cols-2">
      <Field label="Prénom" id="firstName" error={errors.firstName}>
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
      <Field label="Nom" id="lastName" error={errors.lastName}>
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
    <Field label="Adresse e-mail" id="email" error={errors.email}>
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

    <div class="flex flex-wrap-reverse justify-end gap-(--space-3) pt-(--space-2)">
      <Button
        type="submit"
        class="max-md:flex-[1_1_100%]"
        aria-busy={submitting}
        aria-disabled={submitting}
      >
        Enregistrer
      </Button>
    </div>
  </form>
</section>
