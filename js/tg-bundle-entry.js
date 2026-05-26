import { runInitialBoot } from './start.js';
import { launchGame } from './main.js';

/** Один файл для Telegram — вызывается из index.html после __kolobokTgBoot = true */
export async function bootTg() {
  await runInitialBoot();
  await launchGame();
}
