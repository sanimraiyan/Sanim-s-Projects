import React from 'react';
import ReactMarkdown from 'react-markdown';
import { PaperData } from '../types';
import { Download, Share2, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PaperRendererProps {
  paper: PaperData;
}

export const PaperRenderer: React.FC<PaperRendererProps> = ({ paper }) => {
  const paperRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleDownloadPDF = async () => {
    if (!paperRef.current) return;
    setIsExporting(true);

    try {
      const element = paperRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true, // Allow handling of cross-origin images if any
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${paper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Could not generate PDF directly. Opening print dialog instead.");
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8">
      {/* Toolbar */}
      <div className="flex justify-end gap-4 mb-8 no-print">
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
        >
          {isExporting ? <span className="animate-pulse">Generating PDF...</span> : (
            <>
              <Download size={18} />
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Paper Container */}
      <div 
        ref={paperRef} 
        className="bg-white shadow-xl sm:rounded-none sm:shadow-none print:shadow-none min-h-screen text-slate-900"
        style={{ padding: '40px' }} // Explicit padding for html2canvas
      >
        {/* Title Page */}
        <header className="border-b-4 border-slate-900 pb-8 mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight text-slate-900">
            {paper.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-slate-500 font-medium uppercase tracking-widest text-sm">
            <span className="flex items-center gap-2">
              <Calendar size={14} />
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span>•</span>
            <span>ScholarSanim AI Research</span>
          </div>
        </header>

        {/* Abstract */}
        <section className="mb-12 px-0 sm:px-12">
          <div className="bg-slate-50 p-8 border-l-4 border-indigo-500 italic text-slate-700 leading-relaxed font-serif">
            <h3 className="text-indigo-900 font-bold uppercase text-xs tracking-widest not-italic mb-3">Abstract</h3>
            {paper.abstract}
          </div>
        </section>

        {/* Sections */}
        <div className="space-y-12">
          {paper.sections.map((section, index) => (
            <article key={section.id} className="prose prose-slate max-w-none font-serif">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-baseline gap-3 border-b border-slate-200 pb-2">
                <span className="text-indigo-500 text-lg font-sans font-black">0{index + 1}</span>
                {section.title}
              </h2>

              {section.imageUrl && (
                <figure className="my-8 relative group overflow-hidden rounded-xl shadow-lg float-right ml-6 mb-6 w-full sm:w-1/2">
                  <img 
                    src={section.imageUrl} 
                    alt={`Visualization for ${section.title}`} 
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                  />
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white text-xs italic opacity-0 group-hover:opacity-100 transition-opacity">
                    Generated Visualization
                  </figcaption>
                </figure>
              )}

              <div className="text-justify leading-loose text-slate-800">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
              <div className="clear-both"></div>
            </article>
          ))}
        </div>

        {/* References / Footnotes */}
        {paper.references.length > 0 && (
          <footer className="mt-16 pt-8 border-t border-slate-200">
            <h3 className="text-xl font-bold mb-6 font-serif">References & Sources</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
              {paper.references.map((ref, idx) => (
                <li key={idx} className="flex gap-3 items-start break-all">
                  <span className="text-indigo-500 font-mono text-xs pt-1">[{idx + 1}]</span>
                  <a href={ref.uri} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 hover:underline transition-colors">
                    {ref.title || ref.uri}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        )}
      </div>
    </div>
  );
};