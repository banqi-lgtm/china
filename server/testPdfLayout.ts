import { generateInspectionPDF } from './src/services/pdfGenerator.service';
import fs from 'fs';

async function test() {
  const res = await generateInspectionPDF('insp-full-showcase-001');
  console.log('Result:', res);
  const buf = fs.readFileSync(res.pdfFullPath);
  const str = buf.toString('latin1');
  const pages = str.match(/\/Type\s*\/Page\b/g);
  console.log('Page Count:', pages ? pages.length : 0);
}

test();
