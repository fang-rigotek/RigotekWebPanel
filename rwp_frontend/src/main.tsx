import { bootstrap } from './bootstrap';
import { authGate } from './authGate';

async function main() {
  const booted = await bootstrap();
  if (!booted) return;

  authGate();
}

main();