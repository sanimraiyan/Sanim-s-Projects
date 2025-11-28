import React, { useState } from 'react';
import { PaperData, GenerationStep, PaperSection } from './types';
import { generatePaperOutline, generateSectionContent, generateSectionImage } from './services/geminiService';
import { PaperRenderer } from './components/PaperRenderer';
import { ChatBot } from './components/ChatBot';
import { BookOpen, Sparkles, Loader2, ArrowRight, ArrowLeft, Search, FileText, Image as ImageIcon, Settings2, Check } from 'lucide-react';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [paperData, setPaperData] = useState<PaperData | null>(null);
  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    try {
      setStep(GenerationStep.OUTLINING);
      setLoadingMessage("Analyzing topic & creating outline...");
      setProgress(10);

      // 1. Generate Outline
      const outline = await generatePaperOutline(topic);
      setProgress(30);
      
      if (!outline.sections) throw new Error("No sections generated");

      setLoadingMessage("Researching & writing content...");
      setStep(GenerationStep.RESEARCHING);

      const filledSections: PaperSection[] = [];
      const references = [...(outline.references || [])];

      // 2. Generate Content for each section
      // We process sequentially to avoid rate limits and better UX progress updates
      for (let i = 0; i < outline.sections.length; i++) {
        const section = outline.sections[i];
        setLoadingMessage(`Researching section ${i + 1}/${outline.sections.length}: ${section.title}...`);
        
        const result = await generateSectionContent(
          outline.title || topic, 
          section.title, 
          outline.abstract || ""
        );

        filledSections.push({
          ...section,
          content: result.content
        });
        
        if (result.references) {
          references.push(...result.references);
        }

        setProgress(30 + ((i + 1) / outline.sections.length) * 40); // Scale up to 70%
      }

      setLoadingMessage("Generating scientific visualizations...");
      setStep(GenerationStep.VISUALIZING);

      // 3. Generate Images
      // We'll generate images for roughly 50-70% of sections to not clutter the paper too much, or all if specified.
      for (let i = 0; i < filledSections.length; i++) {
        const section = filledSections[i];
        if (section.imagePrompt) {
            setLoadingMessage(`Creating visual for: ${section.title}...`);
            // Flash Image model does not take size or style args
            const imageUrl = await generateSectionImage(section.imagePrompt);
            filledSections[i].imageUrl = imageUrl;
        }
        setProgress(70 + ((i + 1) / filledSections.length) * 30); // Scale up to 100%
      }

      // Deduplicate refs
      const uniqueRefs = references.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);

      setPaperData({
        title: outline.title || topic,
        abstract: outline.abstract || "No abstract generated.",
        sections: filledSections,
        references: uniqueRefs,
        generatedAt: new Date().toISOString()
      });

      setStep(GenerationStep.COMPLETED);
    } catch (error) {
      console.error(error);
      setStep(GenerationStep.ERROR);
      setLoadingMessage("Something went wrong. Please try a different topic.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navigation/Header */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <BookOpen size={24} strokeWidth={2.5} />
            <span className="text-xl font-bold tracking-tight text-slate-900">ScholarSanim AI</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="hidden sm:block">Powered by Gemini 2.5 Flash & 3.0 Pro</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        
        {step === GenerationStep.IDLE && (
          <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
                Research Papers, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  Reimagined.
                </span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto">
                Generate professional, fully structured academic papers with real-time Google Search citations and AI-generated visualizations in seconds.
              </p>
            </div>

            {/* Input Section */}
            <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-2 transform transition-all hover:shadow-2xl hover:border-indigo-200">
              <div className="flex items-center gap-2">
                <div className="pl-4 text-slate-400">
                  <Search size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="What do you want to research? (e.g., Quantum Computing in 2030)" 
                  className="flex-1 py-4 bg-transparent focus:outline-none text-lg text-slate-800 placeholder:text-slate-400"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button 
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left">
              {[
                { icon: Search, title: "Search Grounded", desc: "Real-time data from Google Search" },
                { icon: FileText, title: "Structured Layout", desc: "Academic standard formatting" },
                { icon: ImageIcon, title: "AI Visuals", desc: "Context-aware illustrations" },
              ].map((feature, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <feature.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(step !== GenerationStep.IDLE && step !== GenerationStep.COMPLETED) && (
          <div className="max-w-xl mx-auto text-center mt-20 space-y-6">
            <div className="relative w-24 h-24 mx-auto">
               <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
               <div 
                 className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
               ></div>
               <div className="absolute inset-0 flex items-center justify-center text-indigo-600 font-bold">
                 {Math.round(progress)}%
               </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Generating Research Paper</h2>
              <p className="text-slate-500 animate-pulse">{loadingMessage}</p>
            </div>

            <div className="flex justify-center gap-2 mt-8">
              <span className={`h-2 w-2 rounded-full transition-colors ${step === GenerationStep.OUTLINING ? 'bg-indigo-600 scale-125' : 'bg-slate-300'}`} />
              <span className={`h-2 w-2 rounded-full transition-colors ${step === GenerationStep.RESEARCHING ? 'bg-indigo-600 scale-125' : 'bg-slate-300'}`} />
              <span className={`h-2 w-2 rounded-full transition-colors ${step === GenerationStep.VISUALIZING ? 'bg-indigo-600 scale-125' : 'bg-slate-300'}`} />
            </div>
            
            {step === GenerationStep.ERROR && (
               <div className="p-4 bg-red-50 text-red-600 rounded-lg mt-4">
                 An error occurred. Please try refreshing and using a different topic.
               </div>
            )}
          </div>
        )}

        {step === GenerationStep.COMPLETED && paperData && (
          <div className="animate-in fade-in duration-700">
            <div className="mb-8 flex items-center justify-between no-print sticky top-20 z-30 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm">
               <button 
                  onClick={() => setStep(GenerationStep.IDLE)} 
                  className="group flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-indigo-600 font-medium transition-colors"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Prompt</span>
               </button>
               
               <button 
                  onClick={() => setStep(GenerationStep.IDLE)} 
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-100"
                >
                  <Sparkles size={16} />
                  <span>New Research</span>
               </button>
            </div>
            <PaperRenderer paper={paperData} />
          </div>
        )}
      </main>

      <ChatBot />
    </div>
  );
};

export default App;