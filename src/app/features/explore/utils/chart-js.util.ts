import {
  ArcElement,
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
  PieController,
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
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Filler,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    PieController,
    Title,
    Tooltip,
  );
  registered = true;
}
