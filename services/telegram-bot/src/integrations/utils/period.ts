export function parsePeriodDays(period: string): number {
  switch (period) {
    case "1d":
      return 1;
    case "1w":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
    default:
      return 30;
  }
}
