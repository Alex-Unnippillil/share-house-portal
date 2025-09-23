'use client';

export function createDownloadLink(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function streamToBlob(
  stream: ReadableStream<Uint8Array>,
  contentType = 'text/csv;charset=utf-8'
): Promise<Blob> {
  const response = new Response(stream, {
    headers: { 'Content-Type': contentType },
  });
  return response.blob();
}
