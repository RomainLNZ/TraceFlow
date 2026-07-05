const translatedMessages: Record<string, string> = {
  "Email already registered": "Cet email est déjà utilisé.",
  "Invalid credentials": "Email ou mot de passe incorrect.",
  "Validation failed": "Les informations saisies sont invalides.",
  "Internal server error": "Une erreur interne est survenue.",
  "La demande a echoue.": "La demande a échoué.",
  "Creation de compte impossible.": "Création de compte impossible.",
  "Impossible de creer le projet.": "Impossible de créer le projet.",
  "Impossible de creer la tache.": "Impossible de créer la tâche.",
  "Impossible de deplacer la tache.": "Impossible de déplacer la tâche.",
  "Impossible de charger les taches.": "Impossible de charger les tâches.",
  "Impossible de supprimer la tache.": "Impossible de supprimer la tâche.",
  "Cree d'abord un projet avant d'ajouter une tache.": "Crée d'abord un projet avant d'ajouter une tâche.",
  "Impossible de charger les donnees.": "Impossible de charger les données.",
  "Impossible de charger le dashboard.": "Impossible de charger le tableau de bord."
};

export function translateErrorMessage(message: string | undefined, fallback: string) {
  if (!message) {
    return fallback;
  }

  return translatedMessages[message] ?? message;
}

export function getRequestErrorMessage(error: unknown, fallback: string) {
  return translateErrorMessage(error instanceof Error ? error.message : undefined, fallback);
}

export function getPayloadErrorMessage(payload: { message?: unknown } | null | undefined, fallback: string) {
  return translateErrorMessage(typeof payload?.message === "string" ? payload.message : undefined, fallback);
}
