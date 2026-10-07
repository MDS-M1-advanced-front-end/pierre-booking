const format = (fractionDigits: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const wholeEuros = format(0);
const cents = format(2);

/** Formate un montant en euros, sans centimes s'il est rond : 45 → « 45 € », 35.5 → « 35,50 € ». */
export const formatPrice = (amount: number): string =>
  (Number.isInteger(amount) ? wholeEuros : cents).format(amount);
