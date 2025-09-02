import { bootstrap } from './bootstrap';
import { authGate } from './routes/auth-guard';

async function main() {
  const booted = await bootstrap();
  if (!booted) return;

  authGate();
}

main();