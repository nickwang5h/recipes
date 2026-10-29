import { d1Store, type D1 } from '../../src/lib/sync-d1';
import { handleSync } from '../../src/lib/sync-server';

export const onRequest = ({ request, env }: { request: Request; env: { DB: D1 } }) => handleSync(request, d1Store(env.DB));
