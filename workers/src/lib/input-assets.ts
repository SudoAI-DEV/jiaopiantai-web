import { readFile } from 'node:fs/promises';
import { resolveMimeType } from './gemini.js';
import { generateDownloadUrl } from '../../../src/lib/r2';

export function isRemoteAsset(reference: string): boolean {
  return /^https?:\/\//i.test(reference);
}

function isApiFileReference(reference: string): boolean {
  return reference.startsWith('/api/files/');
}

export async function loadImageAssetAsBase64(
  reference: string
): Promise<{ data: string; mimeType: string }> {
  const { data, mimeType } = await loadImageAssetBuffer(reference);
  return {
    data: data.toString('base64'),
    mimeType,
  };
}

export async function loadImageAssetBuffer(
  reference: string
): Promise<{ data: Buffer; mimeType: string }> {
  if (isRemoteAsset(reference) || isApiFileReference(reference)) {
    const resolvedReference = isApiFileReference(reference)
      ? await generateDownloadUrl(reference.replace(/^\/api\/files\//, ''))
      : reference;
    const response = await fetch(resolvedReference, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(`Failed to download ${reference}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    return {
      data: buffer,
      mimeType,
    };
  }

  const buffer = await readFile(reference);
  return {
    data: buffer,
    mimeType: resolveMimeType(reference),
  };
}
