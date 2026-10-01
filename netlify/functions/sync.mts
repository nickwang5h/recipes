import { getStore } from '@netlify/blobs';
import { handleSync, type BlobStore } from '../../src/lib/sync-server';

// Strong consistency: the default (eventual) read can return the previous version for up to a
// minute after a write, which makes the etag-guarded write in handleSync fail every retry.
export default (request: Request) =>
  handleSync(request, getStore({ name: 'families', consistency: 'strong' }) as unknown as BlobStore);

export const config = { path: '/api/sync' };
