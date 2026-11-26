import { authorizeAcademicMedia, MediaEvidence } from './academic-media-authorization';

// Dependencies must be server-only and resolve identity, entitlement and object
// references from authoritative records, never from client-supplied evidence.
type ResolvedMedia = { evidence: MediaEvidence; objectKey: string; bucket: string };
type Dependencies = {
  resolve: (assetId: string) => Promise<ResolvedMedia | null>;
  signPrivateObject: (bucket: string, key: string, seconds: number) => Promise<string>;
};
const allowedBuckets = ['aff-course-assets', 'assignment-submissions'];
export async function issueAcademicMediaLink(assetId: string, deps: Dependencies): Promise<{url:string; expiresIn:number} | null> {
  if (typeof assetId !== 'string' || !assetId.trim() || assetId !== assetId.trim()) return null;
  const record = await deps.resolve(assetId);
  if (!record || record.evidence.assetId !== assetId || !authorizeAcademicMedia(record.evidence)) return null;
  const {bucket, objectKey} = record;
  if (allowedBuckets.indexOf(bucket) === -1 || typeof objectKey !== 'string' ||
      !objectKey || objectKey !== objectKey.trim() || /[\\\\%?#\x00-\x1f]/.test(objectKey) ||
      objectKey.split('/').some(part => !part || part === '.' || part === '..')) return null;
  if ((record.evidence.audience === 'assignment') !== (bucket === 'assignment-submissions')) return null;
  const expiresIn = 300;
  const url = await deps.signPrivateObject(bucket, objectKey, expiresIn);
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('Media signing failed');
  return {url, expiresIn};
}
