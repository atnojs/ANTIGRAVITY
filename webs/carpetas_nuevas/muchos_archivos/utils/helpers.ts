
export const slugify = (str: string) =>
  (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';

export const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?#]+)/);
    if (m) return m[2];
  } catch (e) {
    //
  }
  const r = (url + '').match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)/);
  return r ? r[1] : null;
};

export const getYouTubeThumbnail = (url: string): string => {
  const videoId = getYouTubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : `https://picsum.photos/480/270?random=${url}`;
};

export const generateId = (prefix: 'folder' | 'video'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
