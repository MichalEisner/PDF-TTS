import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// @ts-ignore - Vite specific import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument(arrayBuffer).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    let lastY: number | null = null;
    let pageText = '';
    
    for (const item of content.items as any[]) {
      // If the vertical position (transform[5]) changes significantly, it's likely a new line
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};
