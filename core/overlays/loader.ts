import { getOverlayById } from './catalog';

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function createImagePromise(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load overlay image: ${src}`));
    image.src = src;
  });
}

export function loadOverlayImage(overlayId: string): Promise<HTMLImageElement | null> {
  const overlay = getOverlayById(overlayId);
  if (!overlay) {
    return Promise.resolve(null);
  }

  const cached = imageCache.get(overlay.src);
  if (cached) {
    return cached;
  }

  const promise = createImagePromise(overlay.src).catch((error) => {
    imageCache.delete(overlay.src);
    throw error;
  });
  imageCache.set(overlay.src, promise);
  return promise;
}
