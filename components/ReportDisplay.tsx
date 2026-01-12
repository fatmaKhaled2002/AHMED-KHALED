
import React, { useState } from 'react';
import { ReportData, ProcessedDocument } from '../types';
import { jsPDF } from 'jspdf';
import { FileText, Activity, ClipboardList, ShieldAlert, Download, FileCode, Loader2 } from 'lucide-react';

interface ReportDisplayProps {
  report: ReportData;
  documents: ProcessedDocument[];
  patientName?: string;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
};

/**
 * Helper to downscale image before adding to PDF to keep final PDF file size small.
 */
const downscaleImageForExport = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_EXPORT_W = 600; // Lower resolution for exported PDF images
                let width = img.width;
                let height = img.height;
                if (width > MAX_EXPORT_W) {
                    height *= MAX_EXPORT_W / width;
                    width = MAX_EXPORT_W;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.4)); // High compression for PDF small size
            };
        };
        reader.onerror = reject;
    });
};

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, documents, patientName }) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  // Sorting documents chronologically
  const sortedDocs = [...documents].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pdfWidth - (margin * 2);
        let currentY = 20;

        const checkNewPage = (neededHeight: number) => {
            if (currentY + neededHeight > pdfHeight - margin) {
                pdf.addPage();
                currentY = 20;
                return true;
            }
            return false;
        };

        // Header Section
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 0, pdfWidth, 40, 'F');
        pdf.setFontSize(22);
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Clinical Case Portfolio", margin, 18);
        
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Patient: ${patientName || 'Anonymous'}`, margin, 26);
        pdf.text(`Date Generated: ${new Date().toLocaleDateString()}`, margin, 31);
        
        currentY = 50;

        // Content Rendering Logic
        const renderSection = (title: string, content: string) => {
            checkNewPage(20);
            pdf.setFontSize(13);
            pdf.setTextColor(2, 132, 199);
            pdf.setFont('helvetica', 'bold');
            pdf.text(title, margin, currentY);
            currentY += 8;
            
            pdf.setFontSize(10);
            pdf.setTextColor(51, 65, 85);
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(content, contentWidth);
            
            lines.forEach((line: string) => {
                checkNewPage(7);
                pdf.text(line, margin, currentY);
                currentY += 6;
            });
            currentY += 10;
        };

        renderSection("I. NARRATIVE HISTORY", report.history);
        renderSection("II. INTEGRATED SYNTHESIS", report.summary);
        renderSection("III. CLINICAL OBSERVATIONS", report.prognosis);

        // Record Index Table
        checkNewPage(40);
        pdf.setFontSize(13);
        pdf.setTextColor(2, 132, 199);
        pdf.setFont('helvetica', 'bold');
        pdf.text("IV. MASTER DOCUMENT INDEX", margin, currentY);
        currentY += 10;

        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text("REF", margin, currentY);
        pdf.text("DATE", margin + 12, currentY);
        pdf.text("TYPE", margin + 35, currentY);
        pdf.text("KEY FINDING SUMMARY", margin + 65, currentY);
        currentY += 3;
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, currentY, pdfWidth - margin, currentY);
        currentY += 8;

        sortedDocs.forEach((doc, idx) => {
            const dateStr = doc.date ? new Date(doc.date).toLocaleDateString() : 'N/A';
            const splitSummary = pdf.splitTextToSize(doc.summary, contentWidth - 65);
            const rowHeight = Math.max(8, (splitSummary.length * 4) + 4);

            checkNewPage(rowHeight);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(51, 65, 85);
            pdf.text(`${idx + 1}`, margin, currentY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(dateStr, margin + 12, currentY);
            pdf.setTextColor(2, 132, 199);
            pdf.text(doc.type, margin + 35, currentY);
            pdf.setTextColor(71, 85, 105);
            pdf.text(splitSummary, margin + 65, currentY);
            
            currentY += rowHeight;
        });

        // APPENDIX (Images)
        // Optimization: Use aggressive compression to keep final PDF size minimal
        for (let i = 0; i < sortedDocs.length; i++) {
            const doc = sortedDocs[i];
            pdf.addPage();
            
            pdf.setFillColor(248, 250, 252);
            pdf.rect(0, 0, pdfWidth, 30, 'F');
            pdf.setFontSize(12);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`APPENDIX RECORD #${i + 1}: ${doc.type}`, margin, 12);
            
            pdf.setFontSize(8);
            pdf.setTextColor(100);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Date: ${doc.date || 'Unknown'} | File: ${doc.file.name}`, margin, 18);
            
            pdf.setTextColor(2, 132, 199);
            const summaryText = pdf.splitTextToSize(`Summary: ${doc.summary}`, contentWidth);
            pdf.text(summaryText, margin, 24);

            if (doc.file.type.startsWith('image/')) {
                try {
                    // Using downscaled version specifically for export to reduce file size
                    const base64 = await downscaleImageForExport(doc.file);
                    const imgProps = pdf.getImageProperties(base64);
                    
                    const imgTop = 35;
                    const imgBottom = 15;
                    const availH = pdfHeight - imgTop - imgBottom;
                    const availW = pdfWidth - (margin * 2);

                    const ratio = Math.min(availW / imgProps.width, availH / imgProps.height);
                    const w = imgProps.width * ratio;
                    const h = imgProps.height * ratio;
                    const x = (pdfWidth - w) / 2;

                    // FAST compression is actually quite good for minimizing final PDF size
                    pdf.addImage(base64, 'JPEG', x, imgTop, w, h, undefined, 'FAST');
                } catch (e) {
                    console.error("Failed to include image in PDF:", doc.file.name);
                    pdf.text("[Image processing failed for this record]", margin, 45);
                }
            } else {
                pdf.setFontSize(10);
                pdf.setTextColor(148, 163, 184);
                pdf.text("NON-IMAGE CONTENT - PROCESSED DIGITALLY", pdfWidth/2, pdfHeight/2, { align: 'center' });
            }
        }

        pdf.save(`MediChronicle_Organized_${patientName?.replace(/\s+/g, '_') || 'Report'}.pdf`);
    } catch (err) {
        console.error("PDF Export Error:", err);
        alert("There was an error generating your PDF. The process was aborted to prevent browser crash.");
    } finally {
        setIsExportingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    if (isExportingWord) return;
    setIsExportingWord(true);
    try {
        let docHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Organized Medical Report</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40pt; color: #334155; }
                h1 { color: #0284c7; border-bottom: 2pt solid #0284c7; padding-bottom: 10pt; font-size: 24pt; }
                h2 { color: #0284c7; margin-top: 30pt; font-size: 16pt; border-bottom: 1pt solid #e2e8f0; padding-bottom: 5pt; }
                .meta { color: #64748b; font-size: 10pt; margin-bottom: 20pt; }
                .section-content { font-size: 11pt; line-height: 1.6; margin-bottom: 20pt; }
                table { width: 100%; border-collapse: collapse; margin-top: 20pt; }
                th { background-color: #f8fafc; border: 1pt solid #e2e8f0; padding: 8pt; text-align: left; font-size: 10pt; }
                td { border: 1pt solid #e2e8f0; padding: 8pt; font-size: 9pt; vertical-align: top; }
                .appendix-item { margin-top: 40pt; page-break-before: always; border: 1pt solid #e2e8f0; padding: 15pt; border-radius: 8pt; }
                img { display: block; margin: 20pt auto; max-width: 100%; height: auto; border: 1pt solid #ddd; }
            </style>
            </head><body>
            <h1>Clinical Case Portfolio</h1>
            <div class="meta">
                <strong>Patient:</strong> ${patientName || 'Anonymous'}<br>
                <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
            </div>
            
            <h2>I. NARRATIVE HISTORY</h2>
            <div class="section-content">${report.history.replace(/\n/g, '<br>')}</div>

            <h2>II. INTEGRATED SYNTHESIS</h2>
            <div class="section-content">${report.summary.replace(/\n/g, '<br>')}</div>

            <h2>III. CLINICAL OBSERVATIONS</h2>
            <div class="section-content">${report.prognosis.replace(/\n/g, '<br>')}</div>

            <h2>IV. MASTER DOCUMENT INDEX</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ref</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Summary</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sortedDocs.forEach((doc, idx) => {
            docHtml += `
                <tr>
                    <td><b>${idx + 1}</b></td>
                    <td>${doc.date || 'N/A'}</td>
                    <td>${doc.type}</td>
                    <td>${doc.summary}</td>
                </tr>
            `;
        });

        docHtml += `</tbody></table>`;
        docHtml += `<h2 style="page-break-before: always;">V. VISUAL APPENDIX</h2>`;

        for (let i = 0; i < sortedDocs.length; i++) {
            const doc = sortedDocs[i];
            docHtml += `
                <div class="appendix-item">
                    <h3 style="color: #1e293b; margin: 0;">Record #${i+1}: ${doc.type}</h3>
                    <p style="color: #64748b; font-size: 8pt;">File: ${doc.file.name}</p>
                    <p style="color: #0284c7; font-size: 10pt; font-style: italic;">${doc.summary}</p>
            `;

            if (doc.file.type.startsWith('image/')) {
                try {
                    // Downscaling for Word export too to keep .doc file size manageable
                    const base64 = await downscaleImageForExport(doc.file);
                    docHtml += `<img src="${base64}" />`;
                } catch (e) {
                    docHtml += `<p>[Image skipped due to processing error]</p>`;
                }
            } else {
                docHtml += `<div style="padding: 20pt; text-align: center; color: #cbd5e1;">[Non-Image Content]</div>`;
            }
            docHtml += `</div>`;
        }

        docHtml += `</body></html>`;
        
        const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `MediChronicle_Portfolio_${patientName?.replace(/\s+/g, '_') || 'Report'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Word Export Error:", err);
        alert("Word export failed. Please check your browser permissions.");
    } finally {
        setIsExportingWord(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
        <div className="flex justify-end gap-3 flex-wrap no-print">
            <button 
                onClick={handleDownloadWord}
                disabled={isExportingWord || isExportingPdf}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-sm font-bold disabled:opacity-50"
            >
                {isExportingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                {isExportingWord ? 'Exporting Word...' : 'Word Portfolio'}
            </button>
            <button 
                onClick={handleDownloadPdf}
                disabled={isExportingPdf || isExportingWord}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-sm font-bold disabled:opacity-50"
            >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExportingPdf ? 'Generating PDF...' : 'Organized PDF'}
            </button>
        </div>

        <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-4xl mx-auto text-slate-800 ring-1 ring-slate-200">
            <div className="border-b-4 border-slate-50 pb-8 mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">Case Overview</h1>
                    <p className="text-medical-600 font-bold text-lg uppercase tracking-wider">Patient: {patientName || 'Anonymous'}</p>
                    <p className="text-slate-400 text-xs mt-2 font-medium">MediChronicle AI Clinical Sorter</p>
                </div>
                <div className="text-right text-sm font-bold text-slate-400 space-y-1">
                    <p>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-medical-500 uppercase tracking-widest text-[10px] font-black">{documents.length} Records Processed</p>
                </div>
            </div>

            <div className="bg-rose-50 border-l-4 border-rose-500 p-6 mb-12 rounded-xl">
                <div className="flex items-start gap-4">
                    <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0" />
                    <div>
                        <h4 className="font-black text-rose-800 uppercase tracking-tight text-sm">Clinical Summary Notice</h4>
                        <p className="text-xs text-rose-700 mt-2 leading-relaxed font-medium">
                            This portfolio is an AI-generated organization of provided documentation. It is intended for tracking and clarity only. Not for diagnostic use.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-16">
                <section>
                    <div className="flex items-center gap-3 mb-6 text-medical-600">
                        <Activity className="w-7 h-7" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter">I. Narrative History</h2>
                    </div>
                    <div className="text-base leading-loose text-slate-700 font-medium whitespace-pre-line bg-slate-50/70 p-8 rounded-[1.5rem] border border-slate-100">
                        {report.history}
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-6 text-medical-600">
                        <FileText className="w-7 h-7" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter">II. Clinical Synthesis</h2>
                    </div>
                    <div className="p-8 rounded-[1.5rem] border-2 border-slate-50 text-base leading-loose text-slate-700 font-medium bg-white shadow-sm">
                        {report.summary}
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-6 text-medical-600">
                        <ClipboardList className="w-7 h-7" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter">III. Clinical Observations</h2>
                    </div>
                    <div className="p-8 rounded-[1.5rem] border border-slate-200 bg-slate-50/40 text-base leading-loose text-slate-600 font-medium italic">
                        {report.prognosis}
                    </div>
                </section>
            </div>
        </div>
    </div>
  );
};
