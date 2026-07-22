export const PLACEHOLDER_SIZE = 640;

/** Generates a simple abstract demo image (gradient + two circles) so the tool has something to show before an upload. */
export function makePlaceholder(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const off = document.createElement("canvas");
    off.width = PLACEHOLDER_SIZE;
    off.height = PLACEHOLDER_SIZE;
    const octx = off.getContext("2d")!;
    const grad = octx.createLinearGradient(
      0,
      0,
      PLACEHOLDER_SIZE,
      PLACEHOLDER_SIZE,
    );
    grad.addColorStop(0, "#050505");
    grad.addColorStop(1, "#e8e8e8");
    octx.fillStyle = grad;
    octx.fillRect(0, 0, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
    octx.fillStyle = "#000";
    octx.beginPath();
    octx.arc(
      PLACEHOLDER_SIZE * 0.35,
      PLACEHOLDER_SIZE * 0.45,
      150,
      0,
      Math.PI * 2,
    );
    octx.fill();
    octx.fillStyle = "#fff";
    octx.beginPath();
    octx.arc(
      PLACEHOLDER_SIZE * 0.68,
      PLACEHOLDER_SIZE * 0.62,
      90,
      0,
      Math.PI * 2,
    );
    octx.fill();
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = off.toDataURL();
  });
}
