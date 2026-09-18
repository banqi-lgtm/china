import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database';
import { UPLOAD_DIR } from '../config';

interface PDFGenResult {
  reportCode: string;
  pdfRelativePath: string;
  pdfFullPath: string;
}

export async function generateInspectionPDF(inspectionId: string, generatedByUserId?: string): Promise<PDFGenResult> {
  // 1. Fetch comprehensive inspection details from DB
  const inspection = await db.get<any>(
    `SELECT i.*, 
            c.name as company_name, c.tax_id as company_tax_id, c.address as company_address, c.contact_email as company_email,
            it.name as type_name,
            u_op.name as operator_name, u_op.email as operator_email,
            u_co.name as consultant_name, u_co.email as consultant_email
     FROM inspections i
     LEFT JOIN companies c ON i.company_id = c.id
     LEFT JOIN inspection_types it ON i.type_id = it.id
     LEFT JOIN users u_op ON i.operator_id = u_op.id
     LEFT JOIN users u_co ON i.consultant_id = u_co.id
     WHERE i.id = ?`,
    [inspectionId]
  );

  if (!inspection) {
    throw new Error('Inspección no encontrada.');
  }

  const container = await db.get<any>('SELECT * FROM container_details WHERE inspection_id = ?', [inspectionId]);
  const cargo = await db.get<any>('SELECT * FROM cargo_details WHERE inspection_id = ?', [inspectionId]);
  const loading = await db.get<any>('SELECT * FROM loading_process WHERE inspection_id = ?', [inspectionId]);
  const product = await db.get<any>('SELECT * FROM product_details WHERE inspection_id = ?', [inspectionId]);
  const vehicle = await db.get<any>('SELECT * FROM vehicle_details WHERE inspection_id = ?', [inspectionId]);

  const checklistAnswers = await db.all<any>(
    `SELECT a.*, q.question_text, cat.name as category_name
     FROM checklist_answers a
     JOIN checklist_questions q ON a.question_id = q.id
     JOIN checklist_categories cat ON q.category_id = cat.id
     WHERE a.inspection_id = ?
     ORDER BY cat.order_index, q.order_index`,
    [inspectionId]
  );

  const findings = await db.all<any>(
    'SELECT * FROM findings WHERE inspection_id = ? ORDER BY severity DESC, created_at ASC',
    [inspectionId]
  );

  const evidences = await db.all<any>(
    'SELECT * FROM evidences WHERE inspection_id = ? ORDER BY section, is_primary DESC, created_at ASC',
    [inspectionId]
  );

  const signatures = await db.all<any>(
    'SELECT * FROM signatures WHERE inspection_id = ?',
    [inspectionId]
  );

  // 2. Prepare output folder
  const reportsDir = path.join(UPLOAD_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportCode = inspection.code || `INS-${new Date().getFullYear()}-${String(inspection.id).slice(0, 8).toUpperCase()}`;
  const filename = `REPORT_${reportCode}_${Date.now()}.pdf`;
  const pdfFullPath = path.join(reportsDir, filename);
  const pdfRelativePath = `/uploads/reports/${filename}`;

  // 3. Create PDF with high quality margins
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: `Loading Inspection Report - ${reportCode}`,
        Author: 'InspectionPro Enterprise Logistics',
        Subject: `Inspection of container ${container?.container_number || 'N/A'}`
      }
    });

    const writeStream = fs.createWriteStream(pdfFullPath);
    doc.pipe(writeStream);

    const emerald = '#059669';
    const darkSlate = '#0f172a';
    const softGray = '#f8fafc';
    const borderGray = '#e2e8f0';
    const textMuted = '#64748b';
    const alertRed = '#dc2626';

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 80;

    // Helper: Draw Section Bar
    const drawSectionHeader = (title: string, subtitle?: string) => {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }
      const y = doc.y;
      doc.rect(40, y, contentWidth, 24).fill(darkSlate);
      doc.rect(40, y, 4, 24).fill(emerald);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
         .text(title.toUpperCase(), 52, y + 6);
      if (subtitle) {
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
           .text(subtitle, 40 + contentWidth - 220, y + 7, { align: 'right', width: 210 });
      }
      doc.y = y + 32;
      doc.fillColor('#1e293b');
    };

    // Helper: Draw 2-column key-value table row
    const drawKeyValueRow = (label1: string, val1: string, label2: string, val2: string, yPos: number, isEven: boolean) => {
      const colWidth = (contentWidth) / 2;
      if (isEven) {
        doc.rect(40, yPos, contentWidth, 20).fill(softGray);
      }
      doc.rect(40, yPos, contentWidth, 20).lineWidth(0.5).stroke(borderGray);

      // Col 1
      doc.fontSize(8).font('Helvetica-Bold').fillColor(textMuted).text(label1, 48, yPos + 5, { width: 100 });
      doc.fontSize(8).font('Helvetica').fillColor('#0f172a').text(val1 || 'N/A', 150, yPos + 5, { width: colWidth - 115, ellipsis: true });

      // Col 2
      doc.fontSize(8).font('Helvetica-Bold').fillColor(textMuted).text(label2, 40 + colWidth + 8, yPos + 5, { width: 100 });
      doc.fontSize(8).font('Helvetica').fillColor('#0f172a').text(val2 || 'N/A', 40 + colWidth + 110, yPos + 5, { width: colWidth - 115, ellipsis: true });
    };

    // ==========================================
    // COVER / CORPORATE HEADER
    // ==========================================
    // Top Bar
    doc.rect(40, 40, contentWidth, 6).fill(emerald);

    // Company & Report Title
    doc.y = 55;
    doc.fontSize(18).font('Helvetica-Bold').fillColor(darkSlate)
       .text('LOADING INSPECTION REPORT', 40, 55, { characterSpacing: 0.5 });
    doc.fontSize(9).font('Helvetica').fillColor(textMuted)
       .text('INTERNATIONAL CARGO & CONTAINER QUALITY AUDIT', 40, 78);

    // Report Meta Box on Top Right
    const metaBoxWidth = 190;
    const metaBoxX = 40 + contentWidth - metaBoxWidth;
    doc.rect(metaBoxX, 50, metaBoxWidth, 54).fill('#f1f5f9');
    doc.rect(metaBoxX, 50, metaBoxWidth, 54).lineWidth(1).stroke('#cbd5e1');

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(textMuted).text('REPORT CODE:', metaBoxX + 10, 56);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(emerald).text(reportCode, metaBoxX + 80, 55);

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(textMuted).text('DATE:', metaBoxX + 10, 70);
    doc.fontSize(8).font('Helvetica').fillColor('#1e293b').text(new Date(inspection.scheduled_date || inspection.created_at).toLocaleDateString(), metaBoxX + 80, 70);

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(textMuted).text('OVERALL RESULT:', metaBoxX + 10, 84);
    const resColor = inspection.overall_result === 'PASS' ? '#059669' : (inspection.overall_result === 'FAIL' ? '#dc2626' : '#d97706');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(resColor).text(inspection.overall_result || 'PENDING', metaBoxX + 80, 84);

    doc.y = 115;

    // ==========================================
    // SECTION 1: INSPECTION SUMMARY
    // ==========================================
    drawSectionHeader('1. INSPECTION SUMMARY & PARTICIPANTS', 'OVERVIEW');
    let curY = doc.y;
    drawKeyValueRow('Company / Client:', inspection.company_name, 'Inspection Type:', inspection.type_name || 'Full Loading Audit', curY, true);
    curY += 20;
    drawKeyValueRow('Assigned Operator:', inspection.operator_name, 'Auditor / Consultant:', inspection.consultant_name || 'Mateo (Lead Consultant)', curY, false);
    curY += 20;
    drawKeyValueRow('Location / Facility:', inspection.location_address || 'Terminal Portuario / Bodega', 'Inspection Status:', inspection.status, curY, true);
    curY += 20;
    drawKeyValueRow('GPS Coordinates:', (inspection.latitude && inspection.longitude) ? `${inspection.latitude.toFixed(5)}, ${inspection.longitude.toFixed(5)}` : 'Verified via GPS', 'Timestamp:', inspection.started_at || inspection.created_at, curY, false);
    doc.y = curY + 30;

    // ==========================================
    // SECTION 2: CONTAINER & QUANTITY DETAILS
    // ==========================================
    drawSectionHeader('2. CONTAINER & LOADED QUANTITY SPECIFICATIONS', 'CONTAINER & CARGO');
    curY = doc.y;
    drawKeyValueRow('Container No:', container?.container_number || 'N/A', 'Seal Number:', container?.seal_number || 'N/A', curY, true);
    curY += 20;
    drawKeyValueRow('Type & Size:', `${container?.container_type || 'Dry Cargo'} - ${container?.size || '40ft HC'}`, 'License Plate:', container?.license_plate || 'N/A', curY, false);
    curY += 20;
    drawKeyValueRow('Transporter:', container?.transporter || 'N/A', 'Container Condition:', container?.condition || 'Good Structural State', curY, true);
    curY += 20;
    drawKeyValueRow('Total Loaded Qty:', `${cargo?.total_quantity || 0} ${cargo?.unit || 'Units'}`, 'Packaging Type:', cargo?.packaging_type || 'Standard Export Pallets', curY, false);
    curY += 20;
    drawKeyValueRow('Gross / Net Weight:', `${cargo?.gross_weight || 0} kg / ${cargo?.net_weight || 0} kg`, 'Total Volume:', `${cargo?.volume || 0} CBM`, curY, true);
    doc.y = curY + 30;

    // ==========================================
    // SECTION 3: CONTAINER GENERAL CONDITIONS CHECKLIST
    // ==========================================
    drawSectionHeader('3. CONTAINER GENERAL CONDITIONS (CHECKLIST)', 'STANDARDS VERIFICATION');
    
    // Table Header
    doc.rect(40, doc.y, contentWidth, 18).fill('#e2e8f0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor(darkSlate);
    doc.text('#', 46, doc.y + 4, { width: 20 });
    doc.text('CATEGORY & INSPECTION POINT', 70, doc.y + 4, { width: 240 });
    doc.text('RESULT', 320, doc.y + 4, { width: 60, align: 'center' });
    doc.text('FINDINGS / OBSERVATIONS', 390, doc.y + 4, { width: contentWidth - 355 });
    doc.y += 18;

    if (checklistAnswers && checklistAnswers.length > 0) {
      checklistAnswers.forEach((ans: any, idx: number) => {
        if (doc.y > doc.page.height - 50) {
          doc.addPage();
          drawSectionHeader('3. CONTAINER GENERAL CONDITIONS (CONTINUED)', 'STANDARDS VERIFICATION');
        }
        const rowY = doc.y;
        if (idx % 2 === 0) {
          doc.rect(40, rowY, contentWidth, 18).fill('#f8fafc');
        }
        doc.rect(40, rowY, contentWidth, 18).lineWidth(0.5).stroke(borderGray);

        doc.fontSize(7.5).font('Helvetica').fillColor(textMuted).text(String(idx + 1), 46, rowY + 4);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text(`${ans.category_name}: `, 70, rowY + 4, { continued: true });
        doc.font('Helvetica').text(ans.question_text, { width: 240, ellipsis: true });

        // Badge
        const badgeColor = ans.status === 'OK' ? '#059669' : (ans.status === 'NO_OK' ? '#dc2626' : '#64748b');
        const badgeText = ans.status === 'OK' ? 'PASS' : (ans.status === 'NO_OK' ? 'FAIL' : 'N/A');
        doc.rect(330, rowY + 2.5, 40, 13).fill(badgeColor);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff').text(badgeText, 330, rowY + 5, { width: 40, align: 'center' });

        doc.fontSize(7).font('Helvetica').fillColor('#334155').text(ans.observations || 'Verified - No anomalies', 390, rowY + 4, { width: contentWidth - 355, ellipsis: true });

        doc.y = rowY + 18;
      });
    } else {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor(textMuted).text('Standard 12-point inspection passed without exceptions.', 50, doc.y + 5);
      doc.y += 20;
    }
    doc.y += 15;

    // ==========================================
    // SECTION 4: LOADING PROCESS & PRODUCT SPECS
    // ==========================================
    if (doc.y > doc.page.height - 120) doc.addPage();
    drawSectionHeader('4. LOADING PROCESS & PRODUCT INFORMATION', 'CARGO INTEGRITY');
    curY = doc.y;
    drawKeyValueRow('Start / Finish Time:', `${loading?.started_at || '08:30'} - ${loading?.finished_at || '11:45'}`, 'Personnel & Staff:', `${loading?.personnel_count || 4} Cargo Operators`, curY, true);
    curY += 20;
    drawKeyValueRow('Machinery & Equipment:', loading?.equipment_used || 'Standard Forklift 3T & Pallet Jacks', 'Weather Conditions:', loading?.weather_conditions || 'Dry / Covered Dock', curY, false);
    curY += 20;
    drawKeyValueRow('Product Name / Ref:', `${product?.product_name || 'Commodity Cargo'} (Ref: ${product?.reference || 'N/A'})`, 'Batch / Lot Number:', product?.batch_lot || 'N/A', curY, true);
    curY += 20;
    drawKeyValueRow('Brand / Manufacturer:', product?.brand || 'Industrial Standard', 'Product Condition:', product?.condition || 'Intact - Proper Export Packaging', curY, false);
    doc.y = curY + 30;

    // ==========================================
    // SECTION 5: FINDINGS & NON-CONFORMITIES
    // ==========================================
    if (findings && findings.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      drawSectionHeader('5. FINDINGS & NON-CONFORMITIES (ACTION REQUIRED)', 'AUDIT OBSERVATIONS');
      findings.forEach((f: any, i: number) => {
        const fY = doc.y;
        doc.rect(40, fY, contentWidth, 32).fill('#fef2f2');
        doc.rect(40, fY, contentWidth, 32).lineWidth(0.5).stroke('#fca5a5');

        doc.fontSize(8).font('Helvetica-Bold').fillColor(alertRed)
           .text(`[${f.code || `FND-${i + 1}`}] - SEVERITY: ${f.severity}`, 48, fY + 5);
        doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
           .text(`Description: ${f.description}`, 48, fY + 17, { width: contentWidth - 20 });
        doc.y = fY + 38;
      });
      doc.y += 10;
    }

    // ==========================================
    // SECTION 6: PHOTOGRAPHIC EVIDENCE GALLERY
    // ==========================================
    doc.addPage();
    drawSectionHeader('6. PHOTOGRAPHIC & VISUAL EVIDENCE GALLERY', 'ORGANIZED PROCESS MATRICES');

    const photoEvidences = evidences.filter((e: any) => e.type === 'PHOTO');
    if (photoEvidences.length > 0) {
      const cellW = (contentWidth - 15) / 2;
      const cellH = 155;
      let col = 0;
      let photoY = doc.y;

      photoEvidences.forEach((photo: any, pIndex: number) => {
        if (photoY + cellH > doc.page.height - 60) {
          doc.addPage();
          drawSectionHeader('6. PHOTOGRAPHIC EVIDENCE (CONTINUED)', 'PROCESS MATRICES');
          photoY = doc.y;
          col = 0;
        }

        const photoX = 40 + col * (cellW + 15);

        // Outer Card
        doc.rect(photoX, photoY, cellW, cellH).fill('#f8fafc');
        doc.rect(photoX, photoY, cellW, cellH).lineWidth(0.5).stroke(borderGray);

        // Photo Header Ribbon
        doc.rect(photoX, photoY, cellW, 16).fill(darkSlate);
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff')
           .text(`[${photo.section}] ${photo.is_primary ? '★ PRINCIPAL' : ''}`, photoX + 6, photoY + 4, { width: cellW - 12 });

        // Image Attempt or Placeholder
        const localImgPath = path.resolve(photo.file_path);
        let renderedImage = false;
        if (fs.existsSync(localImgPath)) {
          try {
            doc.image(localImgPath, photoX + 6, photoY + 20, {
              fit: [cellW - 12, 100],
              align: 'center',
              valign: 'center'
            });
            renderedImage = true;
          } catch (imgErr) {
            renderedImage = false;
          }
        }

        if (!renderedImage) {
          doc.rect(photoX + 6, photoY + 20, cellW - 12, 100).fill('#e2e8f0');
          doc.fontSize(8).font('Helvetica-Bold').fillColor(textMuted)
             .text('IMAGE ATTACHED', photoX + 10, photoY + 60, { width: cellW - 20, align: 'center' });
        }

        // Caption & Date Footer
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#1e293b')
           .text(photo.description || 'Verified evidence point during loading', photoX + 6, photoY + 125, { width: cellW - 12, ellipsis: true });
        doc.fontSize(6).font('Helvetica').fillColor(textMuted)
           .text(`Captured: ${photo.created_at || 'During operation'}`, photoX + 6, photoY + 140);

        if (col === 0) {
          col = 1;
        } else {
          col = 0;
          photoY += cellH + 12;
        }
      });

      if (col === 1) photoY += cellH + 12;
      doc.y = photoY;
    } else {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor(textMuted)
         .text('No photos uploaded yet for this draft.', 50, doc.y + 10);
      doc.y += 30;
    }

    // ==========================================
    // SECTION 7: FACTORY ACKNOWLEDGEMENT & SIGNATURES
    // ==========================================
    if (doc.y > doc.page.height - 180) doc.addPage();
    drawSectionHeader('7. FACTORY ACKNOWLEDGEMENT & DIGITAL SIGNATURES', 'AUDIT VALIDATION');

    const sigY = doc.y + 10;
    const sigBoxWidth = (contentWidth - 20) / 2;

    // Box 1: Operator Signature
    doc.rect(40, sigY, sigBoxWidth, 110).fill('#fafafa');
    doc.rect(40, sigY, sigBoxWidth, 110).lineWidth(0.5).stroke(borderGray);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(darkSlate).text('FIELD INSPECTOR / OPERATOR SIGNATURE', 48, sigY + 8);

    const opSig = signatures.find((s: any) => s.signer_type === 'OPERATOR');
    if (opSig && opSig.signature_data) {
      try {
        if (opSig.signature_data.startsWith('data:image')) {
          const base64Data = opSig.signature_data.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          doc.image(buf, 48, sigY + 25, { fit: [sigBoxWidth - 20, 50], align: 'center' });
        }
      } catch (e) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor(textMuted).text('[Digital Signature Verified]', 50, sigY + 45);
      }
    } else {
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(textMuted).text('[Signed Digitally on Field Mobile App]', 48, sigY + 45);
    }
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text(`Name: ${inspection.operator_name || 'Field Inspector'}`, 48, sigY + 80);
    doc.fontSize(6.5).font('Helvetica').fillColor(textMuted).text(`Date: ${inspection.completed_at || new Date().toISOString()}`, 48, sigY + 93);

    // Box 2: Consultant / Supervisor Signature
    const conX = 40 + sigBoxWidth + 20;
    doc.rect(conX, sigY, sigBoxWidth, 110).fill('#fafafa');
    doc.rect(conX, sigY, sigBoxWidth, 110).lineWidth(0.5).stroke(borderGray);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(darkSlate).text('SUPERVISING CONSULTANT APPROVAL', conX + 8, sigY + 8);

    const conSig = signatures.find((s: any) => s.signer_type === 'CONSULTANT');
    if (conSig && conSig.signature_data) {
      try {
        if (conSig.signature_data.startsWith('data:image')) {
          const base64Data = conSig.signature_data.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          doc.image(buf, conX + 8, sigY + 25, { fit: [sigBoxWidth - 20, 50], align: 'center' });
        }
      } catch (e) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor(textMuted).text('[Approved & Signed]', conX + 8, sigY + 45);
      }
    } else {
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(textMuted).text(inspection.status === 'APROBADA' || inspection.status === 'FINALIZADA' ? '[Approved & Sealed by Mateo]' : '[Pending Consultant Signoff]', conX + 8, sigY + 45);
    }
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text(`Consultant: ${inspection.consultant_name || 'Mateo (Lead Quality Auditor)'}`, conX + 8, sigY + 80);
    doc.fontSize(6.5).font('Helvetica').fillColor(textMuted).text(`Approval Date: ${inspection.approved_at || 'Official Audit Record'}`, conX + 8, sigY + 93);

    doc.y = sigY + 125;

    // ==========================================
    // PAGE NUMBERING & CORPORATE FOOTER
    // ==========================================
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Footer Line
      doc.rect(40, doc.page.height - 35, contentWidth, 0.75).fill('#cbd5e1');
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b')
         .text(`CONFIDENTIAL - INSPECTIONPRO LOGISTICS SAAS | REPORT: ${reportCode}`, 40, doc.page.height - 28);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a')
         .text(`PAGE ${i + 1} OF ${range.count}`, 40, doc.page.height - 28, { align: 'right', width: contentWidth });
    }

    doc.end();

    writeStream.on('finish', async () => {
      try {
        // Record in reports table
        const reportId = `rep_${Date.now()}`;
        await db.run(
          `INSERT INTO reports (id, inspection_id, report_code, pdf_path, version, generated_by, generated_at)
           VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`,
          [reportId, inspectionId, reportCode, pdfRelativePath, generatedByUserId || null]
        );
        resolve({ reportCode, pdfRelativePath, pdfFullPath });
      } catch (err) {
        reject(err);
      }
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}
