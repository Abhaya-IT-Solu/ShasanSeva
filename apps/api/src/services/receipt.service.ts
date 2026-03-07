import PDFDocument from 'pdfkit';
import { uploadBuffer } from './r2.service.js';
import { logger } from '../lib/utils.js';

interface ReceiptParams {
    orderId: string;
    userName: string;
    userPhone: string;
    schemeName: string;
    paymentAmount: string;
    paymentId: string;
    paymentDate: Date;
}

/**
 * Generate a PDF receipt for a paid order and upload it to R2.
 * Returns the R2 storage key for the receipt.
 */
export async function generateReceipt(params: ReceiptParams): Promise<string> {
    const {
        orderId,
        userName,
        userPhone,
        schemeName,
        paymentAmount,
        paymentId,
        paymentDate,
    } = params;

    const receiptNumber = `RCP-${orderId.slice(0, 8).toUpperCase()}`;
    const formattedDate = paymentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Build PDF in memory
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Receipt ${receiptNumber}`,
                    Author: 'ShasanSeva',
                    Subject: 'Payment Receipt',
                },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Colors
            const primary = '#1B5E20';
            const secondary = '#F97316';
            const textDark = '#1e293b';
            const textLight = '#64748b';
            const borderColor = '#e2e8f0';

            // ─── Header ───────────────────────────────────────
            doc
                .rect(0, 0, doc.page.width, 100)
                .fill(primary);

            doc
                .fontSize(24)
                .fillColor('#ffffff')
                .font('Helvetica-Bold')
                .text('ShasanSeva', 50, 30, { align: 'left' });

            doc
                .fontSize(10)
                .fillColor('#ffffff')
                .font('Helvetica')
                .text('Government Scheme Assistance Platform', 50, 58, { align: 'left' });

            doc
                .fontSize(18)
                .fillColor('#ffffff')
                .font('Helvetica-Bold')
                .text('PAYMENT RECEIPT', 0, 35, { align: 'right', width: doc.page.width - 50 });

            // ─── Receipt Info Box ─────────────────────────────
            const infoY = 120;

            doc
                .roundedRect(50, infoY, doc.page.width - 100, 60, 4)
                .lineWidth(1)
                .strokeColor(borderColor)
                .stroke();

            doc
                .fontSize(9)
                .fillColor(textLight)
                .font('Helvetica')
                .text('Receipt Number', 70, infoY + 12);
            doc
                .fontSize(12)
                .fillColor(primary)
                .font('Helvetica-Bold')
                .text(receiptNumber, 70, infoY + 26);

            doc
                .fontSize(9)
                .fillColor(textLight)
                .font('Helvetica')
                .text('Date & Time', 280, infoY + 12);
            doc
                .fontSize(12)
                .fillColor(textDark)
                .font('Helvetica-Bold')
                .text(formattedDate, 280, infoY + 26);

            // ─── Divider ──────────────────────────────────────
            const dividerY = infoY + 80;
            doc
                .moveTo(50, dividerY)
                .lineTo(doc.page.width - 50, dividerY)
                .lineWidth(0.5)
                .strokeColor(borderColor)
                .stroke();

            // ─── Details Section ──────────────────────────────
            const detailsY = dividerY + 20;

            const drawRow = (label: string, value: string, y: number) => {
                doc.fontSize(10).fillColor(textLight).font('Helvetica').text(label, 70, y);
                doc.fontSize(10).fillColor(textDark).font('Helvetica-Bold').text(value, 250, y, {
                    width: doc.page.width - 320,
                });
            };

            doc
                .fontSize(14)
                .fillColor(primary)
                .font('Helvetica-Bold')
                .text('Payment Details', 50, detailsY);

            drawRow('Applicant Name', userName || 'N/A', detailsY + 30);
            drawRow('Phone Number', userPhone, detailsY + 52);
            drawRow('Scheme', schemeName, detailsY + 74);
            drawRow('Application ID', orderId.slice(0, 8).toUpperCase(), detailsY + 96);
            drawRow('Payment ID (Razorpay)', paymentId, detailsY + 118);

            // ─── Amount Box ───────────────────────────────────
            const amountY = detailsY + 160;
            doc
                .roundedRect(50, amountY, doc.page.width - 100, 60, 4)
                .fillAndStroke('#f0fdf4', '#bbf7d0');

            doc
                .fontSize(12)
                .fillColor(textLight)
                .font('Helvetica')
                .text('Amount Paid', 70, amountY + 12);
            doc
                .fontSize(24)
                .fillColor(primary)
                .font('Helvetica-Bold')
                .text(`₹${paymentAmount}`, 70, amountY + 28);

            doc
                .fontSize(11)
                .fillColor(primary)
                .font('Helvetica-Bold')
                .text('✓ Payment Successful', 0, amountY + 22, {
                    align: 'right',
                    width: doc.page.width - 70,
                });

            // ─── Status Badge ─────────────────────────────────
            const statusY = amountY + 80;
            doc
                .roundedRect(50, statusY, doc.page.width - 100, 40, 4)
                .fill(secondary + '15');

            doc
                .fontSize(10)
                .fillColor(secondary)
                .font('Helvetica-Bold')
                .text('STATUS: PAYMENT RECEIVED — Your application is now being processed.', 70, statusY + 14, {
                    width: doc.page.width - 140,
                });

            // ─── Footer ───────────────────────────────────────
            const footerY = doc.page.height - 80;
            doc
                .moveTo(50, footerY)
                .lineTo(doc.page.width - 50, footerY)
                .lineWidth(0.5)
                .strokeColor(borderColor)
                .stroke();

            doc
                .fontSize(8)
                .fillColor(textLight)
                .font('Helvetica')
                .text(
                    'This is a computer-generated receipt and does not require a physical signature. ' +
                    'For any queries, contact support at support@shasanseva.com or call 1800-123-456.',
                    50, footerY + 10,
                    { align: 'center', width: doc.page.width - 100 }
                );

            doc
                .fontSize(7)
                .fillColor(textLight)
                .text(`Generated on ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`, 50, footerY + 35, {
                    align: 'center',
                    width: doc.page.width - 100,
                });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });

    // Upload to R2
    const receiptKey = `receipts/${orderId}/receipt.pdf`;

    await uploadBuffer({
        key: receiptKey,
        buffer: pdfBuffer,
        contentType: 'application/pdf',
    });

    logger.info('Receipt generated and uploaded', {
        orderId,
        receiptKey,
        sizeBytes: pdfBuffer.length,
    });

    return receiptKey;
}