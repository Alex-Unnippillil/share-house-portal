# PDF Worker Integration

The document viewer now streams PDF pages using a dedicated Web Worker. Rendering moves off the main thread to keep the UI responsive while residents scroll through large leases or house manuals.

## Architecture Overview

1. **Worker bootstrap (`workers/pdf-viewer.worker.ts`)**
   - Fetches the PDF binary using `fetch`.
   - Loads the document through `pdfjs-dist` and keeps a `PDFDocumentProxy` in memory.
   - Renders individual pages into an `OffscreenCanvas`, converts each draw to an `ImageBitmap`, and posts it back to the UI thread.
   - Emits progress, error, and lifecycle events so the viewer can reflect loading state.

2. **Viewer (`DocumentViewerDialog`)**
   - Spawns the worker with `new Worker(new URL('../../../workers/pdf-viewer.worker.ts', import.meta.url), { type: 'module' })` when the dialog opens on a PDF.
   - Requests pages sequentially to balance throughput with responsiveness. The next page is only requested after the previous page is delivered.
   - Draws each `ImageBitmap` onto an HTML canvas and releases the bitmap immediately to avoid leaking GPU memory.

3. **UI/UX**
   - Presents incremental status: fetching progress, render progress, and graceful fallbacks on error or unsupported browsers.
   - Keeps the dialog interactive because parsing, decoding, and rasterisation happen outside the main thread.

## Message Contract

| Direction    | Type         | Payload                                                                                         |
|--------------|--------------|-------------------------------------------------------------------------------------------------|
| UI → Worker  | `load`       | `{ url: string, credentials?: RequestCredentials }` — fetch and parse a new document.           |
| UI → Worker  | `renderPage` | `{ pageNumber: number, scale?: number }` — render the requested page using the specified scale. |
| UI → Worker  | `release`    | `void` — destroy cached PDF state and clean up resources.                                       |
| Worker → UI  | `progress`   | `{ loaded: number, total?: number }` — network download progress from PDF.js.                  |
| Worker → UI  | `loaded`     | `{ numPages: number }` — document parsed and ready to stream pages.                             |
| Worker → UI  | `page`       | `{ pageNumber: number, width: number, height: number }` + `ImageBitmap` transfer for the page. |
| Worker → UI  | `error`      | `{ message: string }` — recoverable failure (network, render, or unsupported feature).         |
| Worker → UI  | `released`   | `void` — acknowledgement after clean-up.                                                        |

## Adding the Worker to Another Viewer

1. **Create the worker**
   ```ts
   const worker = new Worker(new URL('../../workers/pdf-viewer.worker.ts', import.meta.url), {
     type: 'module',
   });
   worker.postMessage({ type: 'load', payload: { url: fileUrl } });
   ```

2. **Stream pages**
   ```ts
   worker.addEventListener('message', (event) => {
     if (event.data.type === 'loaded') {
       worker.postMessage({ type: 'renderPage', payload: { pageNumber: 1 } });
     }

     if (event.data.type === 'page') {
       const { imageBitmap } = event.data;
       const canvas = canvasRef.current;
       const ctx = canvas?.getContext('2d');
       ctx?.drawImage(imageBitmap, 0, 0);
       imageBitmap.close();
     }
   });
   ```

3. **Tear down**
   ```ts
   worker.postMessage({ type: 'release' });
   worker.terminate();
   ```

## Performance Notes

- **Sequential streaming** keeps the number of concurrent `renderPage` calls low, so slow devices are not overwhelmed.
- **OffscreenCanvas → ImageBitmap** keeps rasterisation work off the main thread and leverages zero-copy transfers.
- Bitmaps are explicitly closed after drawing to free GPU memory.
- Download and render progress are surfaced to the UI to help debug slow documents.

## Troubleshooting

- If you encounter `OffscreenCanvas is not supported`, either polyfill or gracefully fall back to the old download/open flow.
- Always call `release` before terminating the worker when swapping to a different document to avoid dangling ArrayBuffers in memory.
- When testing locally with Supabase storage URLs, ensure CORS allows the worker origin to fetch the asset.

