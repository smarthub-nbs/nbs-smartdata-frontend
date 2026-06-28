import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';

let registered = false;

/** Registers Chart.js components once when explore charts first render. */
export function ensureChartJsRegistered(): void {
  if (registered) {
    return;
  }
  Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    Filler,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Title,
    Tooltip,
  );
  registered = true;
}
