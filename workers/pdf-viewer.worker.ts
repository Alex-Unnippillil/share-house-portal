/// <reference lib="webworker" />

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

interface LoadMessage {
  type: 'load';
  payload: {
    url: string;
    credentials?: RequestCredentials;
  };
}

interface RenderPageMessage {
  type: 'renderPage';
  payload: {
    pageNumber: number;
    scale?: number;
  };
}

interface ReleaseMessage {
  type: 'release';
}

type WorkerRequest = LoadMessage | RenderPageMessage | ReleaseMessage;

type WorkerResponse =
  | { type: 'loaded'; payload: { numPages: number } }
  | { type: 'progress'; payload: { loaded: number; total?: number } }
  | { type: 'page'; payload: { pageNumber: number; width: number; height: number }; imageBitmap: ImageBitmap }
  | { type: 'error'; payload: { message: string } }
  | { type: 'released' };

declare const self: DedicatedWorkerGlobalScope;

let loadingTask: PDFDocumentLoadingTask | null = null;
let pdfDocument: PDFDocumentProxy | null = null;

GlobalWorkerOptions.workerPort = self as unknown as Worker;

const postError = (message: string) => {
  const response: WorkerResponse = {
    type: 'error',
    payload: { message },
  };
  self.postMessage(response);
};

const destroyDocument = async () => {
  if (loadingTask) {
    try {
      await loadingTask.destroy();
    } catch (error) {
      console.warn('Failed to destroy loading task', error);
    }
    loadingTask = null;
  }

  if (pdfDocument) {
    try {
      await pdfDocument.destroy();
    } catch (error) {
      console.warn('Failed to destroy pdf document', error);
    }
    pdfDocument = null;
  }
};

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'load': {
      await destroyDocument();

      try {
        const response = await fetch(payload.url, {
          credentials: payload.credentials ?? 'same-origin',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF (${response.status})`);
        }

        const data = await response.arrayBuffer();
        loadingTask = getDocument({ data });

        loadingTask.onProgress = (progressData) => {
          const progress: WorkerResponse = {
            type: 'progress',
            payload: {
              loaded: progressData.loaded,
              total: progressData.total,
            },
          };
          self.postMessage(progress);
        };

        pdfDocument = await loadingTask.promise;

        const responseMessage: WorkerResponse = {
          type: 'loaded',
          payload: { numPages: pdfDocument.numPages },
        };
        self.postMessage(responseMessage);
      } catch (error) {
        await destroyDocument();
        postError(error instanceof Error ? error.message : 'Unknown error while loading PDF');
      }
      break;
    }

    case 'renderPage': {
      if (!pdfDocument) {
        postError('PDF document has not been loaded.');
        return;
      }

      try {
        const { pageNumber, scale = 1.5 } = payload;
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        if (typeof OffscreenCanvas === 'undefined') {
          throw new Error('OffscreenCanvas is not supported in this environment.');
        }

        const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
          throw new Error('Unable to create canvas context for PDF rendering.');
        }

        await page.render({ canvasContext: context, viewport }).promise;

        const bitmap = canvas.transferToImageBitmap();
        const responseMessage: WorkerResponse = {
          type: 'page',
          payload: {
            pageNumber,
            width: viewport.width,
            height: viewport.height,
          },
          imageBitmap: bitmap,
        };

        self.postMessage(responseMessage, [bitmap]);
      } catch (error) {
        postError(error instanceof Error ? error.message : 'Unknown error while rendering page');
      }
      break;
    }

    case 'release': {
      await destroyDocument();
      const responseMessage: WorkerResponse = { type: 'released' };
      self.postMessage(responseMessage);
      break;
    }
  }
});
