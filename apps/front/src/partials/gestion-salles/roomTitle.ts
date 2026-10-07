// Formulations de la maquette qui citent une salle (écrans 08 et 09) :
// « Supprimer la salle Voltaire ? », « Modifier la salle Voltaire ».

/**
 * Désigne une salle dans une phrase, sans répéter « Salle » quand son nom commence déjà par ce mot.
 * @param name - Nom de la salle (« Salle Voltaire », « Auditorium Bastille »).
 * @returns « la salle Voltaire », « la salle Auditorium Bastille ».
 */
export function theRoom(name: string): string {
  const trimmed = name.trim();
  const withoutPrefix = trimmed.replace(/^salle\s+/i, '');
  return `la salle ${withoutPrefix || trimmed}`;
}
