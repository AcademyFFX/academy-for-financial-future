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
};

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

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function formattedDate(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return pdfSafe(raw) || "Not recorded";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function buildSeal() {
  return `
${GOLD} RG 2 w
127 514 m 127 531.7 112.7 546 95 546 c 77.3 546 63 531.7 63 514 c 63 496.3 77.3 482 95 482 c 112.7 482 127 496.3 127 514 c S
${NAVY} RG 1 w
121 514 m 121 528.4 109.4 540 95 540 c 80.6 540 69 528.4 69 514 c 69 499.6 80.6 488 95 488 c 109.4 488 121 499.6 121 514 c S
${GOLD} rg BT /F1 22 Tf 76 508 Td (AFF) Tj ET
${IVORY} rg BT /F3 5 Tf 77 494 Td (ACADEMY SEAL) Tj ET`;
}

function buildVerificationMark(payload: string) {
  const size = 21;
  const cell = 3;
  const left = 664;
  const bottom = 83;
  const commands = [`1 1 1 rg ${left - 6} ${bottom - 6} ${size * cell + 12} ${size * cell + 12} re f`, `${NAVY} rg`];

  function finder(x: number, y: number) {
    commands.push(`${left + x * cell} ${bottom + y * cell} ${cell * 7} ${cell * 7} re f`);
    commands.push(`1 1 1 rg ${left + (x + 1) * cell} ${bottom + (y + 1) * cell} ${cell * 5} ${cell * 5} re f ${NAVY} rg`);
    commands.push(`${left + (x + 2) * cell} ${bottom + (y + 2) * cell} ${cell * 3} ${cell * 3} re f`);
  }

  finder(0, 0);
  finder(14, 0);
  finder(0, 14);
  const seed = hashText(payload);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinder = (x < 7 && y < 7) || (x >= 14 && y < 7) || (x < 7 && y >= 14);
      if (inFinder) continue;
      const bit = (Math.imul(seed + x * 37 + y * 149, 2654435761) >>> ((x + y) % 13)) & 1;
      if (bit) commands.push(`${left + x * cell} ${bottom + y * cell} ${cell} ${cell} re f`);
    }
  }
  return commands.join("\n");
}

function buildMicroPattern() {
  const commands: string[] = [`${PALE_GOLD} RG 0.35 w`];
  for (let x = 64; x <= 728; x += 16) {
    commands.push(`${x} 49 m ${x + 8} 57 l ${x} 65 l ${x - 8} 57 l h S`);
    commands.push(`${x} 547 m ${x + 8} 555 l ${x} 563 l ${x - 8} 555 l h S`);
  }
  return commands.join("\n");
}

export function hasVerifiedExamProvenance(certificate: PrintableCertificate) {
  return certificate.integrity_verified === true && String(certificate.exam_attempt_id ?? "").trim().length > 0;
}

export function certificateAwardLanguage(certificate: PrintableCertificate) {
  return hasVerifiedExamProvenance(certificate)
    ? "has fulfilled all academic requirements and successfully passed the Academy certification examination for"
    : "is hereby recognized by the Academy for the award of";
}

export function createCertificatePdfDocument(certificate: PrintableCertificate, verificationUrl: string) {
  const verifiedByExam = hasVerifiedExamProvenance(certificate);
  const signatory = certificate.approved_by || certificate.instructor_name || "Dr. Jean Rene Moricette";
  const credentialTitle = certificate.course_name || "Academy Credential";
  const awardLanguage = certificateAwardLanguage(certificate);
  const securityPayload = `${certificate.certificate_number}|${certificate.verification_code}|${verificationUrl}`;
  const scoreLine = verifiedByExam
    ? centeredText(`VERIFIED EXAMINATION SCORE  ${Math.round(certificate.score)}%`, 170, 10, "F3", GOLD, 420)
    : "";

  const content = `
${IVORY} rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f
${DEEP_NAVY} rg 18 18 756 576 re f
${IVORY} rg 28 28 736 556 re f
${GOLD} RG 3 w 36 36 720 540 re S
${NAVY} RG 1 w 44 44 704 524 re S
${buildMicroPattern()}
${PALE_GOLD} rg BT /F1 126 Tf 278 232 Td (AFF) Tj ET
${NAVY} rg 52 475 688 78 re f
${buildSeal()}
${GOLD} rg BT /F3 12 Tf 150 529 Td (ACADEMY FOR FINANCIAL FUTURE) Tj ET
${IVORY} rg BT /F4 8 Tf 150 510 Td (LEARN  -  GROW  -  PROSPER) Tj ET
${GOLD} RG 1 w 150 495 m 722 495 l S
${centeredText("ACADEMIC CERTIFICATE", 450, 14, "F3", GOLD, 560)}
${centeredText("This official credential certifies that", 418, 11, "F5", CHARCOAL, 520)}
${centeredText(certificate.student_name, 367, 34, "F1", NAVY, 640)}
${GOLD} RG 1.2 w 170 350 m 622 350 l S
${centeredText(awardLanguage, 318, 11, "F5", CHARCOAL, 680)}
${centeredText(credentialTitle, 269, 27, "F2", NAVY, 650)}
${centeredText(verifiedByExam ? "Verified completion under Academy academic and assessment standards" : "Academy credential recorded in the official certificate register", 236, 10, "F4", CHARCOAL, 620)}
${scoreLine}
${GOLD} RG 1 w 76 139 m 286 139 l S
${placedText(signatory, 76, 119, 11, "F2", NAVY)}
${placedText("ACADEMY INSTRUCTOR AND AUTHORIZED SIGNATORY", 76, 102, 7, "F3", CHARCOAL)}
${placedText(`ISSUED  ${formattedDate(certificate.issue_date)}`, 322, 133, 9, "F3", NAVY)}
${placedText(`CERTIFICATE NO.  ${certificate.certificate_number}`, 322, 113, 8, "F4", CHARCOAL)}
${placedText(`VERIFICATION  ${certificate.verification_code}`, 322, 95, 8, "F4", CHARCOAL)}
${buildVerificationMark(securityPayload)}
${centeredText("SECURE DIGITAL VERIFICATION", 67, 7, "F3", GOLD, 250)}
${placedText("Verify this credential using the certificate number and verification code.", 76, 67, 7, "F4", CHARCOAL)}
${placedText(`SERIAL ${certificate.certificate_number}  |  AFF ACADEMIC REGISTRY`, 76, 51, 6, "F4", CHARCOAL)}
`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R /F5 8 0 R >> >> /Contents 9 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
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

export function createCertificatePdfBlob(certificate: PrintableCertificate, verificationUrl: string) {
  return new Blob([createCertificatePdfDocument(certificate, verificationUrl)], { type: "application/pdf" });
}
