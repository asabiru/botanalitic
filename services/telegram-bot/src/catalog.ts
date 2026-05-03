export type InstrumentCategory = {
  id: string;
  title: string;
  description: string;
  priceRub: number;
  promptHint: string;
};

export const instrumentCatalog: InstrumentCategory[] = [
  {
    id: "cny-rub",
    title: "🇨🇳 Юань/Рубль",
    description: "Спот и фьючерсы: сценарии, уровни, драйверы и риск-факторы.",
    priceRub: 1490,
    promptHint: "Проанализируй CNY/RUB с акцентом на спот и фьючерсы."
  },
  {
    id: "usd-rub",
    title: "💵 Доллар/Рубль",
    description: "Курс, волатильность, сценарии и ключевые макро-факторы.",
    priceRub: 1490,
    promptHint: "Проанализируй USD/RUB с краткосрочным и среднесрочным сценарием."
  },
  {
    id: "oil",
    title: "🛢 Нефть",
    description: "Brent/WTI, баланс спроса и предложения, техническая картина.",
    priceRub: 1790,
    promptHint: "Сделай обзор нефти с фундаментальным и техническим анализом."
  },
  {
    id: "gas",
    title: "🔵 Газ",
    description: "Газовые фьючерсы, сезонность, запасы, торговые сценарии.",
    priceRub: 1790,
    promptHint: "Проанализируй природный газ с акцентом на волатильность."
  },
  {
    id: "gold",
    title: "🥇 Золото",
    description: "Защитный актив, реальная доходность, доллар и техуровни.",
    priceRub: 1990,
    promptHint: "Сделай инвестиционный анализ золота."
  },
  {
    id: "silver",
    title: "🥈 Серебро",
    description: "Комбинация защитного и промышленного спроса, сценарии и уровни.",
    priceRub: 1990,
    promptHint: "Сделай анализ серебра с оценкой волатильности."
  },
  {
    id: "us-stocks",
    title: "🇺🇸 Акции США",
    description: "Любой тикер: тезисы, мультипликаторы, техкартина, риски.",
    priceRub: 2490,
    promptHint: "Проанализируй американскую акцию по тикеру клиента."
  },
  {
    id: "ru-stocks",
    title: "📈 Акции РФ",
    description: "Любой тикер: рынок РФ, дивиденды, отчётность, уровни.",
    priceRub: 1990,
    promptHint: "Проанализируй российскую акцию по тикеру клиента."
  },
  {
    id: "imoex",
    title: "🇷🇺 Индекс Мосбиржи",
    description: "Общий обзор рынка РФ, лидеры/аутсайдеры, сценарии индекса.",
    priceRub: 1790,
    promptHint: "Проанализируй индекс Мосбиржи."
  },
  {
    id: "rgbi",
    title: "🇷🇺 Индекс RGBI",
    description: "ОФЗ, ставка, инфляционные ожидания и поведение индекса.",
    priceRub: 1790,
    promptHint: "Проанализируй индекс RGBI и рынок облигаций РФ."
  },
  {
    id: "crypto",
    title: "₿ Криптовалюты",
    description: "Любой тикер: тренд, ликвидность, уровни, риск и сценарии.",
    priceRub: 2490,
    promptHint: "Проанализируй криптовалюту по тикеру клиента."
  },
  {
    id: "eur-usd",
    title: "🇪🇺 Евро/Доллар",
    description: "FX-пара EUR/USD: макро, ставки, техкартина и уровни.",
    priceRub: 1490,
    promptHint: "Проанализируй EUR/USD с несколькими сценариями."
  }
];

export function findInstrumentById(id: string) {
  return instrumentCatalog.find((item) => item.id === id);
}