import { getStore } from '@netlify/blobs';
import { handleSync, type BlobStore } from '../../src/lib/sync-server';

export default (request: Request) => handleSync(request, getStore('families') as unknown as BlobStore);

export const config = { path: '/api/sync' };
