import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

function generateVerificationCode(): string {
  return randomUUID().split("-")[0].toUpperCase() + "-" + randomUUID().split("-")[0].toUpperCase();
}

export async function issueCertificate(params: {
  userId: string;
  courseId?: string;
  learningPathId?: string;
}) {
  const verificationCode = generateVerificationCode();

  const certificate = await prisma.certificate.create({
    data: {
      userId: params.userId,
      courseId: params.courseId,
      learningPathId: params.learningPathId,
      verificationCode,
    },
  });

  return certificate;
}

export async function renderCertificatePdf(certificateId: string): Promise<Uint8Array> {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    include: { user: true, course: true, learningPath: true },
  });

  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 paisagem
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.24, 0.23, 0.6),
    borderWidth: 3,
  });

  const title = "Certificado de Conclusão";
  const titleSize = 30;
  page.drawText(title, {
    x: (width - font.widthOfTextAtSize(title, titleSize)) / 2,
    y: height - 130,
    size: titleSize,
    font,
    color: rgb(0.16, 0.15, 0.4),
  });

  const name = certificate.user.name;
  const nameSize = 24;
  page.drawText(name, {
    x: (width - font.widthOfTextAtSize(name, nameSize)) / 2,
    y: height - 230,
    size: nameSize,
    font,
    color: rgb(0.05, 0.05, 0.1),
  });

  const itemTitle = certificate.course?.title ?? certificate.learningPath?.title ?? "";
  const bodyLine1 = "concluiu com êxito o treinamento";
  const bodySize = 14;
  page.drawText(bodyLine1, {
    x: (width - fontRegular.widthOfTextAtSize(bodyLine1, bodySize)) / 2,
    y: height - 270,
    size: bodySize,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  const itemSize = 20;
  page.drawText(itemTitle, {
    x: (width - font.widthOfTextAtSize(itemTitle, itemSize)) / 2,
    y: height - 305,
    size: itemSize,
    font,
    color: rgb(0.16, 0.15, 0.4),
  });

  const issued = `Emitido em ${formatDate(certificate.issuedAt)}`;
  page.drawText(issued, {
    x: 80,
    y: 90,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  const code = `Código de verificação: ${certificate.verificationCode}`;
  page.drawText(code, {
    x: width - 80 - fontRegular.widthOfTextAtSize(code, 11),
    y: 90,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  const verifyUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/verify/${certificate.verificationCode}`;
  page.drawText(verifyUrl, {
    x: (width - fontRegular.widthOfTextAtSize(verifyUrl, 11)) / 2,
    y: 65,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.6),
  });

  return doc.save();
}
