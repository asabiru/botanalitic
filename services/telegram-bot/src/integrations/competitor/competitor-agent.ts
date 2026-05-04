import { CompetitorResearchService } from "./competitor-research.service.js";
import { CompetitorSuggestionStore, CompetitorSuggestion } from "./competitor-suggestion-store.js";
import type { CompetitorReport, CompetitorIdea } from "./competitor.interface.js";

export class CompetitorAgent {
  constructor(
    private readonly research: CompetitorResearchService,
    private readonly suggestions: CompetitorSuggestionStore,
  ) {}

  async runFullAnalysis(): Promise<{ report: CompetitorReport; newSuggestions: CompetitorSuggestion[] }> {
    const report = await this.research.generateReport();
    const newSuggestions = this.generateSuggestionsFromReport(report);
    return { report, newSuggestions };
  }

  private generateSuggestionsFromReport(report: CompetitorReport): CompetitorSuggestion[] {
    const created: CompetitorSuggestion[] = [];

    const missingFeatures = report.featureMatrix.filter((f) => !f.weHaveIt);
    for (const feature of missingFeatures) {
      const existing = this.suggestions.list().find(
        (s) => s.title === feature.feature && s.status !== "rejected"
      );
      if (existing) continue;

      created.push(this.suggestions.add({
        competitorName: feature.competitors.join(", "),
        category: "feature",
        title: feature.feature,
        description: `${feature.description}. Есть у: ${feature.competitors.join(", ")}. Усилия: ${feature.effort}.`,
        priority: feature.priority,
        source: "feature_matrix",
      }));
    }

    for (const idea of report.topIdeas) {
      if (idea.impact !== "high") continue;

      const existing = this.suggestions.list().find(
        (s) => s.title === idea.title && s.status !== "rejected"
      );
      if (existing) continue;

      const categoryMap: Record<string, CompetitorSuggestion["category"]> = {
        feature: "feature",
        ux: "ux",
        monetization: "pricing",
        marketing: "marketing",
        data: "data",
      };

      created.push(this.suggestions.add({
        competitorName: idea.source,
        category: categoryMap[idea.category] ?? "feature",
        title: idea.title,
        description: idea.description,
        priority: idea.impact as CompetitorSuggestion["priority"],
        source: "trend_scan",
      }));
    }

    return created;
  }

  formatAnalysisReport(report: CompetitorReport, newSuggestions: CompetitorSuggestion[]): string {
    const html = this.research.formatReportHTML(report);
    const counts = this.suggestions.countByStatus();

    const suggestionBlock = [
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
      "<b>📋 Предложения по улучшению</b>",
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Новых: ${counts.new} | Принятых: ${counts.accepted} | Реализованных: ${counts.implemented} | Отклонённых: ${counts.rejected}`,
    ];

    if (newSuggestions.length > 0) {
      suggestionBlock.push("");
      suggestionBlock.push(`<b>Новые предложения (${newSuggestions.length}):</b>`);
      for (const s of newSuggestions.slice(0, 10)) {
        const icon = s.priority === "high" ? "🔴" : s.priority === "medium" ? "🟡" : "🟢";
        suggestionBlock.push(`${icon} ${s.title}`);
        suggestionBlock.push(`   ↳ ${s.description.slice(0, 120)}`);
      }
    }

    return html + "\n" + suggestionBlock.join("\n");
  }

  formatSuggestionsList(filter?: { status?: CompetitorSuggestion["status"] }): string {
    const items = this.suggestions.list(filter);
    const counts = this.suggestions.countByStatus();

    const lines: string[] = [
      "<b>📋 Предложения по улучшению продукта</b>",
      "",
      `Всего: ${items.length} | Новых: ${counts.new} | Принятых: ${counts.accepted} | Реализованных: ${counts.implemented}`,
      "",
    ];

    if (items.length === 0) {
      lines.push("Список пуст. Запустите анализ конкурентов для генерации предложений.");
      return lines.join("\n");
    }

    const byCategory = new Map<string, CompetitorSuggestion[]>();
    for (const s of items) {
      const existing = byCategory.get(s.category) ?? [];
      existing.push(s);
      byCategory.set(s.category, existing);
    }

    const categoryLabels: Record<string, string> = {
      pricing: "💰 Ценообразование",
      feature: "⚙️ Функционал",
      ux: "🎨 UX/UI",
      content: "📝 Контент",
      marketing: "📢 Маркетинг",
      monetization: "💳 Монетизация",
      data: "📊 Данные",
    };

    for (const [category, catItems] of byCategory.entries()) {
      lines.push(`<b>${categoryLabels[category] ?? category}</b>`);
      for (const s of catItems.slice(0, 5)) {
        const prioIcon = s.priority === "high" ? "🔴" : s.priority === "medium" ? "🟡" : "🟢";
        const statusIcon = s.status === "new" ? "🆕" : s.status === "accepted" ? "✅" : s.status === "implemented" ? "🚀" : "❌";
        lines.push(`${prioIcon}${statusIcon} ${s.title}`);
        lines.push(`   От: ${s.competitorName}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  getSuggestionStore(): CompetitorSuggestionStore {
    return this.suggestions;
  }
}
