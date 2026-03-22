import JSZip from 'jszip';

export const extractTextFromEpub = async (file: File): Promise<string> => {
  const zip = await JSZip.loadAsync(file);
  
  // 1. Find the rootfile (OPF) from container.xml
  const containerContent = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerContent) throw new Error("Neplatný EPUB: Chybí container.xml");

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerContent, "text/xml");
  const rootfilePath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!rootfilePath) throw new Error("Neplatný EPUB: Chybí rootfile cesta");

  // Get the directory of the OPF file to resolve relative paths
  const rootDir = rootfilePath.substring(0, rootfilePath.lastIndexOf("/") + 1);

  // 2. Read the OPF file
  const opfContent = await zip.file(rootfilePath)?.async("string");
  if (!opfContent) throw new Error("Neplatný EPUB: Chybí OPF soubor");

  const opfDoc = parser.parseFromString(opfContent, "text/xml");
  
  // 3. Get manifest items (id -> href)
  const manifestItems: Record<string, string> = {};
  const itemElements = opfDoc.querySelectorAll("manifest > item");
  itemElements.forEach(el => {
    const id = el.getAttribute("id");
    const href = el.getAttribute("href");
    if (id && href) {
      manifestItems[id] = href;
    }
  });

  // 4. Get spine items (order of reading)
  const spineItemIds: string[] = [];
  const spineElements = opfDoc.querySelectorAll("spine > itemref");
  spineElements.forEach(el => {
    const idref = el.getAttribute("idref");
    if (idref) {
      spineItemIds.push(idref);
    }
  });

  // 5. Extract text from each spine item
  let fullText = "";
  for (const id of spineItemIds) {
    const relativeHref = manifestItems[id];
    if (!relativeHref) continue;

    // Resolve path relative to OPF root
    const fullHref = rootDir + relativeHref;
    const itemFile = zip.file(fullHref);
    
    if (itemFile) {
      const htmlContent = await itemFile.async("string");
      const htmlDoc = parser.parseFromString(htmlContent, "text/html");
      
      // Basic text extraction: get body text
      // We can improve this by removing scripts/styles if necessary
      const body = htmlDoc.body;
      if (body) {
        // Simple text extraction with newlines for block elements
        const text = body.innerText || body.textContent || "";
        fullText += text.trim() + "\n\n";
      }
    }
  }

  return fullText.trim();
};
