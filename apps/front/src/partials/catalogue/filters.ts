/**
 * Amélioration progressive du formulaire de filtres : sans JavaScript, il envoie aussi les champs
 * vides (`/?search=&location=…`) ; avec, l'URL ne garde que les filtres renseignés.
 */
for (const form of document.querySelectorAll<HTMLFormElement>('form[data-catalogue-filters]')) {
  form.addEventListener('submit', (event) => {
    if (!form.checkValidity()) return;
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string' && value.trim() !== '') params.append(key, value.trim());
    }
    const query = params.toString();
    window.location.assign(query ? `${form.action}?${query}` : form.action);
  });
}
