export interface AiTaskDraftRequest {
  prompt: string;
  projectId: string;
}

export class AiService {
  async createSprintDraft(_request: AiTaskDraftRequest) {
    throw new Error("AI adapter is intentionally deferred until credentials and product rules are defined.");
  }
}
