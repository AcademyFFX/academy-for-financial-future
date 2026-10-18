import { OFFICIAL_AFF_LOGO_PATH } from "@/lib/aff-brand";

export type PrintableCertificate = {
  certificate_number: string;
  student_name: string;
  course_name: string;
  score: number;
  issue_date: string;
  completion_date?: string | null;
  verification_code: string;
  exam_attempt_id?: string | number | null;
  integrity_verified?: boolean | null;
  issuance_source?: string | null;
  instructor_name?: string | null;
  approved_by?: string | null;
  credential_class?: string | null;
  credential_type?: string | null;
  certificate_type?: string | null;
  registry_serial?: string | null;
  signatory_title?: string | null;
};

export type CertificateLogoImage = {
  jpegHex: string;
  width: number;
  height: number;
  watermarkJpegHex?: string;
  watermarkWidth?: number;
  watermarkHeight?: number;
};

export type AffCredentialClass =
  | "Certificate of Completion"
  | "Professional Certificate"
  | "Advanced Certificate"
  | "Academic Certificate"
  | "Diploma";

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const NAVY = "0.039 0.094 0.200";
const DEEP_NAVY = "0.020 0.052 0.120";
const GOLD = "0.831 0.686 0.216";
const PALE_GOLD = "0.925 0.882 0.706";
const IVORY = "0.969 0.953 0.922";
const CHARCOAL = "0.184 0.208 0.259";

function pdfSafe(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: unknown) {
  return pdfSafe(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function estimateTextWidth(text: string, fontSize: number, factor = 0.52) {
  return pdfSafe(text).length * fontSize * factor;
}

function centeredText(text: string, y: number, fontSize: number, font = "F2", color = NAVY, maxWidth = 690) {
  const safeText = pdfSafe(text);
  const fittedSize = Math.max(10, Math.min(fontSize, fontSize * (maxWidth / Math.max(estimateTextWidth(safeText, fontSize), maxWidth))));
  const x = Math.max(42, (PAGE_WIDTH - estimateTextWidth(safeText, fittedSize)) / 2);
  return `${color} rg BT /${font} ${fittedSize.toFixed(2)} Tf ${x.toFixed(2)} ${y} Td (${escapePdfText(safeText)}) Tj ET`;
}

function placedText(text: string, x: number, y: number, fontSize: number, font = "F4", color = NAVY) {
  return `${color} rg BT /${font} ${fontSize} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function fittedPlacedText(text: string, x: number, y: number, fontSize: number, maxWidth: number, font = "F4", color = NAVY) {
  const safeText = pdfSafe(text);
  const fittedSize = Math.max(5.5, Math.min(fontSize, fontSize * (maxWidth / Math.max(estimateTextWidth(safeText, fontSize), maxWidth))));
  return `${color} rg BT /${font} ${fittedSize.toFixed(2)} Tf ${x} ${y} Td (${escapePdfText(safeText)}) Tj ET`;
}

function formattedDate(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return pdfSafe(raw) || "Not recorded";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function buildOfficialLogoPlacement(logo: CertificateLogoImage) {
  const maxWidth = 330;
  const maxHeight = 76;
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const width = logo.width * scale;
  const height = logo.height * scale;
  const x = (PAGE_WIDTH - width) / 2;
  const y = 481 + (76 - height) / 2;
  return `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /AFFLogo Do Q`;
}

function buildOfficialWatermarkPlacement(logo: CertificateLogoImage) {
  const widthSource = logo.watermarkWidth ?? logo.width;
  const heightSource = logo.watermarkHeight ?? logo.height;
  const maxWidth = 350;
  const maxHeight = 185;
  const scale = Math.min(maxWidth / widthSource, maxHeight / heightSource);
  const width = widthSource * scale;
  const height = heightSource * scale;
  const x = (PAGE_WIDTH - width) / 2;
  const y = 186 + (185 - height) / 2;
  return `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /AFFWatermark Do Q`;
}

function qrGaloisTables() {
  const exp = new Array<number>(512).fill(0);
  const log = new Array<number>(256).fill(0);
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    exp[index] = value;
    log[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < exp.length; index += 1) exp[index] = exp[index - 255];
  return { exp, log };
}

const qrGalois = qrGaloisTables();

function qrMultiply(left: number, right: number) {
  if (left === 0 || right === 0) return 0;
  return qrGalois.exp[qrGalois.log[left] + qrGalois.log[right]];
}

function qrErrorCorrection(data: number[], length: number) {
  let generator = [1];
  for (let degree = 0; degree < length; degree += 1) {
    const next = new Array<number>(generator.length + 1).fill(0);
    for (let index = 0; index < generator.length; index += 1) {
      next[index] ^= generator[index];
      next[index + 1] ^= qrMultiply(generator[index], qrGalois.exp[degree]);
    }
    generator = next;
  }

  const remainder = new Array<number>(length).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    if (factor === 0) continue;
    for (let index = 0; index < length; index += 1) remainder[index] ^= qrMultiply(generator[index + 1], factor);
  }
  return remainder;
}

function qrBch(value: number, polynomial: number) {
  let shifted = value;
  const polynomialDegree = 31 - Math.clz32(polynomial);
  while (shifted !== 0 && 31 - Math.clz32(shifted) >= polynomialDegree) {
    shifted ^= polynomial << (31 - Math.clz32(shifted) - polynomialDegree);
  }
  return shifted;
}

export function createVerificationQrMatrix(verificationUrl: string) {
  const bytes = Array.from(new TextEncoder().encode(verificationUrl));
  if (bytes.length > 192) throw new Error("The certificate verification URL is too long for the secure QR block.");

  const bits: number[] = [];
  const appendBits = (value: number, length: number) => {
    for (let bit = length - 1; bit >= 0; bit -= 1) bits.push((value >>> bit) & 1);
  };
  appendBits(0b0100, 4);
  appendBits(bytes.length, 8);
  for (const byte of bytes) appendBits(byte, 8);
  const dataCapacityBits = 194 * 8;
  appendBits(0, Math.min(4, dataCapacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) byte = (byte << 1) | bits[index + bit];
    dataCodewords.push(byte);
  }
  for (let pad = 0; dataCodewords.length < 194; pad += 1) dataCodewords.push(pad % 2 === 0 ? 0xec : 0x11);

  const blocks = [dataCodewords.slice(0, 97), dataCodewords.slice(97, 194)];
  const corrections = blocks.map((block) => qrErrorCorrection(block, 24));
  const codewords: number[] = [];
  for (let index = 0; index < 97; index += 1) for (const block of blocks) codewords.push(block[index]);
  for (let index = 0; index < 24; index += 1) for (const correction of corrections) codewords.push(correction[index]);

  const size = 49;
  const modules: Array<Array<boolean | null>> = Array.from({ length: size }, () => Array<boolean | null>(size).fill(null));
  const placeFinder = (row: number, column: number) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const targetRow = row + y;
        const targetColumn = column + x;
        if (targetRow < 0 || targetRow >= size || targetColumn < 0 || targetColumn >= size) continue;
        modules[targetRow][targetColumn] =
          (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
          (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
          (y >= 2 && y <= 4 && x >= 2 && x <= 4);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  for (const row of [6, 24, 42]) {
    for (const column of [6, 24, 42]) {
      if (modules[row][column] !== null) continue;
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) modules[row + y][column + x] = Math.abs(y) === 2 || Math.abs(x) === 2 || (y === 0 && x === 0);
      }
    }
  }

  for (let index = 8; index < size - 8; index += 1) {
    if (modules[index][6] === null) modules[index][6] = index % 2 === 0;
    if (modules[6][index] === null) modules[6][index] = index % 2 === 0;
  }

  const versionBits = (8 << 12) | qrBch(8 << 12, 0x1f25);
  for (let index = 0; index < 18; index += 1) {
    const dark = ((versionBits >>> index) & 1) === 1;
    modules[Math.floor(index / 3)][index % 3 + size - 11] = dark;
    modules[index % 3 + size - 11][Math.floor(index / 3)] = dark;
  }

  const formatValue = 0b01000;
  const formatBits = ((formatValue << 10) | qrBch(formatValue << 10, 0x537)) ^ 0x5412;
  for (let index = 0; index < 15; index += 1) {
    const dark = ((formatBits >>> index) & 1) === 1;
    if (index < 6) modules[index][8] = dark;
    else if (index < 8) modules[index + 1][8] = dark;
    else modules[size - 15 + index][8] = dark;

    if (index < 8) modules[8][size - index - 1] = dark;
    else if (index < 9) modules[8][7] = dark;
    else modules[8][15 - index - 1] = dark;
  }
  modules[size - 8][8] = true;

  let row = size - 1;
  let direction = -1;
  let byteIndex = 0;
  let bitIndex = 7;
  for (let column = size - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;
    while (true) {
      for (let offset = 0; offset < 2; offset += 1) {
        const targetColumn = column - offset;
        if (modules[row][targetColumn] !== null) continue;
        let dark = byteIndex < codewords.length && ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        if ((row + targetColumn) % 2 === 0) dark = !dark;
        modules[row][targetColumn] = dark;
        bitIndex -= 1;
        if (bitIndex < 0) {
          byteIndex += 1;
          bitIndex = 7;
        }
      }
      row += direction;
      if (row >= 0 && row < size) continue;
      row -= direction;
      direction = -direction;
      break;
    }
  }
  return modules.map((line) => line.map(Boolean));
}

function buildVerificationMark(verificationUrl: string) {
  const matrix = createVerificationQrMatrix(verificationUrl);
  const cell = 1.36;
  const quietZone = 4;
  const left = 658;
  const bottom = 82;
  const totalSize = (matrix.length + quietZone * 2) * cell;
  const commands = [`1 1 1 rg ${left} ${bottom} ${totalSize.toFixed(2)} ${totalSize.toFixed(2)} re f`, `${NAVY} rg`];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      if (!matrix[row][column]) continue;
      const x = left + (column + quietZone) * cell;
      const y = bottom + (matrix.length - row - 1 + quietZone) * cell;
      commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re f`);
    }
  }
  return commands.join("\n");
}

function buildMicroPattern() {
  const commands: string[] = [`${PALE_GOLD} RG 0.35 w`];
  for (let x = 64; x <= 728; x += 16) {
    commands.push(`${x} 547 m ${x + 8} 555 l ${x} 563 l ${x - 8} 555 l h S`);
  }
  return commands.join("\n");
}

const credentialClasses: AffCredentialClass[] = [
  "Certificate of Completion",
  "Professional Certificate",
  "Advanced Certificate",
  "Academic Certificate",
  "Diploma"
];

export function resolveCredentialClass(certificate: PrintableCertificate): AffCredentialClass {
  const requested = pdfSafe(certificate.credential_class ?? certificate.credential_type ?? certificate.certificate_type).toLowerCase();
  const explicit = credentialClasses.find((item) => item.toLowerCase() === requested);
  if (explicit) return explicit;
  if (pdfSafe(certificate.course_name).toLowerCase().includes("forex foundations")) return "Professional Certificate";
  return "Academic Certificate";
}

function verificationDestination(verificationUrl: string) {
  try {
    const parsed = new URL(verificationUrl);
    return `${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return pdfSafe(verificationUrl);
  }
}

export function hasVerifiedExamProvenance(certificate: PrintableCertificate) {
  return certificate.integrity_verified === true && String(certificate.exam_attempt_id ?? "").trim().length > 0;
}

export function certificateAwardLanguage(certificate: PrintableCertificate) {
  return hasVerifiedExamProvenance(certificate)
    ? "has fulfilled all academic requirements and successfully passed the Academy certification examination for"
    : "is hereby recognized by the Academy for the award of";
}

export function createCertificatePdfDocument(certificate: PrintableCertificate, verificationUrl: string, logo: CertificateLogoImage) {
  const verifiedByExam = hasVerifiedExamProvenance(certificate);
  const signatory = certificate.approved_by || certificate.instructor_name || "Dr. Jean Rene Moricette";
  const signatoryTitle = certificate.signatory_title || "Authorized Academic Signatory";
  const credentialTitle = certificate.course_name || "Academy Credential";
  const credentialClass = resolveCredentialClass(certificate);
  const registrySerial = certificate.registry_serial || certificate.certificate_number;
  const awardLanguage = certificateAwardLanguage(certificate);
  const destination = verificationDestination(verificationUrl);
  const scoreLine = verifiedByExam
    ? centeredText(`VERIFIED EXAMINATION SCORE  ${Math.round(certificate.score)}%`, 183, 10, "F3", GOLD, 420)
    : "";

  const content = `
${IVORY} rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f
${DEEP_NAVY} rg 18 18 756 576 re f
${IVORY} rg 28 28 736 556 re f
${GOLD} RG 3 w 36 36 720 540 re S
${NAVY} RG 1 w 44 44 704 524 re S
${buildOfficialWatermarkPlacement(logo)}
${buildMicroPattern()}
${NAVY} rg 52 475 688 88 re f
${buildOfficialLogoPlacement(logo)}
${GOLD} RG 1 w 76 473 m 716 473 l S
${centeredText(credentialClass.toUpperCase(), 450, 14, "F3", GOLD, 560)}
${centeredText("This official credential certifies that", 418, 11, "F5", CHARCOAL, 520)}
${centeredText(certificate.student_name, 367, 34, "F1", NAVY, 640)}
${GOLD} RG 1.2 w 170 350 m 622 350 l S
${centeredText(awardLanguage, 318, 11, "F5", CHARCOAL, 680)}
${centeredText(credentialTitle, 269, 27, "F2", NAVY, 650)}
${centeredText(verifiedByExam ? "Verified completion under Academy academic and assessment standards" : "Academy credential recorded in the official certificate register", 236, 10, "F4", CHARCOAL, 620)}
${scoreLine}
${GOLD} RG 1 w 76 150 m 286 150 l S
${placedText(signatory, 76, 130, 11, "F2", NAVY)}
${placedText(signatoryTitle, 76, 113, 7, "F3", CHARCOAL)}
${placedText("Academy for Financial Future", 76, 98, 7, "F4", CHARCOAL)}
${placedText("ISSUE DATE", 322, 145, 6.5, "F3", GOLD)}
${placedText(formattedDate(certificate.issue_date), 322, 130, 9, "F4", NAVY)}
${certificate.completion_date ? placedText("COMPLETION DATE", 452, 145, 6.5, "F3", GOLD) : ""}
${certificate.completion_date ? placedText(formattedDate(certificate.completion_date), 452, 130, 9, "F4", NAVY) : ""}
${fittedPlacedText(`CERTIFICATE NO.  ${certificate.certificate_number}`, 322, 112, 8, 300, "F4", CHARCOAL)}
${fittedPlacedText(`VERIFICATION CODE  ${certificate.verification_code}`, 322, 95, 8, 300, "F4", CHARCOAL)}
${fittedPlacedText(`AFF ACADEMIC REGISTRY  ${registrySerial}`, 322, 78, 7, 300, "F3", CHARCOAL)}
${placedText("Issued by Academy for Financial Future", 322, 61, 7, "F4", CHARCOAL)}
${buildVerificationMark(verificationUrl)}
${placedText("SCAN TO VERIFY CREDENTIAL", 653, 68, 6, "F3", GOLD)}
${fittedPlacedText(`VERIFICATION DESTINATION  ${destination}`, 76, 51, 7, 560, "F4", CHARCOAL)}
`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R /F5 8 0 R >> /XObject << /AFFLogo 9 0 R /AFFWatermark 10 0 R >> >> /Contents 11 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logo.jpegHex.length + 1} >>\nstream\n${logo.jpegHex}>\nendstream`,
    `<< /Type /XObject /Subtype /Image /Width ${logo.watermarkWidth ?? logo.width} /Height ${logo.watermarkHeight ?? logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${(logo.watermarkJpegHex ?? logo.jpegHex).length + 1} >>\nstream\n${logo.watermarkJpegHex ?? logo.jpegHex}>\nendstream`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function bytesToHex(bytes: Uint8Array) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) result += bytes[index].toString(16).padStart(2, "0");
  return result;
}

async function loadOfficialAffLogoForPdf(): Promise<CertificateLogoImage> {
  if (typeof document === "undefined") throw new Error("The official AFF logo can only be prepared in a browser.");

  const response = await fetch(OFFICIAL_AFF_LOGO_PATH, { cache: "force-cache" });
  if (!response.ok) throw new Error("The official AFF logo could not be loaded.");
  const sourceBlob = await response.blob();
  const sourceUrl = URL.createObjectURL(sourceBlob);

  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) throw new Error("The official AFF logo could not be prepared for the certificate.");
    sourceContext.drawImage(image, 0, 0);

    const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sourceCanvas.height; y += 1) {
      for (let x = 0; x < sourceCanvas.width; x += 1) {
        if (pixels[(y * sourceCanvas.width + x) * 4 + 3] <= 4) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) throw new Error("The official AFF logo artwork is empty.");

    const padding = 12;
    const height = maxY - minY + 1 + padding * 2;
    const encodeArtwork = async (background: string, alpha: number, cropWidth = maxX - minX + 1) => {
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth + padding * 2;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The official AFF logo could not be prepared for the certificate.");
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = alpha;
      context.drawImage(sourceCanvas, minX, minY, cropWidth, maxY - minY + 1, padding, padding, cropWidth, maxY - minY + 1);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The official AFF logo could not be encoded for the certificate.")), "image/jpeg", 0.96);
      });
      return { blob, width: canvas.width, height: canvas.height };
    };

    const primary = await encodeArtwork("#0A1833", 1);
    const monogramWidth = Math.max(1, Math.round((maxX - minX + 1) * 0.41));
    const watermark = await encodeArtwork("#F7F3EB", 0.075, monogramWidth);
    return {
      jpegHex: bytesToHex(new Uint8Array(await primary.blob.arrayBuffer())),
      width: primary.width,
      height: primary.height,
      watermarkJpegHex: bytesToHex(new Uint8Array(await watermark.blob.arrayBuffer())),
      watermarkWidth: watermark.width,
      watermarkHeight: watermark.height
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function createCertificatePdfBlob(certificate: PrintableCertificate, verificationUrl: string, logoOverride?: CertificateLogoImage) {
  const logo = logoOverride ?? await loadOfficialAffLogoForPdf();
  return new Blob([createCertificatePdfDocument(certificate, verificationUrl, logo)], { type: "application/pdf" });
}
