import { Buffer } from "node:buffer";
import { cleanText } from "../shared/schema.ts";

export interface ExtractedDocument {
  text: string;
  warnings: string[];
}

export async function extractDocumentText(fileName: string, base64: string): Promise<ExtractedDocument> {
  const buffer = Buffer.from(base64, "base64");
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const warnings: string[] = [];

  if (ext === "txt") {
    return { text: cleanText(buffer.toString("utf8")), warnings };
  }

  if (ext === "pdf") {
    const rough = buffer.toString("latin1").replace(/\\[rn]/g, "\n");
    const matches = [...rough.matchAll(/\(([^()]{4,})\)\s*Tj|\[([^\]]{8,})\]\s*TJ/g)]
      .map((match) => match[1] ?? match[2] ?? "")
      .join(" ");
    const text = cleanText(matches || rough.replace(/[^\x20-\x7E\n]/g, " "));
    if (text.length < 80) warnings.push("PDF text layer was sparse; OCR may be needed for scanned documents.");
    return { text, warnings };
  }

  if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
    return {
      text: "",
      warnings: ["Image OCR adapter is available in the architecture, but this local zero-install build requires OCR text pasted manually."]
    };
  }

  if (["doc", "docx"].includes(ext)) {
    const text = cleanText(buffer.toString("utf8").replace(/<[^>]+>/g, " "));
    if (text.length < 80) warnings.push("DOCX extraction used a safe fallback; install production dependencies for richer document parsing.");
    return { text, warnings };
  }

  return { text: "", warnings: [`No extractor registered for .${ext}`] };
}
