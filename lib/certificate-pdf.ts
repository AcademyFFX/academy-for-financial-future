export type PrintableCertificate = {
  certificate_number: string;
  student_name: string;
  course_name: string;
  score: number;
  issue_date: string;
  completion_date?: string | null;
  verification_code: string;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildQrSquares(payload: string) {
  const size = 17;
  const cell = 4;
  const left = 468;
  const bottom = 122;
  const commands: string[] = [];

  function finder(x: number, y: number) {
    commands.push(`${left + x * cell} ${bottom + y * cell} ${cell * 5} ${cell * 5} re f`);
    commands.push(`1 1 1 rg ${left + (x + 1) * cell} ${bottom + (y + 1) * cell} ${cell * 3} ${cell * 3} re f 0.03 0.08 0.18 rg`);
    commands.push(`${left + (x + 2) * cell} ${bottom + (y + 2) * cell} ${cell} ${cell} re f`);
  }

  finder(0, 0);
  finder(12, 0);
  finder(0, 12);

  const seed = hashText(payload);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinder =
        (x < 5 && y < 5) ||
        (x >= 12 && y < 5) ||
        (x < 5 && y >= 12);
      if (inFinder) continue;
      const bit = (Math.imul(seed + x * 31 + y * 131, 2654435761) >>> 28) % 2 === 0;
      if (bit) commands.push(`${left + x * cell} ${bottom + y * cell} ${cell} ${cell} re f`);
    }
  }

  return commands.join("\n");
}

export function createCertificatePdfBlob(certificate: PrintableCertificate, verificationUrl: string) {
  const completionDate = certificate.completion_date ?? certificate.issue_date;
  const content = `
0.03 0.08 0.18 rg 0 0 612 792 re f
0.82 0.64 0.28 RG 5 w 36 36 540 720 re S
0.82 0.64 0.28 RG 1.5 w 50 50 512 692 re S
0.82 0.64 0.28 rg
BT /F1 14 Tf 92 700 Td (${escapePdfText("ACADEMY FOR FINANCIAL FUTURE")}) Tj ET
BT /F2 10 Tf 206 676 Td (${escapePdfText("Forex Training Division")}) Tj ET
BT /F1 28 Tf 145 616 Td (${escapePdfText("Certificate of Completion")}) Tj ET
1 1 1 rg
BT /F2 12 Tf 155 574 Td (${escapePdfText("This certifies that")}) Tj ET
BT /F1 26 Tf 130 536 Td (${escapePdfText(certificate.student_name)}) Tj ET
BT /F2 12 Tf 122 498 Td (${escapePdfText("has successfully completed all required lessons, quizzes, and approved assignments for")}) Tj ET
0.82 0.64 0.28 rg
BT /F1 20 Tf 132 462 Td (${escapePdfText(certificate.course_name)}) Tj ET
1 1 1 rg
BT /F2 11 Tf 80 390 Td (${escapePdfText(`Certificate ID: ${certificate.certificate_number}`)}) Tj ET
BT /F2 11 Tf 80 368 Td (${escapePdfText(`Verification Code: ${certificate.verification_code}`)}) Tj ET
BT /F2 11 Tf 80 346 Td (${escapePdfText(`Completion Date: ${new Date(completionDate).toLocaleDateString()}`)}) Tj ET
BT /F2 11 Tf 80 324 Td (${escapePdfText(`Issue Date: ${new Date(certificate.issue_date).toLocaleDateString()}`)}) Tj ET
BT /F2 11 Tf 80 302 Td (${escapePdfText(`Certification Score: ${certificate.score}%`)}) Tj ET
0.82 0.64 0.28 RG 1 w 80 204 190 0 l S
1 1 1 rg
BT /F2 11 Tf 80 184 Td (${escapePdfText("Dr. Jean Rene Moricette")}) Tj ET
BT /F2 9 Tf 80 168 Td (${escapePdfText("Administrator and Instructor Signature")}) Tj ET
0.03 0.08 0.18 rg
${buildQrSquares(verificationUrl)}
1 1 1 rg
BT /F2 8 Tf 420 102 Td (${escapePdfText("Scan or verify at /verify")}) Tj ET
BT /F2 7 Tf 66 74 Td (${escapePdfText("This certificate can be verified by employers and institutions through the Academy for Financial Future verification portal.")}) Tj ET
`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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

  return new Blob([pdf], { type: "application/pdf" });
}
