// FIXED: PDF formatting per spec — green header, alternating rows, correct footer
import * as XLSX from 'xlsx';

export function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number | null)[][],
  filename: string
) {
  // FIXED: replaced any with unknown for third-party dynamic import interop
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.jsPDF ?? (jsPDFModule as unknown as { default: typeof jsPDFModule.jsPDF }).default;

  const autoTableModule = await import('jspdf-autotable');
  type AutoTableFn = (doc: unknown, opts: unknown) => void;
  const autoTable: AutoTableFn = ((autoTableModule as { default?: AutoTableFn }).default ?? autoTableModule) as AutoTableFn;

  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // FIXED: header — logo placeholder left, title centre, date right
  doc.setFillColor(27, 67, 50);  // #1B4332 green
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EcoVijay Growth', 14, 10);

  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - 14, 10, { align: 'right' });

  // FIXED: green accent bar below header
  doc.setFillColor(27, 67, 50);
  doc.rect(0, 18, pageWidth, 1, 'F');

  // FIXED: table with #1B4332 header fill and alternating #F8FAF9 rows
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 22,
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [17, 24, 39] },
    headStyles: {
      fillColor: [27, 67, 50],   // FIXED: #1B4332 green fill
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 249] },  // FIXED: #F8FAF9
    margin: { left: 14, right: 14, top: 22 },
    didDrawPage: (data: { pageNumber: number }) => {
      // FIXED: footer — company info + page number
      const pageNum = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'eprcertificate.online  |  EcoVijay Growth  |  Navi Mumbai',
        14,
        pageHeight - 7
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageNum}`,
        pageWidth - 14,
        pageHeight - 7,
        { align: 'right' }
      );
    },
  });

  doc.save(`${filename}.pdf`);
}
