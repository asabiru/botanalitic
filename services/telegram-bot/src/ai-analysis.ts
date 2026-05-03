import { InstrumentCategory } from "./catalog.js";

type AnalysisRequest = {
  instrument: InstrumentCategory;
  ticker?: string;
  investorProfile?: string;
};

export class AiAnalysisService {
  async generateAnalysis(request: AnalysisRequest): Promise<string> {
    const tickerLine = request.ticker ? `Тикер клиента: ${request.ticker}` : "Тикер не требуется.";
    const profileLine = request.investorProfile
      ? `Профиль клиента: ${request.investorProfile}`
      : "Профиль клиента: не указан.";

    return [
      `📊 <b>AI Market View — анализ: ${request.instrument.title}</b>`,
      "",
      `Источник идеи анализа: Investing.com, TradingView, Bloomberg, X.com.`,
      tickerLine,
      profileLine,
      "",
      "<b>1. Базовый сценарий</b>",
      "Рынок сохраняет умеренную волатильность, а ключевым драйвером выступают новости по ставкам, макростатистика и технические уровни.",
      "",
      "<b>2. Что смотрим</b>",
      "• направление основного тренда",
      "• уровни поддержки/сопротивления",
      "• объёмы и импульс",
      "• новостной фон и риск-события",
      "",
      "<b>3. Сценарии</b>",
      "• Позитивный: пробой ключевого сопротивления и закрепление выше него.",
      "• Нейтральный: консолидация в диапазоне и ожидание нового драйвера.",
      "• Негативный: пробой поддержки и ускорение снижения.",
      "",
      "<b>4. Риски</b>",
      "Высокая волатильность, внезапные новости, изменение ожиданий по ставкам, геополитика.",
      "",
      "<b>5. Идея для клиента</b>",
      `${request.instrument.promptHint} Добавь понятные уровни входа, отмены сценария и горизонты.`,
      "",
      "⚠️ Материал носит информационный характер и не является индивидуальной инвестиционной рекомендацией."
    ].join("\n");
  }
}