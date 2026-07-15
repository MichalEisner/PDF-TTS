import JSZip from 'jszip';

export interface EpubData {
  text: string;
  metadata: {
    title?: string;
    author?: string;
  };
}

export const extractTextFromEpub = async (file: File): Promise<EpubData> => {
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
  
  // Extrakce metadat
  const title = opfDoc.querySelector("title")?.textContent || opfDoc.querySelector("dc\\:title")?.textContent || "";
  const author = opfDoc.querySelector("creator")?.textContent || opfDoc.querySelector("dc\\:creator")?.textContent || "";

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

  // 5. Pokus se najít navigační dokument (obsah) pro získání názvů kapitol
  const navItem = Array.from(itemElements).find(el => el.getAttribute("properties")?.includes("nav"));
  const navHref = navItem?.getAttribute("href");
  const chapterTitles: Record<string, string> = {};

  if (navHref) {
    try {
      const navFile = zip.file(rootDir + navHref);
      if (navFile) {
        const navContent = await navFile.async("string");
        const navDoc = parser.parseFromString(navContent, "text/html");
        const navLinks = navDoc.querySelectorAll("nav[epub\\:type='toc'] a, nav ol a");
        navLinks.forEach(link => {
          const href = link.getAttribute("href")?.split('#')[0]; // Odstranit kotvy
          if (href) {
            chapterTitles[href] = link.textContent?.trim() || "";
          }
        });
      }
    } catch (e) {
      console.warn("EpubProcessor: Nepodařilo se načíst názvy kapitol z nav.xhtml", e);
    }
  }

  // 6. Extract text from each spine item
  let fullText = "";
  let chapterIndex = 1;
  for (const id of spineItemIds) {
    const relativeHref = manifestItems[id];
    if (!relativeHref) continue;

    const fullHref = rootDir + relativeHref;
    const itemFile = zip.file(fullHref);
    
    if (itemFile) {
      const htmlContent = await itemFile.async("string");
      const htmlDoc = parser.parseFromString(htmlContent, "text/html");
      
      const body = htmlDoc.body;
      if (body) {
        const text = (body.innerText || body.textContent || "").trim();
        if (text) {
          // Injekce "Nová kapitola:", pokud tam už není (aby se zachovala struktura při exportu)
          if (!text.toLowerCase().startsWith("nová kapitola:") && !text.toLowerCase().startsWith("nová podkapitola:")) {
            const resolvedTitle = chapterTitles[relativeHref] || `Kapitola ${chapterIndex++}`;
            fullText += `Nová kapitola: ${resolvedTitle}\n\n`;
          }
          fullText += text + "\n\n";
        }
      }
    }
  }

  return {
    text: fullText.trim(),
    metadata: { title, author }
  };
};
