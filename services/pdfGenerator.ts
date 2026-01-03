
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

/**
 * Captures a DOM element and returns it as a PDF Blob.
 * Generates a SINGLE CONTINUOUS PAGE to prevent row splitting.
 */
export const createPDFBlob = async (elementId: string): Promise<Blob | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return null;
  }

  try {
    // Wait a brief moment to ensure styles are applied and fonts loaded
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, { 
      scale: 2, // Good quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Capture full scroll dimensions
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions
    // Fixed width A4 (210mm), Height scales to match content aspect ratio
    const pdfWidth = 210;
    const imgProps = canvas.width > 0 ? (canvas.height * pdfWidth) / canvas.width : 297;
    const pdfHeight = imgProps > 0 ? imgProps : 297;
    
    // Create PDF with custom dimensions (Single Long Page)
    // 'p' = portrait, 'mm' = millimeters, [width, height] = custom size
    const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    return pdf.output('blob');
  } catch (error) {
    console.error("Error creating PDF blob:", error);
    return null;
  }
};

/**
 * Downloads a single PDF file immediately.
 */
export const downloadSinglePDF = async (elementId: string, filename: string) => {
  const blob = await createPDFBlob(elementId);
  if (!blob) {
      alert("Failed to generate PDF. Please try again.");
      return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Bundles multiple named blobs into a ZIP and downloads it.
 */
export const saveZip = async (files: { name: string; blob: Blob }[], zipFilename: string) => {
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.name, file.blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${zipFilename}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
