// Sprite store with graceful fallback: draw code asks for a sprite by name and
// falls back to tofu-man rectangles until the image is loaded (or if missing).

export class SpriteStore {
  private images = new Map<string, HTMLImageElement>();

  load(names: string[], base = '/sprites/') {
    for (const n of names) {
      const img = new Image();
      img.src = `${base}${n}.png`;
      img.onload = () => this.images.set(n, img);
    }
  }

  get(name: string): HTMLImageElement | null {
    return this.images.get(name) ?? null;
  }
}

export const sprites = new SpriteStore();

let flashCanvas: HTMLCanvasElement | null = null;

// draw a sprite anchored at its feet, optionally tinted solid white (hit flash)
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  feetX: number,
  feetY: number,
  white = false,
) {
  const x = Math.round(feetX - img.width / 2);
  const y = Math.round(feetY - img.height + 1);
  if (!white) {
    ctx.drawImage(img, x, y);
    return;
  }
  if (!flashCanvas) flashCanvas = document.createElement('canvas');
  if (flashCanvas.width < img.width || flashCanvas.height < img.height) {
    flashCanvas.width = img.width;
    flashCanvas.height = img.height;
  }
  const fc = flashCanvas.getContext('2d')!;
  fc.clearRect(0, 0, img.width, img.height);
  fc.drawImage(img, 0, 0);
  fc.globalCompositeOperation = 'source-atop';
  fc.fillStyle = '#ffffff';
  fc.fillRect(0, 0, img.width, img.height);
  fc.globalCompositeOperation = 'source-over';
  ctx.drawImage(flashCanvas, 0, 0, img.width, img.height, x, y, img.width, img.height);
}
