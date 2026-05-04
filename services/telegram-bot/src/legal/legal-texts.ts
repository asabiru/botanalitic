/**
 * Юридические тексты для Telegram-бота AI Market View.
 * Короткие версии для отображения в боте + ссылки на полные документы.
 */

const DOCS_BASE_URL =
  "https://github.com/asabiru/botanalitic/blob/main/docs/legal";

export const LEGAL_LINKS = {
  offer: `${DOCS_BASE_URL}/offer.md`,
  privacyPolicy: `${DOCS_BASE_URL}/privacy-policy.md`,
  termsOfService: `${DOCS_BASE_URL}/terms-of-service.md`,
  refundPolicy: `${DOCS_BASE_URL}/refund-policy.md`,
  disclaimer: `${DOCS_BASE_URL}/disclaimer.md`,
  pricing: `${DOCS_BASE_URL}/pricing.md`,
} as const;

export const ANALYSIS_DISCLAIMER =
  "⚠ Данный материал носит исключительно ознакомительный характер " +
  "и не является индивидуальной инвестиционной рекомендацией. " +
  "Прошлые результаты не гарантируют будущих. " +
  "Все решения вы принимаете на свой страх и риск.";

export const SHORT_DISCLAIMER =
  "⚠ Не является инвестиционной рекомендацией.";

export const LEGAL_INFO_MESSAGE = [
  "<b>📄 Юридическая информация</b>",
  "",
  `📋 <a href="${LEGAL_LINKS.offer}">Публичная оферта</a>`,
  `🔒 <a href="${LEGAL_LINKS.privacyPolicy}">Политика конфиденциальности</a>`,
  `📜 <a href="${LEGAL_LINKS.termsOfService}">Пользовательское соглашение</a>`,
  `💰 <a href="${LEGAL_LINKS.refundPolicy}">Политика возвратов</a>`,
  `⚠ <a href="${LEGAL_LINKS.disclaimer}">Дисклеймер (отказ от ответственности)</a>`,
  `🏷 <a href="${LEGAL_LINKS.pricing}">Тарифы и описание услуг</a>`,
  "",
  SHORT_DISCLAIMER,
].join("\n");
