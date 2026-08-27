export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
