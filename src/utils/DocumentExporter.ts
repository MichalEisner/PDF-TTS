import JSZip from "jszip";
import { jsPDF } from "jspdf";

export async function exportToPdf(text: string, fileName: string) {
  const doc = new jsPDF();
  
  // Použití lokálního fontu, který jsme zkopírovali do public složky
  const fontUrl = '/fonts/LiberationSans-Regular.ttf';

  try {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error(`Font load failed: ${response.status}`);
    
    const blob = await response.blob();
    const reader = new FileReader();
    
    reader.onloadend = () => {
      try {
        const base64data = (reader.result as string).split(',')[1];
        if (!base64data) throw new Error("Could not convert font to base64");

        doc.addFileToVFS('LiberationSans.ttf', base64data);
        doc.addFont('LiberationSans.ttf', 'LiberationSans', 'normal');
        doc.setFont('LiberationSans');
        
        generatePdfContent(doc, text, fileName);
      } catch (innerError) {
        console.error("Chyba při zpracování fontu:", innerError);
        generatePdfContent(doc, text, fileName);
      }
    };
    
    reader.onerror = () => {
      console.error("FileReader error");
      generatePdfContent(doc, text, fileName);
    };
    
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error("Chyba při načítání lokálního fontu:", error);
    generatePdfContent(doc, text, fileName);
  }
}

function generatePdfContent(doc: jsPDF, text: string, fileName: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;
  
  doc.setFontSize(11);
  
  // Kontrola, zda máme aktivní Unicode font. Pokud ne, musíme text očistit, aby jspdf nespadl.
  const isUnicode = (doc as any).getFont().fontName === 'LiberationSans';
  
  // Rozdělení textu na odstavce
  const paragraphs = text.split(/\n/);
  let y = margin;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 7;

  paragraphs.forEach((p) => {
    if (!p.trim()) {
      y += lineHeight / 2;
      return;
    }

    // Pokud nemáme unicode font, nahradíme problematické znaky
    let safeText = p;
    if (!isUnicode) {
      safeText = p.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
    }

    const lines = doc.splitTextToSize(safeText, maxLineWidth);
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  });
  
  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

export async function exportToEpub(text: string, title: string, author?: string) {
  const zip = new JSZip();
  
  // 1. mimetype (must be first and uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  
  // 2. META-INF/container.xml
  zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
  
  // Rozdělení podle "Nová kapitola:" nebo "Nová podkapitola:"
  const rawSections = text.split(/(?=(?:Nová kapitola:|Nová podkapitola:))/i);
  
  const chapters: any[] = [];
  rawSections.forEach((content, index) => {
    content = content.trim();
    if (!content) return;

    const lines = content.split('\n');
    const firstLine = lines[0];
    const isSub = /Nová podkapitola:/i.test(firstLine);
    
    let sectionTitle = firstLine.replace(/Nová (?:pod)?kapitola:\s*/i, '').trim();
    if (!sectionTitle) sectionTitle = isSub ? `Podkapitola ${index}` : (index === 0 ? "Úvod" : `Kapitola ${index}`);

    chapters.push({
      id: `section_${index}`,
      fileName: `section_${index}.xhtml`,
      title: sectionTitle,
      content,
      isSub
    });
  });

  // 3. OEBPS/content.opf
  const manifestItems = chapters.map(c => 
    `<item id="${c.id}" href="${c.fileName}" media-type="application/xhtml+xml"/>`
  ).join('\n    ');
  const spineItems = chapters.map(c => 
    `<itemref idref="${c.id}"/>`
  ).join('\n    ');

  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:${Math.random().toString(36).substring(7)}</dc:identifier>
    <dc:title>${title}</dc:title>
    ${author ? `<dc:creator>${author}</dc:creator>` : ''}
    <dc:language>cs</dc:language>
  </metadata>
  <manifest>
    ${manifestItems}
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`);

  // 4. OEBPS/nav.xhtml (Hierarchický obsah)
  let navHtml = '';
  chapters.forEach((c) => {
    if (c.isSub) {
      navHtml += `<li style="margin-left: 20px;"><a href="${c.fileName}">${c.title}</a></li>\n        `;
    } else {
      navHtml += `<li><a href="${c.fileName}">${c.title}</a></li>\n        `;
    }
  });

  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Obsah</title></head>
  <body>
    <nav epub:type="toc">
      <ol>
        ${navHtml}
      </ol>
    </nav>
  </body>
</html>`);

  // 5. OEBPS/Chapters
  chapters.forEach(c => {
    // Odstranění prvního řádku (indikátoru Nové kapitoly), aby nebyl v textu dvakrát
    const lines = c.content.split('\n');
    const contentWithoutTitle = lines.slice(1).join('\n').trim();

    const escapedContent = contentWithoutTitle
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

    zip.file(`OEBPS/${c.fileName}`, `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>${c.title}</title></head>
  <body>
    ${c.isSub ? `<h2>${c.title}</h2>` : `<h1>${c.title}</h1>`}
    <div class="content">
      <p>${escapedContent}</p>
    </div>
  </body>
</html>`);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = title.endsWith(".epub") ? title : `${title}.epub`;
  a.click();
  URL.revokeObjectURL(url);
}
