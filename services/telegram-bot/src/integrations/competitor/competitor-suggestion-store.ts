import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type SuggestionCategory = "pricing" | "feature" | "ux" | "content" | "marketing" | "monetization" | "data";
export type SuggestionPriority = "low" | "medium" | "high";
export type SuggestionStatus = "new" | "accepted" | "rejected" | "implemented";

export type CompetitorSuggestion = {
  id: string;
  competitorName: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type PersistedState = {
  suggestions: CompetitorSuggestion[];
};

export class CompetitorSuggestionStore {
  private readonly storagePath = resolve(process.cwd(), "tmp", "competitor-suggestions.json");
  private suggestions = new Map<string, CompetitorSuggestion>();

  constructor() {
    this.load();
  }

  add(input: Omit<CompetitorSuggestion, "id" | "createdAt" | "updatedAt" | "status">): CompetitorSuggestion {
    const now = new Date().toISOString();
    const suggestion: CompetitorSuggestion = {
      id: randomUUID(),
      status: "new",
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.suggestions.set(suggestion.id, suggestion);
    this.save();
    return suggestion;
  }

  update(id: string, patch: Partial<CompetitorSuggestion>): CompetitorSuggestion | undefined {
    const current = this.suggestions.get(id);
    if (!current) return undefined;
    const updated: CompetitorSuggestion = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.suggestions.set(id, updated);
    this.save();
    return updated;
  }

  getById(id: string): CompetitorSuggestion | undefined {
    return this.suggestions.get(id);
  }

  list(filter?: { status?: SuggestionStatus; priority?: SuggestionPriority; category?: SuggestionCategory }): CompetitorSuggestion[] {
    let result = [...this.suggestions.values()];
    if (filter?.status) result = result.filter((s) => s.status === filter.status);
    if (filter?.priority) result = result.filter((s) => s.priority === filter.priority);
    if (filter?.category) result = result.filter((s) => s.category === filter.category);
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listByCompetitor(competitorName: string): CompetitorSuggestion[] {
    return [...this.suggestions.values()]
      .filter((s) => s.competitorName === competitorName)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  countByStatus(): Record<SuggestionStatus, number> {
    const counts: Record<SuggestionStatus, number> = { new: 0, accepted: 0, rejected: 0, implemented: 0 };
    for (const s of this.suggestions.values()) {
      counts[s.status]++;
    }
    return counts;
  }

  private load() {
    if (!existsSync(this.storagePath)) return;
    try {
      const raw = readFileSync(this.storagePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedState;
      for (const s of parsed.suggestions ?? []) this.suggestions.set(s.id, s);
    } catch (error) {
      console.error("Failed to load competitor suggestions", error);
    }
  }

  private save() {
    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });
      const payload: PersistedState = { suggestions: [...this.suggestions.values()] };
      writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to persist competitor suggestions", error);
    }
  }
}
