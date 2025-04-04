import { Document, Packer, Paragraph, TextRun } from "docx";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import path from "path";

export async function reportService({ content, fileType }: { content: string; fileType: string }) {
  const outputDir = path.join(__dirname, "../../output");
  const filename = path.join(outputDir, `output.${fileType}`);

  // Ensure the output folder exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  if (fileType === "doc") {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [new Paragraph({ children: [new TextRun(content)] })],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    await writeFile(filename, buffer);
  } 
  else if (fileType === "txt") {
    await writeFile(filename, content, "utf-8");
  } 
  else if (fileType === "pdf") {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const textSize = 14;
    const textColor = rgb(0, 0, 0);

    page.drawText(content, { x: 50, y: 550, size: textSize, font, color: textColor });

    const pdfBytes = await pdfDoc.save();
    await writeFile(filename, pdfBytes);
  } 
  else {
    throw new Error("Invalid file type. Supported types: doc, txt, pdf.");
  }

  console.log(`✅ Report saved at: ${filename}`);
}

// Example Usage
