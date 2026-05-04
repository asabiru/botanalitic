import axios from "axios";
import type { HistoricalBar } from "../market-data/provider.interface.js";

const QUICKCHART_URL = "https://quickchart.io/chart";

export interface ChartOptions {
  title: string;
  bars: HistoricalBar[];
  width?: number;
  height?: number;
}

export async function generatePriceChart(options: ChartOptions): Promise<Buffer | null> {
  const { title, bars, width = 800, height = 400 } = options;

  if (bars.length < 2) return null;

  const sorted = [...bars].sort((a, b) => a.date.getTime() - b.date.getTime());

  const labels = sorted.map((b) => {
    const d = b.date;
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  });

  const closePrices = sorted.map((b) => b.close);
  const highPrices = sorted.map((b) => b.high);
  const lowPrices = sorted.map((b) => b.low);

  const minPrice = Math.min(...lowPrices) * 0.995;
  const maxPrice = Math.max(...highPrices) * 1.005;

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Цена закрытия",
          data: closePrices,
          borderColor: "#2196F3",
          backgroundColor: "rgba(33, 150, 243, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Максимум",
          data: highPrices,
          borderColor: "rgba(76, 175, 80, 0.5)",
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "Минимум",
          data: lowPrices,
          borderColor: "rgba(244, 67, 54, 0.5)",
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16, weight: "bold" },
          color: "#333",
        },
        legend: {
          position: "bottom",
          labels: { font: { size: 11 } },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 10,
            font: { size: 10 },
          },
          grid: { display: false },
        },
        y: {
          min: minPrice,
          max: maxPrice,
          ticks: { font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
      },
    },
  };

  try {
    const resp = await axios.post(
      QUICKCHART_URL,
      {
        chart: JSON.stringify(chartConfig),
        width,
        height,
        backgroundColor: "white",
        format: "png",
      },
      {
        responseType: "arraybuffer",
        timeout: 15_000,
      },
    );

    return Buffer.from(resp.data);
  } catch (err) {
    console.error("[ChartGenerator] Failed to generate chart:", err);
    return null;
  }
}

export async function generateVolumeChart(options: ChartOptions): Promise<Buffer | null> {
  const { title, bars, width = 800, height = 300 } = options;

  if (bars.length < 2) return null;

  const sorted = [...bars].sort((a, b) => a.date.getTime() - b.date.getTime());

  const labels = sorted.map((b) => {
    const d = b.date;
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  });

  const volumes = sorted.map((b) => b.volume);
  const colors = sorted.map((b, i) => {
    if (i === 0) return "rgba(33, 150, 243, 0.6)";
    return b.close >= sorted[i - 1].close
      ? "rgba(76, 175, 80, 0.6)"
      : "rgba(244, 67, 54, 0.6)";
  });

  const chartConfig = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Объём",
          data: volumes,
          backgroundColor: colors,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `${title} — Объём торгов`,
          font: { size: 14, weight: "bold" },
          color: "#333",
        },
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 10, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
      },
    },
  };

  try {
    const resp = await axios.post(
      QUICKCHART_URL,
      {
        chart: JSON.stringify(chartConfig),
        width,
        height,
        backgroundColor: "white",
        format: "png",
      },
      {
        responseType: "arraybuffer",
        timeout: 15_000,
      },
    );

    return Buffer.from(resp.data);
  } catch (err) {
    console.error("[ChartGenerator] Failed to generate volume chart:", err);
    return null;
  }
}
