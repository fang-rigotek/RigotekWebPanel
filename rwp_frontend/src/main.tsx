import { bootstrap } from '@/bootstrap';
import {ensureLoggedIn} from '@/ensure-logged-in';

async function main() {
  const booted = await bootstrap();
  if (!booted) return;

  await ensureLoggedIn();
}

main();