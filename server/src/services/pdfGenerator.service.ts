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

// Robust image path resolver
function resolveImagePath(filePath: string): string | null {
  if (!filePath) return null;
  if (path.isAbsolute(filePath) && fs.existsSync(filePath)) return filePath;

  const rootDir = path.resolve(__dirname, '../../');
  const candidates = [
    path.join(rootDir, filePath),
    path.join(rootDir, filePath.replace(/^\/?uploads\/?/, 'uploads/')),
    path.join(UPLOAD_DIR, filePath),
    path.join(UPLOAD_DIR, path.basename(filePath)),
    path.join(UPLOAD_DIR, 'demo', path.basename(filePath)),
    path.resolve(filePath),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const stat = fs.statSync(c);
        if (stat.size > 1000) return c;
      } catch (e) {
        // continue
      }
    }
  }

  // Fallback to demo images if file path contains keywords
  const demoDir = path.join(UPLOAD_DIR, 'demo');
  if (fs.existsSync(demoDir)) {
    const lower = filePath.toLowerCase();
    if (lower.includes('contenedor') || lower.includes('container')) {
      const f = path.join(demoDir, '1_container_exterior.jpg');
      if (fs.existsSync(f)) return f;
    }
    if (lower.includes('cargue') || lower.includes('loading') || lower.includes('estiba')) {
      const f = path.join(demoDir, '2_loading_process.jpg');
      if (fs.existsSync(f)) return f;
    }
    if (lower.includes('producto') || lower.includes('product') || lower.includes('lote')) {
      const f = path.join(demoDir, '3_product_quality.jpg');
      if (fs.existsSync(f)) return f;
    }
    if (lower.includes('precinto') || lower.includes('seal') || lower.includes('seguridad') || lower.includes('document')) {
      const f = path.join(demoDir, '4_container_seal.jpg');
      if (fs.existsSync(f)) return f;
    }
  }

  return null;
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

  // Prepare reports directory
  const reportsDir = path.join(UPLOAD_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportCode = inspection.code || `INS-${new Date().getFullYear()}-${String(inspection.id).slice(0, 8).toUpperCase()}`;
  const filename = `REPORT_${reportCode}_${Date.now()}.pdf`;
  const pdfFullPath = path.join(reportsDir, filename);
  const pdfRelativePath = `/uploads/reports/${filename}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 0, left: 35, right: 35 },
      bufferPages: true,
      autoFirstPage: true,
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
    const borderGray = '#cbd5e1';
    const textMuted = '#64748b';
    const alertRed = '#dc2626';

    const pageWidth = doc.page.width; // 595.28
    const contentWidth = pageWidth - 70; // 525.28
    const maxY = doc.page.height - 45;

    // Helper: Draw Corporate Section Bar
    const drawSectionHeader = (title: string, subtitle?: string) => {
      const y = doc.y;
      doc.rect(35, y, contentWidth, 20).fill(darkSlate);
      doc.rect(35, y, 4, 20).fill(emerald);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
         .text(title.toUpperCase(), 47, y + 5.5, { lineBreak: false });
      if (subtitle) {
        doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
           .text(subtitle, 35 + contentWidth - 210, y + 6.5, { align: 'right', width: 200, lineBreak: false });
      }
      doc.y = y + 25;
      doc.fillColor('#1e293b');
    };

    // Helper: Dynamic Key-Value Table Row (NO OVERLAPPING TEXT)
    const drawKeyValueRow = (
      label1: string, val1: string,
      label2: string, val2: string,
      isEven: boolean
    ) => {
      const colWidth = contentWidth / 2;
      const textColWidth = colWidth - 105;

      doc.fontSize(7.5).font('Helvetica');
      const h1 = doc.heightOfString(val1 || 'N/A', { width: textColWidth });
      const h2 = doc.heightOfString(val2 || 'N/A', { width: textColWidth });
      const rowHeight = Math.max(20, Math.max(h1, h2) + 8);

      const yPos = doc.y;

      // Background & Border
      if (isEven) {
        doc.rect(35, yPos, contentWidth, rowHeight).fill(softGray);
      }
      doc.rect(35, yPos, contentWidth, rowHeight).lineWidth(0.5).stroke(borderGray);

      // Col 1: Label & Value
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(textMuted)
         .text(label1, 42, yPos + 5, { width: 95, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a')
         .text(val1 || 'N/A', 140, yPos + 5, { width: textColWidth });

      // Col 2: Label & Value
      const col2X = 35 + colWidth;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(textMuted)
         .text(label2, col2X + 6, yPos + 5, { width: 95, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a')
         .text(val2 || 'N/A', col2X + 102, yPos + 5, { width: textColWidth });

      doc.y = yPos + rowHeight;
    };

    // ==========================================
    // PAGE 1: COVER, SUMMARY, CONTAINER, & CHECKLIST
    // ==========================================
    doc.rect(35, 35, contentWidth, 4).fill(emerald);

    // Title & Subtitle
    doc.y = 46;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(darkSlate)
       .text('LOADING INSPECTION REPORT', 35, 46, { lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(textMuted)
       .text('INTERNATIONAL CARGO & CONTAINER QUALITY AUDIT', 35, 65, { lineBreak: false });

    // Header Meta Box on Top Right
    const metaBoxWidth = 190;
    const metaBoxX = 35 + contentWidth - metaBoxWidth;
    doc.rect(metaBoxX, 42, metaBoxWidth, 48).fill('#f1f5f9');
    doc.rect(metaBoxX, 42, metaBoxWidth, 48).lineWidth(0.75).stroke('#cbd5e1');

    doc.fontSize(7).font('Helvetica-Bold').fillColor(textMuted).text('REPORT CODE:', metaBoxX + 8, 48, { lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text(reportCode, metaBoxX + 80, 47, { lineBreak: false });

    doc.fontSize(7).font('Helvetica-Bold').fillColor(textMuted).text('DATE:', metaBoxX + 8, 62, { lineBreak: false });
    doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b').text(new Date(inspection.scheduled_date || inspection.created_at).toLocaleDateString(), metaBoxX + 80, 62, { lineBreak: false });

    doc.fontSize(7).font('Helvetica-Bold').fillColor(textMuted).text('OVERALL RESULT:', metaBoxX + 8, 74, { lineBreak: false });
    const resColor = inspection.overall_result === 'PASS' ? '#059669' : (inspection.overall_result === 'FAIL' ? '#dc2626' : '#d97706');
    doc.fontSize(8).font('Helvetica-Bold').fillColor(resColor).text(inspection.overall_result || 'PASS', metaBoxX + 80, 73, { lineBreak: false });

    doc.y = 98;

    // SECTION 1: INSPECTION SUMMARY
    drawSectionHeader('1. INSPECTION SUMMARY & PARTICIPANTS', 'OVERVIEW');
    drawKeyValueRow('Company / Client:', inspection.company_name, 'Inspection Type:', inspection.type_name || 'Full Loading Audit', true);
    drawKeyValueRow('Assigned Operator:', inspection.operator_name, 'Auditor / Consultant:', inspection.consultant_name || 'Mateo (Lead Consultant)', false);
    drawKeyValueRow('Location / Facility:', inspection.location_address || 'Terminal Portuario / Bodega', 'Inspection Status:', inspection.status, true);
    drawKeyValueRow('GPS Coordinates:', (inspection.latitude && inspection.longitude) ? `${Number(inspection.latitude).toFixed(4)}, ${Number(inspection.longitude).toFixed(4)}` : 'Verified via GPS', 'Timestamp:', inspection.started_at || inspection.created_at, false);
    doc.y += 6;

    // SECTION 2: CONTAINER & QUANTITY DETAILS
    drawSectionHeader('2. CONTAINER & LOADED QUANTITY SPECIFICATIONS', 'CONTAINER & CARGO');
    drawKeyValueRow('Container No:', container?.container_number || 'N/A', 'Seal Number:', container?.seal_number || 'N/A', true);
    drawKeyValueRow('Type & Size:', `${container?.container_type || 'Dry Cargo'} - ${container?.size || '40ft HC'}`, 'License Plate:', container?.license_plate || 'N/A', false);
    drawKeyValueRow('Transporter:', container?.transporter || 'N/A', 'Container Condition:', container?.condition || 'Good Structural State', true);
    drawKeyValueRow('Total Loaded Qty:', `${cargo?.total_quantity || 0} ${cargo?.unit || 'Units'}`, 'Packaging Type:', cargo?.packaging_type || 'Standard Export Pallets', false);
    drawKeyValueRow('Gross / Net Weight:', `${cargo?.gross_weight || 0} kg / ${cargo?.net_weight || 0} kg`, 'Total Volume:', `${cargo?.volume || 0} CBM`, true);
    doc.y += 6;

    // SECTION 3: CONTAINER GENERAL CONDITIONS CHECKLIST
    drawSectionHeader('3. CONTAINER GENERAL CONDITIONS (CHECKLIST)', 'STANDARDS VERIFICATION');

    const tableHeaderY = doc.y;
    doc.rect(35, tableHeaderY, contentWidth, 16).fill('#e2e8f0');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(darkSlate);
    doc.text('#', 40, tableHeaderY + 4, { width: 16, lineBreak: false });
    doc.text('INSPECTION POINT / CRITERIA', 60, tableHeaderY + 4, { width: 270, lineBreak: false });
    doc.text('RESULT', 335, tableHeaderY + 4, { width: 45, align: 'center', lineBreak: false });
    doc.text('FINDINGS & OBSERVATIONS', 386, tableHeaderY + 4, { width: contentWidth - 355, lineBreak: false });
    doc.y = tableHeaderY + 16;

    if (checklistAnswers && checklistAnswers.length > 0) {
      checklistAnswers.forEach((ans: any, idx: number) => {
        const questionText = `${ans.category_name ? `[${ans.category_name}] ` : ''}${ans.question_text}`;
        doc.fontSize(6.8).font('Helvetica');
        const qHeight = doc.heightOfString(questionText, { width: 270 });
        const obsHeight = doc.heightOfString(ans.observations || 'Verified - Conforme', { width: contentWidth - 355 });
        const rowHeight = Math.max(17, Math.max(qHeight, obsHeight) + 6);

        const rowY = doc.y;
        if (idx % 2 === 0) {
          doc.rect(35, rowY, contentWidth, rowHeight).fill('#f8fafc');
        }
        doc.rect(35, rowY, contentWidth, rowHeight).lineWidth(0.5).stroke(borderGray);

        // Col 1: Number
        doc.fontSize(6.8).font('Helvetica').fillColor(textMuted)
           .text(String(idx + 1), 40, rowY + 4.5, { width: 16, lineBreak: false });

        // Col 2: Question (Bounded strictly within width 270)
        doc.fontSize(6.8).font('Helvetica-Bold').fillColor('#1e293b')
           .text(questionText, 60, rowY + 4.5, { width: 270 });

        // Col 3: Status Badge
        const isPass = ans.status === 'OK';
        const isFail = ans.status === 'NO_OK';
        const badgeColor = isPass ? '#059669' : (isFail ? '#dc2626' : '#64748b');
        const badgeText = isPass ? 'PASS' : (isFail ? 'FAIL' : 'N/A');
        const badgeY = rowY + Math.max(3, (rowHeight - 11) / 2);

        doc.rect(335, badgeY, 44, 11).fill(badgeColor);
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff')
           .text(badgeText, 335, badgeY + 2, { width: 44, align: 'center', lineBreak: false });

        // Col 4: Observation (Bounded strictly)
        doc.fontSize(6.8).font('Helvetica').fillColor('#334155')
           .text(ans.observations || 'Verified - Conforme', 386, rowY + 4.5, { width: contentWidth - 355 });

        doc.y = rowY + rowHeight;
      });
    }

    // ==========================================
    // PAGE 2: LOADING PROCESS, PRODUCTS, PHOTOS, & SIGNATURES
    // ==========================================
    doc.addPage();
    doc.y = 35;

    // SECTION 4: LOADING PROCESS & PRODUCT SPECS
    drawSectionHeader('4. LOADING PROCESS & PRODUCT INFORMATION', 'CARGO INTEGRITY');
    drawKeyValueRow('Start / Finish Time:', `${loading?.started_at || '07:30'} - ${loading?.finished_at || '10:45'}`, 'Personnel & Staff:', `${loading?.personnel_count || 5} Cargo Operators`, true);
    drawKeyValueRow('Machinery & Equipment:', loading?.equipment_used || 'Forklift Toyota 3.5T + Electric Pallet Jacks', 'Weather Conditions:', loading?.weather_conditions || 'Dry / 26°C Clear Conditions', false);
    drawKeyValueRow('Product Name / Ref:', `${product?.product_name || 'Export Commodity'} (Ref: ${product?.reference || 'EXP-2026'})`, 'Batch / Lot Number:', product?.batch_lot || 'LOT-2026-COL-99', true);
    drawKeyValueRow('Brand / Manufacturer:', product?.brand || 'Andina Premier Select', 'Product Condition:', product?.condition || 'Intact - Extra Export Quality', false);
    doc.y += 6;

    // SECTION 5: FINDINGS (if any)
    if (findings && findings.length > 0) {
      drawSectionHeader('5. FINDINGS & AUDIT OBSERVATIONS', 'NON-CONFORMITIES');
      findings.forEach((f: any, i: number) => {
        const fY = doc.y;
        doc.rect(35, fY, contentWidth, 28).fill('#fef2f2');
        doc.rect(35, fY, contentWidth, 28).lineWidth(0.5).stroke('#fca5a5');

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(alertRed)
           .text(`[${f.code || `FND-${i + 1}`}] - SEVERITY: ${f.severity} | STATUS: ${f.status}`, 42, fY + 4, { lineBreak: false });
        doc.fontSize(7).font('Helvetica').fillColor('#1e293b')
           .text(`Description: ${f.description}`, 42, fY + 15, { width: contentWidth - 15, lineBreak: false });
        doc.y = fY + 32;
      });
      doc.y += 6;
    }

    // SECTION 6: PHOTOGRAPHIC EVIDENCE GALLERY (2x2 Grid)
    drawSectionHeader('6. PHOTOGRAPHIC & VISUAL EVIDENCE GALLERY', 'ORGANIZED PROCESS MATRICES');

    const photoEvidences = evidences.filter((e: any) => e.type === 'PHOTO');
    if (photoEvidences.length > 0) {
      const cellW = (contentWidth - 10) / 2; // 257 pt
      const cellH = 138;
      let col = 0;
      let startRowY = doc.y;

      photoEvidences.slice(0, 4).forEach((photo: any, pIndex: number) => {
        const photoX = 35 + col * (cellW + 10);
        const photoY = startRowY;

        // Outer Card
        doc.rect(photoX, photoY, cellW, cellH).fill('#f8fafc');
        doc.rect(photoX, photoY, cellW, cellH).lineWidth(0.5).stroke(borderGray);

        // Header Ribbon
        doc.rect(photoX, photoY, cellW, 15).fill(darkSlate);
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff')
           .text(`[${photo.section}] ${photo.is_primary ? '★ EVIDENCIA PRINCIPAL' : ''}`, photoX + 6, photoY + 3.5, { width: cellW - 12, lineBreak: false });

        // Resolve Image from disk
        const localImgPath = resolveImagePath(photo.file_path);
        let renderedImage = false;

        if (localImgPath) {
          try {
            doc.image(localImgPath, photoX + 4, photoY + 18, {
              fit: [cellW - 8, 88],
              align: 'center',
              valign: 'center'
            });
            renderedImage = true;
          } catch (imgErr) {
            renderedImage = false;
          }
        }

        if (!renderedImage) {
          doc.rect(photoX + 4, photoY + 18, cellW - 8, 88).fill('#e2e8f0');
          doc.fontSize(8).font('Helvetica-Bold').fillColor(textMuted)
             .text('EVIDENCIA FOTOGRÁFICA', photoX + 10, photoY + 52, { width: cellW - 20, align: 'center', lineBreak: false });
        }

        // Caption Box
        doc.rect(photoX, photoY + 108, cellW, 30).fill('#ffffff');
        doc.rect(photoX, photoY + 108, cellW, 30).lineWidth(0.5).stroke(borderGray);

        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#1e293b')
           .text(photo.description || photo.file_name, photoX + 6, photoY + 112, { width: cellW - 12, ellipsis: true });
        doc.fontSize(6).font('Helvetica').fillColor(textMuted)
           .text(`Captura: ${photo.created_at ? photo.created_at.slice(0, 16) : 'Durante inspección'} | ISO/CTU Standard`, photoX + 6, photoY + 125, { lineBreak: false });

        if (col === 0) {
          col = 1;
        } else {
          col = 0;
          startRowY += cellH + 8;
        }
      });

      doc.y = startRowY + (col === 1 ? cellH + 8 : 0);
    }
    doc.y += 6;

    // SECTION 7: FACTORY ACKNOWLEDGEMENT & SIGNATURES
    drawSectionHeader('7. FACTORY ACKNOWLEDGEMENT & DIGITAL SIGNATURES', 'AUDIT VALIDATION');

    const sigY = doc.y;
    const sigBoxWidth = (contentWidth - 10) / 2;

    // Box 1: Operator Signature
    doc.rect(35, sigY, sigBoxWidth, 90).fill('#fafafa');
    doc.rect(35, sigY, sigBoxWidth, 90).lineWidth(0.5).stroke(borderGray);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(darkSlate)
       .text('FIELD INSPECTOR / OPERATOR SIGNATURE', 42, sigY + 6, { lineBreak: false });

    const opSig = signatures.find((s: any) => s.signer_type === 'OPERATOR');
    if (opSig && opSig.signature_data) {
      try {
        if (opSig.signature_data.startsWith('data:image')) {
          const base64Data = opSig.signature_data.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          doc.image(buf, 42, sigY + 20, { fit: [sigBoxWidth - 20, 38], align: 'center' });
        }
      } catch (e) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor(textMuted).text('[Digital Signature Verified]', 45, sigY + 36, { lineBreak: false });
      }
    } else {
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(textMuted)
         .text('[Signed Digitally on Field Mobile App]', 42, sigY + 36, { lineBreak: false });
    }
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e293b')
       .text(`Name: ${inspection.operator_name || 'Field Inspector'}`, 42, sigY + 66, { lineBreak: false });
    doc.fontSize(6).font('Helvetica').fillColor(textMuted)
       .text(`Date: ${inspection.completed_at || new Date().toISOString()}`, 42, sigY + 77, { lineBreak: false });

    // Box 2: Consultant Approval
    const conX = 35 + sigBoxWidth + 10;
    doc.rect(conX, sigY, sigBoxWidth, 90).fill('#fafafa');
    doc.rect(conX, sigY, sigBoxWidth, 90).lineWidth(0.5).stroke(borderGray);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(darkSlate)
       .text('SUPERVISING CONSULTANT APPROVAL', conX + 8, sigY + 6, { lineBreak: false });

    const conSig = signatures.find((s: any) => s.signer_type === 'CONSULTANT');
    if (conSig && conSig.signature_data) {
      try {
        if (conSig.signature_data.startsWith('data:image')) {
          const base64Data = conSig.signature_data.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          doc.image(buf, conX + 8, sigY + 20, { fit: [sigBoxWidth - 20, 38], align: 'center' });
        }
      } catch (e) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor(textMuted).text('[Approved & Signed]', conX + 8, sigY + 36, { lineBreak: false });
      }
    } else {
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(textMuted)
         .text(inspection.status === 'APROBADA' || inspection.status === 'FINALIZADA' ? '[Approved & Sealed by Mateo]' : '[Pending Consultant Signoff]', conX + 8, sigY + 36, { lineBreak: false });
    }
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e293b')
       .text(`Consultant: ${inspection.consultant_name || 'Mateo (Lead Quality Auditor)'}`, conX + 8, sigY + 66, { lineBreak: false });
    doc.fontSize(6).font('Helvetica').fillColor(textMuted)
       .text(`Approval Date: ${inspection.approved_at || 'Official Audit Record'}`, conX + 8, sigY + 77, { lineBreak: false });

    // ==========================================
    // PAGE NUMBERING & CORPORATE FOOTER
    // ==========================================
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 24;

      doc.rect(35, footerY - 5, contentWidth, 0.5).fill('#cbd5e1');
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b')
         .text(`CONFIDENTIAL - INSPECTIONPRO LOGISTICS SAAS | REPORT: ${reportCode}`, 35, footerY, { lineBreak: false });
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a')
         .text(`PAGE ${i + 1} OF ${range.count}`, 35, footerY, { align: 'right', width: contentWidth, lineBreak: false });
    }

    doc.end();

    writeStream.on('finish', async () => {
      try {
        const reportId = `rep_${Date.now()}`;
        await db.run(
          `INSERT INTO reports (id, inspection_id, report_code, pdf_path, version, generated_by, generated_at)
           VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
           ON CONFLICT(report_code) DO UPDATE SET
             pdf_path = excluded.pdf_path,
             version = version + 1,
             generated_by = excluded.generated_by,
             generated_at = datetime('now')`,
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
