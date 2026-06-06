import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DownloadedAttachment, EmailDetails } from "@/types/email";

const MAX_EXPORT_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
const MAX_EMAILS_PER_EXPORT = 50;

function sanitizeFileName(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 120) : "email";
}

function normalizePdfGlyph(char: string): string {
  const code = char.codePointAt(0) ?? 0;

  if (char === "\n" || (code >= 0x20 && code <= 0x7e)) {
    return char;
  }

  const replacements: Record<string, string> = {
    "\u00a0": " ",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2026": "...",
    "\u2022": "-",
  };

  return replacements[char] ?? "?";
}

export function sanitizeForPdf(text: string): string {
  return Array.from(
    text
      .replace(/\t/g, "    ")
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
  )
    .map(normalizePdfGlyph)
    .join("")
    .trim();
}

function formatDateForFolder(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  } catch {
    return "unknown-date";
  }
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  const sanitizedText = sanitizeForPdf(text);
  const lines: string[] = [];

  for (const paragraph of sanitizedText.split("\n")) {
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(nextLine, fontSize);

      if (width <= maxWidth) {
        currentLine = nextLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export async function createEmailPdf(email: EmailDetails): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function addPageIfNeeded(requiredSpace = 20): void {
    if (y - requiredSpace < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function drawTextLine(
    text: string,
    options?: {
      bold?: boolean;
      size?: number;
      color?: ReturnType<typeof rgb>;
      gap?: number;
    }
  ): void {
    const size = options?.size || 11;
    const font = options?.bold ? boldFont : regularFont;
    const sanitizedText = sanitizeForPdf(text);

    addPageIfNeeded(size + 8);

    page.drawText(sanitizedText, {
      x: margin,
      y,
      size,
      font,
      color: options?.color || rgb(0, 0, 0),
    });

    y -= options?.gap || size + 8;
  }

  function drawWrappedText(
    text: string,
    options?: {
      bold?: boolean;
      size?: number;
      gap?: number;
    }
  ): void {
    const size = options?.size || 11;
    const font = options?.bold ? boldFont : regularFont;
    const lines = wrapText(text, font, size, maxWidth);

    for (const line of lines) {
      addPageIfNeeded(size + 8);

      page.drawText(line || " ", {
        x: margin,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });

      y -= options?.gap || size + 6;
    }
  }

  drawWrappedText(email.subject, {
    bold: true,
    size: 18,
    gap: 24,
  });

  drawTextLine(`From: ${email.sender}`, { bold: true });
  drawTextLine(`To: ${email.recipient}`, { bold: true });
  drawTextLine(`Date: ${email.date}`, { bold: true });

  y -= 8;
  drawTextLine("Email Body", { bold: true, size: 14, gap: 20 });
  drawWrappedText(email.body || "(No body content)", { size: 11, gap: 16 });

  if (email.attachments.length > 0) {
    y -= 12;
    drawTextLine("Attachments", { bold: true, size: 14, gap: 20 });

    for (const attachment of email.attachments) {
      const sizeKb = Math.round(attachment.size / 1024);
      drawWrappedText(
        `- ${attachment.filename} (${attachment.mimeType || "unknown"}, ${sizeKb} KB)`,
        { size: 11, gap: 16 }
      );
    }
  }

  y -= 20;
  drawTextLine("_______________________________________________", {
    size: 9,
    gap: 12,
  });
  drawTextLine("Exported by Gmail Hygiene", { size: 9, gap: 4 });
  drawTextLine(`Export Date: ${new Date().toISOString().split("T")[0]}`, {
    size: 9,
  });

  return pdf.save();
}

export async function buildSingleEmailZip(
  email: EmailDetails,
  attachments: DownloadedAttachment[]
): Promise<Buffer> {
  const zip = new JSZip();
  const pdfBytes = await createEmailPdf(email);

  zip.file("email.pdf", pdfBytes);

  const attachmentsFolder = zip.folder("attachments");

  if (attachmentsFolder) {
    for (const attachment of attachments) {
      attachmentsFolder.file(
        sanitizeFileName(attachment.filename),
        attachment.data
      );
    }
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export async function buildMultipleEmailsZip(
  emails: Array<{
    email: EmailDetails;
    attachments: DownloadedAttachment[];
  }>
): Promise<Buffer> {
  if (emails.length > MAX_EMAILS_PER_EXPORT) {
    throw new Error(`Cannot export more than ${MAX_EMAILS_PER_EXPORT} emails at once.`);
  }

  const zip = new JSZip();
  const usedFolderNames = new Set<string>();
  let totalSize = 0;

  for (const item of emails) {
    const dateStr = formatDateForFolder(item.email.date);
    let folderName = `${dateStr}_${sanitizeFileName(item.email.subject)}`;

    if (usedFolderNames.has(folderName)) {
      folderName = `${folderName}-${item.email.id.slice(0, 8)}`;
    }

    usedFolderNames.add(folderName);

    const emailFolder = zip.folder(folderName);

    if (!emailFolder) {
      continue;
    }

    const pdfBytes = await createEmailPdf(item.email);
    totalSize += pdfBytes.length;

    if (totalSize > MAX_EXPORT_SIZE_BYTES) {
      throw new Error("Export size exceeds 250 MB limit. Try exporting fewer emails.");
    }

    emailFolder.file("email.pdf", pdfBytes);

    const attachmentsFolder = emailFolder.folder("attachments");

    if (attachmentsFolder) {
      for (const attachment of item.attachments) {
        totalSize += attachment.data.length;

        if (totalSize > MAX_EXPORT_SIZE_BYTES) {
          throw new Error("Export size exceeds 250 MB limit. Try exporting fewer emails.");
        }

        attachmentsFolder.file(
          sanitizeFileName(attachment.filename),
          attachment.data
        );
      }
    }
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export function getSingleExportFileName(email: EmailDetails): string {
  const dateStr = formatDateForFolder(email.date);
  return `${dateStr}_${sanitizeFileName(email.subject)}.zip`;
}
