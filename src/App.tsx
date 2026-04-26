import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  LayoutDashboard, 
  Trophy, 
  User, 
  ChevronRight, 
  History,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  CirclePlay,
  BrainCircuit,
  GraduationCap,
  Timer,
  AlertCircle,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Image as ImageIcon,
  Headphones,
  Wand2,
  Mic,
  Palette,
  Loader2,
  Sparkles,
  Layout,
  Map as MapIcon,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { Subject, Lesson, Question } from './types';
import { MOCK_SUBJECTS, MOCK_LESSONS, MOCK_QUESTIONS } from './mockData';
import { GoogleGenAI, Modality } from "@google/genai";

// --- AI Service ---

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateContent = async (topic: string, level: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere um conteúdo de estudo detalhado em Markdown para o concurso público sobre o tema: ${topic}. 
      O nível de dificuldade deve ser compatível com: ${level}.
      Inclua introdução, pontos principais e uma conclusão resumida.`,
    });
    return response.text;
  } catch (err) {
    console.error("AI Error:", err);
    throw err;
  }
};

const generateMindMap = async (content: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Gere um mapa mental visual (brainstorming diagram) claro e didático sobre o seguinte conteúdo de estudo: ${content.substring(0, 500)}. Use um estilo limpo e profissional para estudantes.` },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (err) {
    console.error("Image AI Error:", err);
    throw err;
  }
};

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore (Feminina - Suave)', lang: 'pt-BR' },
  { id: 'Zephyr', name: 'Zephyr (Feminina - Clara)', lang: 'pt-BR' },
  { id: 'Puck', name: 'Puck (Masculina - Enérgica)', lang: 'pt-BR' },
  { id: 'Charon', name: 'Charon (Masculina - Profunda)', lang: 'pt-BR' },
  { id: 'Fenrir', name: 'Fenrir (Masculina - Firme)', lang: 'pt-BR' },
];

const CustomAudioPlayer = ({ src, className }: { src: string, className?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
      setProgress(newProgress);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm", className)}>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <button 
        onClick={togglePlay}
        className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shrink-0"
      >
        {isPlaying ? <X className="w-5 h-5" /> : <Mic className="w-5 h-5 ml-0.5" />}
      </button>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress || 0}
          onChange={handleProgressChange}
          className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary"
        />
      </div>
    </div>
  );
};

const generateAudio = async (text: string, voice: string = 'Kore') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Leia calmamente de forma profissional para um estudante: ${text.substring(0, 2000)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/wav';

    if (base64Audio) {
      return `data:${mimeType};base64,${base64Audio}`;
    }
    throw new Error("No audio generated");
  } catch (err) {
    console.error("Audio AI Error:", err);
    throw err;
  }
};

const uploadToR2 = async (data: string, filename: string, type: string) => {
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, filename, type })
    });
    const result = await response.json();
    if (result.success) return result.url;
    throw new Error(result.error);
  } catch (err) {
    console.error("R2 Upload Error:", err);
    throw err;
  }
};

// --- Components ---

const Navbar = ({ activeTab, setActiveTab, dbConnected }: { activeTab: string, setActiveTab: (t: string) => void, dbConnected: boolean | null }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
    { id: 'studies', icon: BookOpen, label: 'Trilhas' },
    { id: 'performance', icon: Trophy, label: 'Evolução' },
    { id: 'admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:justify-start md:gap-10 md:px-12 md:h-20 shadow-sm border-b">
      <div className="hidden md:flex items-center gap-2 mr-10">
        <h1 className="text-2xl font-bold tracking-tighter text-slate-800 italic uppercase">Gabarito<span className="text-primary italic">Max</span></h1>
        {dbConnected !== null && (
          <div className={cn(
            "w-2 h-2 rounded-full",
            dbConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          )} title={dbConnected ? "Banco Conectado" : "Banco Offline"} />
        )}
      </div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-4 py-2 rounded-2xl transition-all duration-300 relative",
            activeTab === tab.id ? "text-primary md:bg-primary/5" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          <tab.icon className={cn("w-6 h-6 md:w-5 md:h-5", activeTab === tab.id && "animate-pulse")} />
          <span className="text-[10px] uppercase font-bold tracking-widest md:text-sm md:normal-case md:tracking-normal">{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div 
              layoutId="nav-indicator"
              className="absolute -bottom-3 inset-x-4 h-1 bg-primary rounded-t-full hidden md:block" 
            />
          )}
        </button>
      ))}
      <div className="hidden md:flex flex-1 justify-end">
        <div className="flex items-center gap-3 bg-slate-50 p-1 pr-4 rounded-full border border-slate-200">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">RL</div>
            <div className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Rodrigo Lima</div>
        </div>
      </div>
    </nav>
  );
};

// --- Admin Panel ---

const AdminPanel = ({ 
  subjects, 
  lessons, 
  questions,
  onUpdateSubject, 
  onDeleteSubject,
  onAddSubject,
  onUpdateLesson,
  onDeleteLesson,
  onAddLesson,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddQuestion
}: { 
  subjects: Subject[], 
  lessons: Lesson[],
  questions: Question[],
  onUpdateSubject: (s: Subject) => Promise<void>,
  onDeleteSubject: (id: string) => Promise<void>,
  onAddSubject: (s: Partial<Subject>) => Promise<void>,
  onUpdateLesson: (l: Lesson) => Promise<void>,
  onDeleteLesson: (id: string) => Promise<void>,
  onAddLesson: (l: Partial<Lesson>) => Promise<void>,
  onUpdateQuestion: (q: Question) => Promise<void>,
  onDeleteQuestion: (id: string) => Promise<void>,
  onAddQuestion: (q: Partial<Question>) => Promise<void>
}) => {
  const [activeView, setActiveView] = useState<'subjects' | 'lessons' | 'questions'>('subjects');
  const [formData, setFormData] = useState<any>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [isGenerating, setIsGenerating] = useState({ content: false, audio: false, map: false });
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isSaving, setIsSaving] = useState(false);
  const [r2Status, setR2Status] = useState<{ success: boolean; config?: any; error?: string } | null>(null);
  const [isTestingR2, setIsTestingR2] = useState(false);

  useEffect(() => {
    const checkR2 = async () => {
      try {
        const res = await fetch('/api/r2-check');
        const data = await res.json();
        setR2Status(data);
      } catch (err) {
        setR2Status({ success: false, error: "Failed to connect to API" });
      }
    };
    checkR2();
  }, []);

  const handleTestUpload = async () => {
    setIsTestingR2(true);
    try {
      // Create a small red square image
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 10, 10);
      }
      const dataUrl = canvas.toDataURL('image/png');
      const url = await uploadToR2(dataUrl, `test_${Date.now()}.png`, 'image/png');
      alert(`Upload de teste bem-sucedido!\nURL: ${url}`);
    } catch (err) {
      alert(`Erro no upload: ${(err as Error).message}`);
    } finally {
      setIsTestingR2(false);
    }
  };

  const handleGenerateContentAI = async () => {
    const title = activeView === 'subjects' ? formData.name : formData.title;
    
    if (!title) {
      alert("Defina o título primeiro.");
      return;
    }

    if (activeView === 'lessons' && !formData.subjectId) {
      alert("Selecione a matéria pai primeiro.");
      return;
    }

    const subject = subjects.find(s => s.id === (formData.subjectId || formData.id));
    let selectedLevel = formData.level || subject?.level;
    
    if (!selectedLevel) {
      const levelPrompt = prompt("Selecione o nível de dificuldade (fundamental, medio, superior):", "medio");
      selectedLevel = (levelPrompt?.toLowerCase()) || 'medio';
    }

    setIsGenerating(prev => ({ ...prev, content: true }));
    try {
      const content = await generateContent(title, selectedLevel);
      setFormData(prev => ({ ...prev, content }));
    } catch (err) {
      alert("Erro ao gerar conteúdo.");
    } finally {
      setIsGenerating(prev => ({ ...prev, content: false }));
    }
  };

  const handleGenerateMindMapAI = async () => {
    if (!formData.content) {
      alert("Gere ou escreva o conteúdo primeiro.");
      return;
    }
    setIsGenerating(prev => ({ ...prev, map: true }));
    try {
      const base64Image = await generateMindMap(formData.content);
      const filename = `map_${formData.id || Date.now()}.png`;
      const r2Url = await uploadToR2(base64Image, filename, 'image/png');
      setFormData(prev => ({ ...prev, mapUrl: r2Url }));
    } catch (err) {
      alert("Erro ao gerar ou salvar mapa mental.");
    } finally {
      setIsGenerating(prev => ({ ...prev, map: false }));
    }
  };

  const handleGenerateAudioAI = async () => {
    if (!formData.content) {
      alert("Gere ou escreva o conteúdo primeiro.");
      return;
    }
    setIsGenerating(prev => ({ ...prev, audio: true }));
    try {
      const base64Audio = await generateAudio(formData.content, selectedVoice);
      const filename = `audio_${formData.id || Date.now()}.wav`;
      const r2Url = await uploadToR2(base64Audio, filename, 'audio/wav');
      setFormData(prev => ({ ...prev, audioUrl: r2Url }));
    } catch (err) {
      alert("Erro ao gerar ou salvar áudio.");
    } finally {
      setIsGenerating(prev => ({ ...prev, audio: false }));
    }
  };

  const onManualUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'mapUrl' | 'audioUrl' | 'imageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const url = await uploadToR2(dataUrl, filename, file.type);
        setFormData(prev => ({ ...prev, [field]: url }));
        alert("Arquivo enviado com sucesso!");
      } catch (err) {
        alert(`Erro no upload: ${(err as Error).message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (item: any) => {
    setFormData({...item});
    setMode('edit');
    setShowAddModal(true);
  };

  const handleSaveOrAdd = async () => {
    // Basic Validation
    if (activeView === 'lessons' && (!formData.title || !formData.subjectId)) {
      alert("Título e Matéria Pai são obrigatórios para lições.");
      return;
    }
    if (activeView === 'subjects' && !formData.name) {
      alert("Nome é obrigatório para matérias.");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Saving formData:", formData);
      if (mode === 'edit') {
        if (activeView === 'subjects') {
          await onUpdateSubject(formData as Subject);
        } else if (activeView === 'lessons') {
          await onUpdateLesson(formData as Lesson);
        } else {
          await onUpdateQuestion(formData as Question);
        }
      } else {
        if (activeView === 'subjects') {
          await onAddSubject(formData);
        } else if (activeView === 'lessons') {
          await onAddLesson(formData);
        } else {
          await onAddQuestion(formData);
        }
      }
      setShowAddModal(false);
      setFormData({});
    } catch (err) {
      console.error("Save error:", err);
      alert("Ocorreu um erro ao salvar os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-24 md:p-12 md:pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-800">Painel Administrativo</h2>
            {r2Status && (
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                r2Status.success ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", r2Status.success ? "bg-emerald-500" : "bg-rose-500")} />
                R2: {r2Status.success ? "Conectado" : "Erro"}
              </div>
            )}
          </div>
          <p className="text-slate-500">Gerencie o conteúdo das matérias e lições.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleTestUpload}
            disabled={isTestingR2}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg font-medium transition-all text-xs"
          >
            {isTestingR2 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Testar Upload R2
          </button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <button 
            onClick={() => { setActiveView('subjects'); }}
            className={cn("px-4 py-2 rounded-lg font-medium transition-all", activeView === 'subjects' ? "bg-primary text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Matérias
          </button>
          <button 
            onClick={() => { setActiveView('lessons'); }}
            className={cn("px-4 py-2 rounded-lg font-medium transition-all", activeView === 'lessons' ? "bg-primary text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Lições
          </button>
          <button 
            onClick={() => { setActiveView('questions'); }}
            className={cn("px-4 py-2 rounded-lg font-medium transition-all", activeView === 'questions' ? "bg-primary text-white" : "bg-white text-slate-600 border border-slate-200")}
          >
            Perguntas
          </button>
          <button 
            onClick={() => { setFormData({}); setMode('add'); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all ml-2"
          >
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">ID / Nome</th>
              {activeView === 'questions' ? (
                <>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Nível</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Matéria Pai</th>
                </>
              ) : (
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Nível / Matéria</th>
              )}
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Extras</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(activeView === 'subjects' ? subjects : activeView === 'lessons' ? lessons : questions).map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-800">{activeView === 'questions' ? item.text.substring(0, 50) + '...' : (item.name || item.title)}</div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">{item.id}</div>
                </td>
                {activeView === 'questions' ? (
                  <>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded uppercase tracking-tighter">
                        {item.level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-600">
                        {subjects.find(s => s.id === item.subjectId)?.name || 'N/A'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {lessons.find(l => l.id === item.lessonId)?.title || 'Sem Lição'}
                      </div>
                    </td>
                  </>
                ) : (
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase tracking-tighter">
                      {item.level || (item.lessonId ? (lessons.find(l => l.id === item.lessonId)?.title || 'N/A') : (subjects.find(s => s.id === item.subjectId)?.name || 'N/A'))}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4">
                   <div className="flex gap-2 text-slate-300">
                      {activeView !== 'questions' ? (
                        <>
                          <ImageIcon className={cn("w-4 h-4", item.mapUrl && "text-emerald-500")} />
                          <Headphones className={cn("w-4 h-4", item.audioUrl && "text-blue-500")} />
                          <BookOpen className={cn("w-4 h-4", item.content && "text-amber-500")} />
                        </>
                      ) : (
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{item.options?.length} Opções</div>
                      )}
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => {
                      if (activeView === 'subjects') onDeleteSubject(item.id);
                      else if (activeView === 'lessons') onDeleteLesson(item.id);
                      else onDeleteQuestion(item.id);
                    }} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "bg-white rounded-[2.5rem] w-full overflow-hidden shadow-2xl transition-all duration-500",
              activeView === 'lessons' ? "max-w-6xl" : "max-w-3xl"
            )}
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-bold text-slate-900">
                {formData.id ? 'Editar' : 'Adicionar'} {activeView === 'subjects' ? 'Matéria' : 'Lição'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto text-left">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">ID Único {mode === 'edit' && '(Não editável)'}</label>
                <input 
                  type="text" 
                  value={formData.id || ''}
                  placeholder="Ex: m_pt_nova"
                  disabled={mode === 'edit'}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  className="w-full p-4 bg-slate-100 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm disabled:opacity-50"
                  autoFocus={mode === 'add'}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  {activeView === 'subjects' ? 'Nome da Matéria' : activeView === 'lessons' ? 'Título da Lição' : 'Texto da Pergunta'}
                </label>
                {activeView === 'questions' ? (
                  <textarea 
                    value={formData.text || ''}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    rows={3}
                  />
                ) : (
                  <input 
                    type="text" 
                    value={activeView === 'subjects' ? (formData.name || '') : (formData.title || '')}
                    onChange={(e) => setFormData({...formData, [activeView === 'subjects' ? 'name' : 'title']: e.target.value})}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  />
                )}
              </div>

              {activeView === 'subjects' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nível</label>
                    <select 
                      value={formData.level || ''}
                      onChange={(e) => setFormData({...formData, level: e.target.value})}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Selecione...</option>
                      <option value="fundamental">Fundamental</option>
                      <option value="medio">Médio</option>
                      <option value="superior">Superior</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-black uppercase tracking-widest text-slate-500">Imagem de Capa (R2)</label>
                       <label className="cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-2 py-1.5 transition-all border border-primary/20 rounded-full">
                          <ImageIcon className="w-3 h-3" /> Upload Imagem
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => onManualUpload(e, 'imageUrl')} />
                       </label>
                    </div>
                    <input 
                      type="text" 
                      value={formData.imageUrl || ''}
                      placeholder="URL da Imagem (Ex: R2 URL)"
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                </div>
              )}

              {activeView === 'lessons' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Matéria Pai</label>
                      <select 
                        value={formData.subjectId || ''}
                        onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Selecione...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Conteúdo Teórico (Markdown)</label>
                        <button 
                          onClick={handleGenerateContentAI}
                          disabled={isGenerating.content}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-4 py-2 rounded-full transition-all border border-primary/20 disabled:opacity-50"
                        >
                          {isGenerating.content ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} IA: Gerar Texto
                        </button>
                      </div>
                      <textarea 
                        value={formData.content || ''}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        className="w-full p-5 bg-white border border-slate-200 rounded-2xl h-[400px] outline-none focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed font-mono custom-scrollbar"
                        placeholder="Escreva ou gere o conteúdo com IA..."
                      ></textarea>
                    </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Mapa Mental (IA)</label>
                              <div className="flex gap-1">
                                <label className="cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-all">
                                  <ImageIcon className="w-3 h-3" /> Upload
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => onManualUpload(e, 'mapUrl')} />
                                </label>
                                <button 
                                  onClick={handleGenerateMindMapAI}
                                  disabled={isGenerating.map || !formData.content}
                                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-all border border-emerald-200 disabled:opacity-30"
                                >
                                  {isGenerating.map ? <Loader2 className="w-3 h-3 animate-spin" /> : <Palette className="w-3 h-3" />} Criar Visual
                                </button>
                              </div>
                            </div>
                            <input 
                              type="text" 
                              value={formData.mapUrl || ''}
                              placeholder="URL da Imagem..."
                              onChange={(e) => setFormData({...formData, mapUrl: e.target.value})}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Áudio Aula (IA)</label>
                              <div className="flex gap-1 items-center">
                                <label className="cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-all">
                                  <Mic className="w-3 h-3" /> Upload
                                  <input type="file" className="hidden" accept="audio/*" onChange={(e) => onManualUpload(e, 'audioUrl')} />
                                </label>
                                <select 
                                  value={selectedVoice}
                                  onChange={(e) => setSelectedVoice(e.target.value)}
                                  className="text-[9px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 rounded-full px-2 py-1 outline-none"
                                >
                                  {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.id}</option>)}
                                </select>
                                <button 
                                  onClick={handleGenerateAudioAI}
                                  disabled={isGenerating.audio || !formData.content}
                                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all border border-blue-200 disabled:opacity-30"
                                >
                                  {isGenerating.audio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />} Narrar IA
                                </button>
                              </div>
                            </div>
                        <input 
                          type="text" 
                          value={formData.audioUrl || ''}
                          placeholder="URL do Áudio..."
                          onChange={(e) => setFormData({...formData, audioUrl: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden h-[630px] flex flex-col shadow-inner">
                      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview Interativo</span>
                         </div>
                         <div className="flex gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-200" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-200" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-200" />
                         </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-8 bg-white/50 custom-scrollbar">
                        {formData.content ? (
                          <div className="markdown-body">
                             <ReactMarkdown>{formData.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 grayscale">
                             <Layout className="w-16 h-16 stroke-[1]" />
                             <p className="text-sm font-bold uppercase tracking-widest">O conteúdo aparecerá aqui</p>
                          </div>
                        )}
                        
                        {(formData.mapUrl || formData.audioUrl) && (
                          <div className="mt-12 pt-12 border-t border-slate-200 space-y-8">
                             {formData.mapUrl && (
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Palette className="w-3 h-3 text-emerald-500" /> Visual do Mapa
                                  </label>
                                  <div className="rounded-3xl border-4 border-white shadow-xl overflow-hidden aspect-video">
                                     <img src={formData.mapUrl} className="w-full h-full object-cover" />
                                  </div>
                               </div>
                             )}
                             {formData.audioUrl && (
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Mic className="w-3 h-3 text-blue-500" /> Audio Aula Gerado
                                  </label>
                                  <CustomAudioPlayer src={ensureAudioDataUrl(formData.audioUrl)} />
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'questions' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Lição Pai</label>
                      <select 
                        value={formData.lessonId || ''}
                        onChange={(e) => {
                          const lesson = lessons.find(l => l.id === e.target.value);
                          setFormData({...formData, lessonId: e.target.value, subjectId: lesson?.subjectId});
                        }}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Selecione...</option>
                        {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nível</label>
                      <select 
                        value={formData.level || ''}
                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Selecione...</option>
                        <option value="fundamental">Fundamental</option>
                        <option value="medio">Médio</option>
                        <option value="superior">Superior</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Opções de Resposta</label>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4 items-center">
                        <button 
                          onClick={() => setFormData({...formData, correctIndex: i})}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono transition-all border-2",
                            formData.correctIndex === i ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-50 text-slate-400 border-slate-200"
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </button>
                        <input 
                          type="text" 
                          value={formData.options?.[i] || ''}
                          placeholder={`Opção ${String.fromCharCode(65 + i)}`}
                          onChange={(e) => {
                            const newOpts = [...(formData.options || ['', '', '', ''])];
                            newOpts[i] = e.target.value;
                            setFormData({...formData, options: newOpts});
                          }}
                          className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Explicação da Resposta</label>
                    <textarea 
                      value={formData.explanation || ''}
                      onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                      rows={3}
                      placeholder="Por que esta resposta está correta?"
                    />
                  </div>
                </div>
              )}

              {activeView === 'subjects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Mapa Mental (IA)</label>
                      <button 
                        onClick={handleGenerateMindMapAI}
                        disabled={isGenerating.map || !formData.content}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-all border border-emerald-200 disabled:opacity-30"
                      >
                        {isGenerating.map ? <Loader2 className="w-3 h-3 animate-spin" /> : <Palette className="w-3 h-3" />} Criar Visual
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={formData.mapUrl || ''}
                      placeholder="URL da Imagem..."
                      onChange={(e) => setFormData({...formData, mapUrl: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    />
                    {formData.mapUrl && (
                      <div className="rounded-2xl border border-slate-100 overflow-hidden aspect-video relative group">
                        <img src={formData.mapUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Áudio Aula (IA)</label>
                      <div className="flex gap-2">
                        <select 
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="text-[9px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 rounded-full px-2 py-1 outline-none"
                        >
                          {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.id}</option>)}
                        </select>
                        <button 
                          onClick={handleGenerateAudioAI}
                          disabled={isGenerating.audio || !formData.content}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all border border-blue-200 disabled:opacity-30"
                        >
                          {isGenerating.audio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />} Narrar IA
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={formData.audioUrl || ''}
                      placeholder="URL do Áudio..."
                      onChange={(e) => setFormData({...formData, audioUrl: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    />
                    {formData.audioUrl && (
                      <CustomAudioPlayer src={ensureAudioDataUrl(formData.audioUrl)} className="mt-2" />
                    )}
                  </div>
                </div>
              )}

            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
               <button 
                onClick={() => setShowAddModal(false)}
                className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-200 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveOrAdd}
                disabled={isSaving}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

const Dashboard = ({ onSelectSubject, subjects }: { onSelectSubject: (s: Subject) => void, subjects: Subject[] }) => {
  const [filter, setFilter] = useState<'fundamental' | 'medio' | 'superior' | 'all'>('all');
  
  const filteredSubjects = filter === 'all' 
    ? subjects 
    : subjects.filter(s => s.level === filter);

  return (
    <div className="space-y-6 pb-24 pt-4 md:pt-20">
      {/* Mobile Header */}
      <div className="md:hidden px-6 flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-800 italic uppercase">Gabarito<span className="text-primary">Max</span></h1>
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">RL</div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-4 md:px-0">
        {/* Main Bento Hero Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-12 lg:col-span-8 row-span-2 bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="px-3 py-1 bg-indigo-50 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">Em andamento</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-4 leading-tight tracking-tight text-slate-800">
                Língua Portuguesa:<br/>
                <span className="text-slate-400 font-serif italic">Concordância Verbal</span>
            </h2>
          </div>
          
          <div className="mt-12 flex flex-col sm:flex-row items-end justify-between gap-6 relative z-10">
            <div className="w-full sm:w-1/2">
              <div className="flex justify-between mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Progresso da Aula</span>
                <span className="text-slate-900">72%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '72%' }}
                    className="bg-primary h-full rounded-full"
                />
              </div>
            </div>
            <button className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
                Continuar Estudos
            </button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </motion.div>

        {/* Next Exam Card */}
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-12 md:col-span-6 lg:col-span-4 bg-primary rounded-[2rem] p-8 text-white flex flex-col justify-center items-center text-center shadow-xl shadow-primary/20 relative overflow-hidden"
        >
          <p className="text-blue-100 uppercase text-[10px] font-bold tracking-widest mb-4 opacity-80">Próximo Objetivo</p>
          <h3 className="text-2xl font-bold mb-1 tracking-tight">Receita Federal</h3>
          <div className="text-7xl font-black my-2 font-mono tabular-nums leading-none">42</div>
          <p className="text-blue-100 font-medium italic">Dias para a prova</p>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
        </motion.div>

        {/* Small Stats Card 1 */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-6 md:col-span-3 lg:col-span-2 bg-emerald-500 rounded-[2rem] p-6 flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-500/10"
        >
          <div className="text-4xl font-bold italic font-mono mb-1">156</div>
          <div className="text-[10px] uppercase font-black tracking-widest opacity-80">Questões <br/> Hoje</div>
        </motion.div>

        {/* Small Stats Card 2 */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-6 md:col-span-3 lg:col-span-2 bg-amber-400 rounded-[2rem] p-6 flex flex-col items-center justify-center text-slate-900 shadow-lg shadow-amber-500/10"
        >
          <div className="text-4xl font-bold italic font-mono mb-1 text-slate-900">12</div>
          <div className="text-[10px] uppercase font-black tracking-widest opacity-80 leading-tight">Dias de <br/> Ofensiva</div>
        </motion.div>

        {/* Subjects Bento Section */}
        <div className="col-span-12 space-y-6 mt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ml-2">
                <h3 className="text-xl font-bold tracking-tight text-slate-800">Suas Matérias</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'fundamental', label: 'Fundamental' },
                        { id: 'medio', label: 'Médio' },
                        { id: 'superior', label: 'Superior' }
                    ].map((lvl) => (
                        <button
                            key={lvl.id}
                            onClick={() => setFilter(lvl.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                filter === lvl.id ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {lvl.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredSubjects.map((subject, idx) => (
                    <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelectSubject(subject)}
                    className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
                    >
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm overflow-hidden", !subject.imageUrl && subject.color)}>
                          {subject.imageUrl ? (
                            <img src={subject.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="text-white w-5 h-5" />
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-300">Nível {subject.level}</span>
                            <div className="bg-slate-50 px-2 py-1 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {subject.completedLessons}/{subject.totalLessons}
                            </div>
                        </div>
                    </div>
                    <h3 className="font-bold text-base text-slate-800 tracking-tight mb-2">{subject.name}</h3>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(subject.completedLessons / subject.totalLessons) * 100}%` }}
                            className={cn("h-full rounded-full transition-all duration-1000", subject.color)}
                        />
                    </div>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Last Simulation Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-12 md:col-span-6 lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
        >
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-1">Último Simulado</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">12/05/2026</p>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black font-mono">84</span>
              <span className="text-2xl text-slate-500 font-bold">/100</span>
            </div>
            <p className="text-emerald-400 font-bold text-sm mt-4 italic">Acima de 92% dos candidatos</p>
          </div>
          <button className="mt-8 relative z-10 w-full bg-primary py-4 rounded-2xl font-bold hover:bg-primary-dark transition-all transform active:scale-95 shadow-lg shadow-primary/20">
            Refazer Erros
          </button>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary rounded-full opacity-10" />
        </motion.div>

        {/* Performance Sidebar/Card */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col gap-6"
        >
            <h3 className="font-bold text-slate-800 text-lg tracking-tight">Desempenho por Matéria</h3>
            <div className="space-y-5">
                {[
                    { label: 'Direito Adm.', val: 88, col: 'bg-emerald-400' },
                    { label: 'Português', val: 74, col: 'bg-primary' },
                    { label: 'Raciocínio Lógico', val: 92, col: 'bg-emerald-400' },
                    { label: 'Contabilidade', val: 41, col: 'bg-rose-400' },
                ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">{item.label}</span>
                            <span className="text-slate-900">{item.val}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.val}%` }}
                                className={cn("h-full rounded-full", item.col)}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto pt-6 border-t border-slate-100 text-center">
                <button className="text-primary text-xs font-black uppercase tracking-widest hover:underline">Ver Relatório Completo</button>
            </div>
        </motion.div>

        {/* Flashcards Card */}
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-12 md:col-span-12 lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm"
        >
            <h3 className="font-bold text-slate-800 text-lg tracking-tight mb-6">Revisão Rápida</h3>
            <div className="space-y-4">
                {[
                    { count: 32, title: 'Atos Administrativos', color: 'bg-blue-50 text-blue-600' },
                    { count: 18, title: 'Direito Tributário', color: 'bg-rose-50 text-rose-600' },
                ].map((card, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono transition-transform group-hover:scale-110", card.color)}>
                            {card.count}
                        </div>
                        <div className="text-sm font-bold text-slate-700 italic tracking-tight">{card.title}</div>
                        <ChevronRight className="ml-auto w-4 h-4 text-slate-300" />
                    </div>
                ))}
            </div>
            <button className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-500 transition-all">
                + Criar Flashcards
            </button>
        </motion.div>
      </div>
    </div>
  );
};

const QuizView = ({ lesson, onComplete, questions }: { lesson: Lesson, onComplete: () => void, questions: Question[] }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === questions[currentIdx].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 pt-12 pb-24 text-center">
        <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center ring-[12px] ring-emerald-50 mb-4"
        >
          <Trophy className="w-16 h-16" />
        </motion.div>
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-2 font-serif italic">Simulado Finalizado!</h2>
          <p className="text-slate-500 max-w-xs mx-auto font-medium text-lg leading-relaxed">Você demonstrou ótimo desempenho em {lesson.title}.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm px-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Precisão</div>
                <div className="text-3xl font-mono font-bold text-slate-900">{(score/questions.length)*100}%</div>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Pontos</div>
                <div className="text-3xl font-mono font-bold text-primary">+{score * 25}</div>
            </div>
        </div>
        <button 
          onClick={onComplete}
          className="bg-slate-900 text-white w-full max-w-sm py-5 rounded-2xl font-bold shadow-xl shadow-black/10 hover:bg-black transition-all transform active:scale-95"
        >
          Retornar ao Painel
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="space-y-6 pt-4 md:pt-16 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center justify-between px-6 md:px-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-bold font-mono text-primary shadow-sm text-lg">
            {currentIdx + 1}/{questions.length}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">Questão Atual</span>
            <span className="text-sm font-bold text-slate-600 truncate max-w-[200px]">{lesson.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold text-sm text-slate-700">12:45</span>
        </div>
      </div>

      <motion.div 
        key={currentIdx}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white border border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-xl shadow-slate-200/40 relative overflow-hidden"
      >
        <h3 className="text-2xl md:text-3xl font-medium leading-tight text-slate-800 tracking-tight mb-4 relative z-10">{currentQ.text}</h3>
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100%] pointer-events-none opacity-50" />
      </motion.div>

      <div className="space-y-3 px-4 md:px-0">
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleOptionClick(i)}
            disabled={isAnswered}
            className={cn(
              "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center gap-6 group relative overflow-hidden",
              !isAnswered && "border-white bg-white hover:border-primary/20 hover:shadow-md",
              isAnswered && i === currentQ.correctIndex && "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm",
              isAnswered && i === selectedOption && i !== currentQ.correctIndex && "border-rose-500 bg-rose-50 text-rose-800",
              isAnswered && i !== selectedOption && i !== currentQ.correctIndex && "opacity-40 grayscale"
            )}
          >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border-2 flex-shrink-0 text-base font-bold font-mono transition-all",
                !isAnswered && "border-slate-100 bg-slate-50 group-hover:bg-primary group-hover:text-white text-slate-400 group-hover:border-primary shadow-sm",
                isAnswered && i === currentQ.correctIndex && "border-emerald-200 bg-emerald-500 text-white",
                isAnswered && i === selectedOption && i !== currentQ.correctIndex && "border-rose-200 bg-rose-500 text-white",
                isAnswered && i !== selectedOption && i !== currentQ.correctIndex && "border-slate-100 text-slate-300"
            )}>
                {String.fromCharCode(65 + i)}
            </div>
            <span className="text-lg font-medium tracking-tight pr-4">{opt}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 md:px-0"
          >
            <div className={cn(
                "p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden",
                selectedOption === currentQ.correctIndex ? "bg-emerald-100 border border-emerald-200" : "bg-slate-100 border border-slate-200"
            )}>
              <div className="flex items-center gap-3 mb-4">
                {selectedOption === currentQ.correctIndex ? 
                    <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-md shadow-emerald-500/20"><CheckCircle2 className="w-5 h-5" /></div> : 
                    <div className="bg-slate-400 p-2 rounded-xl text-white shadow-md shadow-slate-400/20"><XCircle className="w-5 h-5" /></div>
                }
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">Análise da Questão</span>
              </div>
              <p className="text-lg leading-relaxed text-slate-700 font-medium italic opacity-90 underline decoration-slate-300 decoration-1 underline-offset-4">{currentQ.explanation}</p>
              <button
                onClick={handleNext}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold mt-8 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-lg"
              >
                Próxima Questão
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LessonView = ({ lesson, onBack, onStartQuiz }: { lesson: Lesson, onBack: () => void, onStartQuiz: () => void }) => {
  return (
    <div className="pb-24 pt-4 md:pt-20 max-w-4xl mx-auto space-y-8">
      <button 
        onClick={onBack}
        className="ml-6 md:ml-0 flex items-center gap-2 text-slate-400 font-black hover:text-primary transition-all text-[10px] uppercase tracking-[0.2em] bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar à Trilha
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-[3.5rem] p-10 md:p-16 shadow-2xl shadow-slate-200/60"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 pb-6 border-b border-slate-100">
           <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{lesson.title}</h2>
           {lesson.audioUrl && (
             <CustomAudioPlayer src={ensureAudioDataUrl(lesson.audioUrl)} className="w-full md:w-80" />
           )}
        </div>

        {lesson.mapUrl && (
          <div className="mb-12 rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
             <div className="bg-slate-50 border-b border-slate-100 p-3 px-6 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mapa Mental Interativo</span>
                <ImageIcon className="w-4 h-4 text-primary" />
             </div>
             <img 
               src={lesson.mapUrl} 
               alt={`Mapa Mental - ${lesson.title}`} 
               className="w-full object-contain max-h-[600px] bg-white cursor-zoom-in"
               referrerPolicy="no-referrer"
             />
          </div>
        )}

        <div className="markdown-body">
          <ReactMarkdown>{lesson.content}</ReactMarkdown>
        </div>

        <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 text-center md:text-left">
                <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center flex-shrink-0">
                    <History className="w-10 h-10 text-primary" />
                </div>
                <div>
                    <h4 className="font-bold text-2xl text-slate-900 mb-1 tracking-tight">Consolidação de Aprendizado</h4>
                    <p className="text-slate-500 font-medium leading-relaxed">Você concluiu a teoria. Vamos aos desafios práticos?</p>
                </div>
            </div>
            <button 
                onClick={onStartQuiz}
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all text-lg"
            >
                Abrir Simulado
            </button>
        </div>
      </motion.div>
    </div>
  );
};

const StudiesView = ({ onSelectLesson, subjects, lessons }: { onSelectLesson: (l: Lesson) => void, subjects: Subject[], lessons: Lesson[] }) => {
    const [filter, setFilter] = useState<'fundamental' | 'medio' | 'superior' | 'all'>('all');
    
    const filteredSubjects = filter === 'all' 
        ? subjects 
        : subjects.filter(s => s.level === filter);

    return (
        <div className="space-y-10 pb-24 pt-4 md:pt-20 max-w-4xl mx-auto px-6 md:px-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h2 className="text-5xl font-bold font-serif italic text-slate-900 tracking-tight">Trilhas de Aprendizado</h2>
                    <p className="text-slate-500 font-medium text-lg">Selecione seu módulo de foco para hoje.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'fundamental', label: 'Fundamental' },
                        { id: 'medio', label: 'Médio' },
                        { id: 'superior', label: 'Superior' }
                    ].map((lvl) => (
                        <button
                            key={lvl.id}
                            onClick={() => setFilter(lvl.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === lvl.id ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {lvl.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="space-y-12">
                {filteredSubjects.map((subject) => {
                    const subjectLessons = lessons.filter(l => l.subjectId === subject.id);
                    return (
                        <div key={subject.id} className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {subject.imageUrl ? (
                                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                                        <img src={subject.imageUrl} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className={cn("w-1.5 h-8 rounded-full shadow-lg", subject.color)} />
                                    )}
                                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{subject.name}</h3>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    {subjectLessons.length} {subjectLessons.length === 1 ? 'Módulo' : 'Módulos'}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {subjectLessons.map((lesson) => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => onSelectLesson(lesson)}
                                        className="w-full text-left bg-white border border-slate-200 p-8 rounded-[2.5rem] flex items-center justify-between hover:border-primary hover:shadow-2xl hover:shadow-primary/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-12 shadow-sm border border-slate-100">
                                                <CirclePlay className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Módulo 01</span>
                                                <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-primary transition-colors">{lesson.title}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                                {subjectLessons.length === 0 && (
                                    <div className="p-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 col-span-1 md:col-span-2">
                                        <BrainCircuit className="w-10 h-10 text-slate-200 mb-2" />
                                        <div className="text-slate-400 font-bold text-sm uppercase tracking-widest">Currículo em Atualização</div>
                                        <p className="text-slate-300 text-xs italic">Novas lições sendo preparadas por especialistas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ensureAudioDataUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) {
    return url;
  }
  return `data:audio/wav;base64,${url}`;
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentQuizLesson, setCurrentQuizLesson] = useState<Lesson | null>(null);

  // Database States
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [lessons, setLessons] = useState<Lesson[]>(MOCK_LESSONS);
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/db-status');
        const data = await res.json();
        setDbConnected(data.connected);
      } catch (err) {
        setDbConnected(false);
      }
    }
    checkDb();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Buscar da API local (que você conectará ao Coolify)
        const [subRes, lesRes, quesRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch('/api/lessons'),
          fetch('/api/questions')
        ]);

        if (!subRes.ok || !lesRes.ok || !quesRes.ok) throw new Error('Falha ao ler dados do servidor');

        const subData = await subRes.json();
        const lesData = await lesRes.json();
        const quesData = await quesRes.json();

        if (subData) setSubjects(subData);
        if (lesData) setLessons(lesData);
        if (quesData) setQuestions(quesData);

        setError(null);
      } catch (err) {
        console.warn('Usando dados de fallback devido a erro na API.');
        setError('Servidor local não respondeu. Usando dados offline.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleUpdateSubject = async (s: Subject) => {
    try {
      console.log("Updating subject:", s);
      const res = await fetch(`/api/subjects/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setSubjects(prev => prev.map(item => item.id === s.id ? s : item));
      if (selectedSubject?.id === s.id) setSelectedSubject(s);
    } catch (err) {
      console.error(err);
      alert('Falha ao salvar alteração');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Excluir esta matéria e todas as suas lições?')) return;
    try {
      await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => s.id !== id));
      setLessons(prev => prev.filter(l => l.subjectId !== id));
    } catch (err) { alert('Erro ao excluir'); }
  };

  const handleAddSubject = async (s: Partial<Subject>) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      const data = await res.json();
      setSubjects(prev => [...prev, data]);
    } catch (err) { alert('Erro ao adicionar'); }
  };

  const handleUpdateLesson = async (l: Lesson) => {
    try {
      console.log("handleUpdateLesson called with:", l);
      const res = await fetch(`/api/lessons/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(l)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }
      setLessons(prev => prev.map(item => item.id === l.id ? l : item));
      if (selectedLesson?.id === l.id) setSelectedLesson(l);
      alert('Alterações salvas com sucesso!');
    } catch (err) { 
      console.error("handleUpdateLesson error:", err);
      alert(`Falha ao salvar lesson: ${err instanceof Error ? err.message : String(err)}`); 
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Excluir esta lição?')) return;
    try {
      await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (err) { alert('Erro ao excluir'); }
  };

  const handleAddLesson = async (l: Partial<Lesson>) => {
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(l)
      });
      const data = await res.json();
      setLessons(prev => [...prev, data]);
    } catch (err) { alert('Erro ao adicionar'); }
  };

  const handleUpdateQuestion = async (q: Question) => {
    try {
      const res = await fetch(`/api/questions/${q.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q)
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setQuestions(prev => prev.map(item => item.id === q.id ? q : item));
    } catch (err) { alert('Falha ao salvar question'); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return;
    try {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) { alert('Erro ao excluir'); }
  };

  const handleAddQuestion = async (q: Partial<Question>) => {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q)
      });
      const data = await res.json();
      setQuestions(prev => [...prev, data]);
    } catch (err) { alert('Erro ao adicionar'); }
  };

  const handleSelectSubject = (s: Subject) => {
    setSelectedSubject(s);
    setActiveTab('studies');
  };

  const handleSelectLesson = (l: Lesson) => {
    setSelectedLesson(l);
    setActiveTab('lesson-viewer');
  };

  const handleStartQuiz = () => {
    if (selectedLesson) {
        setCurrentQuizLesson(selectedLesson);
        setActiveTab('quiz-view');
    }
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
          />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Conectando ao banco...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} dbConnected={dbConnected} />
      
      {error && activeTab === 'dashboard' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 shadow-lg"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-xs font-medium text-amber-700 leading-tight">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-amber-400 hover:text-amber-600">
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-0 py-6 md:py-12 md:px-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Dashboard 
                onSelectSubject={handleSelectSubject} 
                subjects={subjects} 
              />
            </motion.div>
          )}

          {activeTab === 'studies' && (
            <motion.div
              key="studies"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <StudiesView onSelectLesson={handleSelectLesson} subjects={subjects} lessons={lessons} />
            </motion.div>
          )}

          {activeTab === 'lesson-viewer' && selectedLesson && (
            <motion.div
              key="lesson"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              <LessonView 
                lesson={selectedLesson} 
                onBack={() => setActiveTab('studies')} 
                onStartQuiz={handleStartQuiz}
              />
            </motion.div>
          )}

          {activeTab === 'quiz-view' && currentQuizLesson && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <QuizView 
                lesson={currentQuizLesson} 
                onComplete={() => setActiveTab('dashboard')} 
                questions={questions.filter(q => q.lessonId === currentQuizLesson.id)}
              />
            </motion.div>
          )}

          {activeTab === 'performance' && (
            <motion.div
                key="perf"
                className="pt-20 px-6 max-w-4xl mx-auto space-y-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="space-y-2 text-center md:text-left">
                    <h2 className="text-5xl font-bold font-serif italic text-slate-900 tracking-tight">Suas Estatísticas</h2>
                    <p className="text-slate-500 font-medium text-lg">Acompanhe seu progresso rumo à aprovação.</p>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                <History className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Tempo de Estudo</h3>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-6xl font-black text-slate-900">142</span>
                            <span className="text-xl font-bold text-slate-400 uppercase tracking-widest leading-none">Horas Totais</span>
                        </div>
                        <p className="mt-4 text-emerald-500 font-bold flex items-center gap-1">
                            <ChevronRight className="w-4 h-4 rotate-[-90deg]" /> +12% em relação à semana passada
                        </p>
                    </div>

                    <div className="col-span-12 md:col-span-4 bg-primary p-10 rounded-[3rem] text-white shadow-xl shadow-primary/20 flex flex-col items-center justify-center text-center">
                        <Trophy className="w-16 h-16 mb-4 text-amber-300" />
                        <div className="text-4xl font-black mb-1">Nível 14</div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Rumo ao Ouro</div>
                    </div>

                    <div className="col-span-6 md:col-span-3 bg-emerald-500 p-8 rounded-[2.5rem] text-white">
                        <div className="text-3xl font-black font-mono">82%</div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Taxa de Acerto</div>
                    </div>

                    <div className="col-span-6 md:col-span-3 bg-amber-400 p-8 rounded-[2.5rem] text-slate-900">
                        <div className="text-3xl font-black font-mono">15</div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Simulados</div>
                    </div>

                    <div className="col-span-12 md:col-span-6 bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Ranking Geral</div>
                            <div className="text-2xl font-bold">Top 5% no Brasil</div>
                        </div>
                        <div className="w-16 h-16 border-4 border-primary rounded-full flex items-center justify-center font-bold text-primary">#42</div>
                    </div>
                </div>

                <div className="bg-slate-50 p-12 rounded-[3.5rem] border-2 border-dashed border-slate-200 text-center">
                    <p className="text-sm text-slate-400 font-medium italic">"A constância é a chave para o impossível."</p>
                </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="admin">
              <AdminPanel 
                subjects={subjects} 
                lessons={lessons}
                questions={questions}
                onUpdateSubject={handleUpdateSubject}
                onDeleteSubject={handleDeleteSubject}
                onAddSubject={handleAddSubject}
                onUpdateLesson={handleUpdateLesson}
                onDeleteLesson={handleDeleteLesson}
                onAddLesson={handleAddLesson}
                onUpdateQuestion={handleUpdateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onAddQuestion={handleAddQuestion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
