import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "node:crypto";

export async function buildWaiverPdf(input: {
  title: string;
  body: string;
  typedName: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  bodySha256: string;
}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [612, 792];
  let page = doc.addPage(pageSize);
  let y = 740;
  const draw = (text: string, size = 11, used = font) => {
    const words = text.split(/\s+/);
    let line = "";
    const flush = () => {
      if (y < 72) {
        page = doc.addPage(pageSize);
        y = 740;
      }
      page.drawText(line, { x: 54, y, size, font: used, color: rgb(0.1, 0.12, 0.16) });
      y -= size + 6;
      line = "";
    };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (used.widthOfTextAtSize(next, size) > 500) flush();
      line = line ? `${line} ${word}` : word;
    }
    if (line) flush();
  };

  draw("Las Trampas Pool", 12, bold);
  draw(input.title, 16, bold);
  y -= 8;
  for (const paragraph of input.body.split(/\n+/)) {
    if (paragraph.trim()) draw(paragraph.replace(/\*\*/g, ""));
    y -= 6;
  }
  y -= 12;
  draw(`Signed by: ${input.typedName}`, 12, bold);
  draw(`Signed at: ${input.signedAt}`);
  draw(`IP address: ${input.ip || "unavailable"}`);
  draw(`Browser: ${input.userAgent.slice(0, 180) || "unavailable"}`);
  draw(`Waiver text SHA-256: ${input.bodySha256}`, 9);
  draw("This PDF is the stored copy of an in-app signature. It is not a substitute for the board-approved waiver text.", 9);

  const bytes = await doc.save();
  const hash = createHash("sha256").update(bytes).digest("hex");
  return { bytes, hash };
}
