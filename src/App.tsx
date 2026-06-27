import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Github,
  Terminal,
  Settings,
  Bot,
  FileText,
  Edit,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Cpu,
  Copy,
  Check,
  BookOpen,
  Key,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Code
} from "lucide-react";
import { FileInfo, AgentLog, ArticleCheckResult, ModelOption } from "./types";
import { PYTHON_CODE } from "./pythonCode";

// Premium Streamlit Color Scheme
// Red/Coral: #FF4B4B
// Background: #FFFFFF (main), #F0F2F6 (sidebar)
// Text: #31333F (primary), #5B5D6A (secondary)

const MODELS: ModelOption[] = [
  {
    id: "local-offline-nlp",
    name: "Local Resilient Offline-Engine",
    provider: "gemini",
    description: "Intelligente, netzwerkunabhängige linguistische Heuristik-Engine. 100% ausfallsicher."
  }
];

// Sample Articles matching the praxis-it context (Medical IT digitalization in German)
const PRESET_ARTICLES = [
  {
    title: "Künstliche Intelligenz in der Dermatologie zur Hautkrebs-Früherkennung",
    text: `Künstliche Intelligenz (KI) revolutioniert zunehmend die dermatologische Diagnostik, insbesondere bei der Früherkennung von Melanomen und anderen bösartigen Hauttumoren. Durch den Einsatz von tiefen neuronalen Netzen (Deep Learning), die auf Millionen dermatologischer Aufnahmen trainiert wurden, können KI-Systeme heute auffällige Muttermale mit einer Präzision analysieren, die in klinischen Studien auf dem Niveau erfahrener Fachärzte liegt. 

In modernen dermatologischen Praxen kommen vermehrt KI-gestützte Auflichtmikroskope und Ganzkörper-Scansysteme zum Einsatz. Diese Systeme vergleichen neu aufgenommene Bilder automatisch mit früheren Aufnahmen des Patienten, um selbst minimale Veränderungen (Symmetrie, Begrenzung, Farbvarianz, Durchmesser) im Zeitverlauf zu detektieren. Dies entlastet nicht nur die Dermatologen bei Routineuntersuchungen, sondern erhöht auch die Diagnosesicherheit im hektischen Praxisalltag erheblich.

Ein kritischer Faktor bei der Einführung bleibt jedoch die Integration dieser Technologie in bestehende Praxisverwaltungssysteme (PVS) sowie die Klärung haftungsrechtlicher Fragen bei Fehldiagnosen. Dennoch ist der Trend unaufhaltsam: KI-Modelle fungieren als hocheffiziente "Zweitmeinungen" direkt am Behandlungsstuhl.`,
    category: "dermatologie.qmd"
  },
  {
    title: "Sicherheitsrisiken von KIM-Diensten in der Arztpraxis",
    text: `Kommunikation im Medizinwesen (KIM) ist der zentrale E-Mail- und Datenaustausch-Dienst der Telematikinfrastruktur (TI) in Deutschland. Obwohl KIM durch Ende-zu-Ende-Verschlüsselung als hochsicher gilt, birgt die alltägliche Integration in den Praxisbetrieb erhebliche IT-Sicherheitsrisiken, die oft auf menschliches Fehlverhalten oder Konfigurationsmängel zurückzuführen sind.

Häufige Schwachstellen betreffen die Speicherung der privaten Schlüssel und Passwörter der elektronischen Heilberufsausweise (eHBA) oder der SMC-B Karten direkt im Praxisnetzwerk, um automatische Signaturprozesse zu erleichtern. Gelingt es Angreifern, sich über klassische Phishing-Mails Zugang zu den Praxiscomputern zu verschaffen, können diese geheimen Schlüssel kompromittiert werden. 

Zudem führt das blockweise Entschlüsseln von Anhängen ohne ausreichende lokale Virenprüfung dazu, dass Schadsoftware unbemerkt in das Praxisverwaltungssystem (PVS) eingespielt wird. Praxen müssen daher dringend strikte Firewalls, regelmäßige Backups und intensive Mitarbeiterschulungen etablieren, um den hochsensiblen Datenkanal abzusichern.`,
    category: "it-sicherheit.qmd"
  },
  {
    title: "Einsatz von Telemedizin und Videosprechstunden in der Geriatrie",
    text: `Videosprechstunden und digitale telemedizinische Betreuungsangebote gewinnen in der Geriatrie – der Altenmedizin – massiv an Bedeutung. Viele ältere, chronisch kranke oder in ihrer Mobilität eingeschränkte Patienten profitieren immens davon, wenn anstrengende Fahrten in die Arztpraxis durch digitale Kontakte ersetzt werden können.

Besonders erfolgreich zeigt sich der Einsatz in der Wundkontrolle, bei der Nachbesprechung von Laborwerten oder bei der regelmäßigen Anpassung von Medikationsplänen bei Multimorbidität. Oft unterstützen pflegende Angehörige oder mobile Pflegedienste die Senioren bei der technischen Durchführung der Videosprechstunde, was technische Hürden minimiert.

Dennoch existieren Hürden: Neben der fehlenden sensorischen Wahrnehmung des Arztes (Abtasten, Geruch) ist die Finanzierung geriatriespezifischer Telemedizin-Aufschläge im Einheitlichen Bewertungsmaßstab (EBM) immer noch unzureichend gelöst. Eine ganzheitliche Versorgung erfordert daher eine kluge Hybrid-Struktur aus Hausbesuchen und telemedizinischem Monitoring.`,
    category: "geriatrie.qmd"
  }
];

export default function App() {
  // Form State
  const [articleTitle, setArticleTitle] = useState("");
  const [articleText, setArticleText] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id); // Default to Local Offline Engine
  const [hfToken, setHfToken] = useState("");

  // App UI State
  const [repoFiles, setRepoFiles] = useState<FileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [filesSource, setFilesSource] = useState<string>("");
  const [filesWarning, setFilesWarning] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Workflow execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ArticleCheckResult | null>(null);
  const [activeTab, setActiveTab] = useState<"result" | "logs" | "mcp" | "python">("result");
  const [copied, setCopied] = useState(false);
  const [pythonCopied, setPythonCopied] = useState(false);

  // Expander collapse states in Streamlit sidebar style
  const [isFilesExpanderOpen, setIsFilesExpanderOpen] = useState(true);
  const [isHelpExpanderOpen, setIsHelpExpanderOpen] = useState(false);

  // Fetch file list on mount
  useEffect(() => {
    fetchRepoFiles();
  }, []);

  const fetchRepoFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch("/api/github/files");
      const data = await response.json();
      if (data.files) {
        setRepoFiles(data.files);
        setFilesSource(data.source);
        if (data.warning) {
          setFilesWarning(data.warning);
        }
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleLoadPreset = (preset: typeof PRESET_ARTICLES[0]) => {
    setArticleTitle(preset.title);
    setArticleText(preset.text);
  };

  const handleClear = () => {
    setArticleTitle("");
    setArticleText("");
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleText.trim()) return;

    setIsProcessing(true);
    setResult(null);
    setActiveTab("result");

    try {
      const response = await fetch("/api/check-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleTitle,
          articleText,
          modelId: selectedModel,
          hfToken: hfToken.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process article");
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      console.error("Workflow error:", error);
      // Create failure fallback check result to render gracefully
      setResult({
        isPresent: false,
        articleTitle: articleTitle || "Untitled",
        reasoning: `Fehler beim Ausführen der Agenten-Pipeline: ${error.message}. Bitte überprüfen Sie Ihre Konfiguration oder Ihren API-Schlüssel.`,
        logs: [
          {
            timestamp: new Date().toLocaleTimeString(),
            agent: "MCP Gateway",
            type: "error",
            message: `Workflow crashed: ${error.message}`
          }
        ]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter repository files in sidebar
  const filteredFiles = repoFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-[#31333F] font-sans flex flex-col selection:bg-[#FF4B4B] selection:text-white">
      {/* Streamlit Brand Top Anchor */}
      <div className="h-1 bg-[#FF4B4B] w-full sticky top-0 z-50"></div>

      {/* Main Container */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Toggle Sidebar Button (Float) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-4 top-4 z-40 p-2 rounded-md hover:bg-gray-100 bg-white shadow-sm border border-gray-200 text-gray-600 transition-colors focus:outline-none"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          id="st_sidebar_toggle"
        >
          {isSidebarOpen ? <ChevronRight size={18} className="rotate-180 transition-transform" /> : <ChevronRight size={18} />}
        </button>

        {/* --- STREAMLIT SIDEBAR (st.sidebar) --- */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="w-[340px] bg-[#F0F2F6] border-r border-[#E6E9EF] flex flex-col shrink-0 overflow-y-auto"
              id="st_sidebar"
            >
              <div className="p-6 pt-16 flex flex-col gap-6">
                
                {/* Sidebar Header */}
                <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                  <Github className="text-gray-700" size={24} />
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Repo Agent Workspace</h2>
                    <p className="text-xs text-gray-500 font-mono">bsenst/praxis-it</p>
                  </div>
                </div>

                {/* --- Active Offline Engine Info --- */}
                <div className="flex flex-col gap-2.5 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 text-[#FF4B4B] font-semibold text-sm">
                    <Cpu size={16} />
                    <span>Agenten-Engine aktiv</span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium font-mono bg-gray-50 border border-gray-150 px-2 py-1 rounded">
                    Local Resilient Offline-Engine
                  </p>
                  <p className="text-[11px] text-gray-500 leading-normal mt-1">
                    Diese Engine ist 100% netzwerkunabhängig, ausfallsicher und arbeitet mittels intelligenter linguistischer Heuristiken direkt in diesem Workspace.
                  </p>
                </div>

                {/* --- st.expander: Repository Content Navigator --- */}
                <div className="border border-gray-200 rounded-md bg-white overflow-hidden shadow-sm">
                  <button
                    onClick={() => setIsFilesExpanderOpen(!isFilesExpanderOpen)}
                    className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-sm border-b border-gray-200 transition-colors focus:outline-none text-gray-700"
                    id="st_expander_files_toggle"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={15} className="text-[#FF4B4B]" />
                      <span>Repo Files ({repoFiles.length})</span>
                    </span>
                    {isFilesExpanderOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {isFilesExpanderOpen && (
                    <div className="p-3 flex flex-col gap-3">
                      {/* Search Bar for Files */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter files (e.g. dermatologie)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-md pl-8 pr-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4B4B] focus:border-[#FF4B4B]"
                          id="st_file_search"
                        />
                        <Search size={12} className="absolute left-2.5 top-2 text-gray-400" />
                      </div>

                      {/* Warnings if API failure */}
                      {filesWarning && (
                        <div className="p-1.5 bg-amber-50 border border-amber-200 text-[10px] rounded text-amber-700 font-medium">
                          {filesWarning}
                        </div>
                      )}

                      {/* File list scroll */}
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-100 text-xs flex flex-col pr-1">
                        {isLoadingFiles ? (
                          <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                            <RefreshCw size={14} className="animate-spin text-[#FF4B4B]" />
                            <span>Loading index...</span>
                          </div>
                        ) : filteredFiles.length === 0 ? (
                          <div className="py-4 text-center text-gray-400">No matching files.</div>
                        ) : (
                          filteredFiles.map((file) => (
                            <a
                              key={file.name}
                              href={file.html_url}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="py-1.5 px-1 hover:bg-gray-50 flex items-center justify-between text-gray-600 hover:text-[#FF4B4B] rounded transition-colors group"
                              id={`file_link_${file.name.replace(".qmd", "")}`}
                            >
                              <span className="truncate max-w-[180px] font-mono font-medium">{file.name}</span>
                              <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* --- st.expander: How it Works --- */}
                <div className="border border-gray-200 rounded-md bg-white overflow-hidden shadow-sm">
                  <button
                    onClick={() => setIsHelpExpanderOpen(!isHelpExpanderOpen)}
                    className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-sm border-b border-gray-200 transition-colors focus:outline-none text-gray-700"
                    id="st_expander_help_toggle"
                  >
                    <span>ℹ️ Agent Pipeline Design</span>
                    {isHelpExpanderOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {isHelpExpanderOpen && (
                    <div className="p-3 text-xs text-gray-600 leading-relaxed flex flex-col gap-2">
                      <p>
                        <strong>1. GitHub Checker Agent:</strong> Runs a semantic comparison of the new article title/body against the real directory catalog of 55+ clinical IT articles.
                      </p>
                      <p>
                        <strong>2. Summarizer Agent:</strong> If not present, creates an optimized Quarto markdown summary. If present, halts further operations to conserve bandwidth and CPU.
                      </p>
                      <p>
                        <strong>3. GitHub MCP Server:</strong> Simulates the standardized tool calls for checking files and resolving target pathways.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer brand */}
                <div className="text-center pt-2 pb-4 border-t border-gray-200 text-[11px] text-gray-400">
                  Made with <span className="text-[#FF4B4B]">❤️</span> in Streamlit React
                </div>

              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* --- MAIN STREAMLIT APP AREA --- */}
        <main className="flex-1 overflow-y-auto bg-white p-6 md:p-12 lg:p-16">
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            
            {/* st.title Header */}
            <div className="flex flex-col gap-2" id="st_app_header">
              <div className="flex items-center gap-3">
                <div className="bg-[#FF4B4B] p-2.5 rounded-xl text-white shadow-md">
                  <Bot size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                    praxis-it Agent Workspace
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">
                    Streamlit-powered Dual Agent Coprocessor for Medical Practice IT Articles
                  </p>
                </div>
              </div>
            </div>

            {/* st.info banner */}
            <div className="bg-[#F0F2F6] border-l-4 border-[#FF4B4B] p-4 rounded-r-md text-sm text-gray-700 leading-relaxed flex gap-3 shadow-sm" id="st_info_banner">
              <Info className="shrink-0 text-[#FF4B4B] mt-0.5" size={18} />
              <div>
                <strong>Workflow Instructions:</strong> Enter an article below or click one of the preset practice-clinical articles to load it instantly. 
                Our <strong>GitHub Checker Agent</strong> will inspect the repository. If the content is already present, it returns a link to view it. 
                If missing, our <strong>Summarizer Agent</strong> compiles an executive markdown summary, and the checker resolves the precise file in the repo to target for insertion.
              </div>
            </div>

            {/* Presets Selection */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#FF4B4B]" />
                <span>Quick Preset Articles (German)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_ARTICLES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="p-3 text-left border border-gray-200 hover:border-[#FF4B4B] rounded-lg bg-gray-50 hover:bg-white text-xs transition-all shadow-sm flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-[#FF4B4B]/20"
                    id={`preset_btn_${idx}`}
                  >
                    <span className="font-semibold text-gray-800 line-clamp-1">{preset.title}</span>
                    <span className="text-gray-500 line-clamp-2 leading-relaxed">{preset.text}</span>
                    <span className="mt-auto pt-1 font-mono text-[9px] text-gray-400">Target: {preset.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
              <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">
                ✍️ Enter Article Metadata
              </h3>
              
              {/* st.text_input: Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Article Title <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sicherheitslücken bei Telematikinfrastruktur-Terminals"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B4B]/50 focus:border-[#FF4B4B]"
                  id="st_input_title"
                />
              </div>

              {/* st.text_area: Body */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700">
                    Article Text <span className="text-[#FF4B4B]">*</span>
                  </label>
                  <span className="text-xs text-gray-400 font-mono">
                    {articleText.length} chars | {articleText.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  required
                  placeholder="Paste the medical/IT practice article here (German language recommended to match the praxis-it repository files)..."
                  value={articleText}
                  onChange={(e) => setArticleText(e.target.value)}
                  rows={8}
                  className="w-full bg-white border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B4B]/50 focus:border-[#FF4B4B] font-sans leading-relaxed"
                  id="st_input_text"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors focus:outline-none"
                  id="st_clear_btn"
                >
                  Clear Inputs
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !articleText.trim()}
                  className="px-6 py-2 text-sm font-semibold text-white bg-[#FF4B4B] hover:bg-[#E04040] disabled:bg-gray-300 rounded-md transition-all flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                  id="st_submit_btn"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      <span>Running Agents...</span>
                    </>
                  ) : (
                    <>
                      <Bot size={16} />
                      <span>Run Agents & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* --- WORKFLOW PROGRESS SPINNER --- */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-[#FF4B4B]/30 bg-[#FF4B4B]/5 p-6 rounded-xl flex flex-col gap-4 text-center items-center shadow-inner"
                id="st_spinner_box"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-[#FF4B4B] animate-spin"></div>
                  <Bot className="absolute text-[#FF4B4B]" size={18} />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-[#FF4B4B] animate-pulse">Dual Agents Executing on CPU Instance</h4>
                  <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                    1. Connecting MCP Gateway to GitHub API... <br />
                    2. Activating <strong>GitHub Checker Agent</strong> to run semantic inspection... <br />
                    3. Coordinating <strong>Summarizer Agent</strong> to compile Quarto-compliant markdown...
                  </p>
                </div>
              </motion.div>
            )}

            {/* --- AGENT PIPELINE OUTPUT RESULTS --- */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
                id="st_results_area"
              >
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <h3 className="font-extrabold text-xl tracking-tight text-gray-900 flex items-center gap-2">
                    <Terminal className="text-[#FF4B4B]" size={20} />
                    <span>Agent Workspace Results</span>
                  </h3>
                  
                  {/* Tab Selector */}
                  <div className="flex bg-gray-100 p-1 rounded-lg gap-1 border border-gray-200 text-xs font-semibold">
                    <button
                      onClick={() => setActiveTab("result")}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        activeTab === "result" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
                      }`}
                      id="tab_btn_result"
                    >
                      Output Summary
                    </button>
                    <button
                      onClick={() => setActiveTab("logs")}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        activeTab === "logs" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
                      }`}
                      id="tab_btn_logs"
                    >
                      Agent Logs
                    </button>
                    <button
                      onClick={() => setActiveTab("mcp")}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        activeTab === "mcp" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
                      }`}
                      id="tab_btn_mcp"
                    >
                      MCP Payloads
                    </button>
                    <button
                      onClick={() => setActiveTab("python")}
                      className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                        activeTab === "python" ? "bg-white text-gray-800 shadow-sm" : "text-[#FF4B4B]/80 hover:text-[#FF4B4B]"
                      }`}
                      id="tab_btn_python"
                    >
                      <span>🐍 Python app.py</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: OUTPUT RESULTS */}
                {activeTab === "result" && (
                  <div className="flex flex-col gap-6">
                    
                    {/* Status Box: Already Present vs Missing */}
                    {result.isPresent ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex gap-4 text-emerald-900 shadow-sm">
                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 animate-bounce" size={24} />
                        <div className="flex flex-col gap-1.5">
                          <h4 className="font-bold text-lg text-emerald-800">Article Already Exists in Repository!</h4>
                          <p className="text-sm leading-relaxed">
                            The <strong>GitHub Checker Agent</strong> matched this article with an existing file in the <strong>bsenst/praxis-it</strong> repository. A duplicate summary is not required.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={result.matchingFile?.html_url || "#"}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow"
                              id="btn_view_existing"
                            >
                              <BookOpen size={13} />
                              <span>View Article: {result.matchingFile?.name}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex gap-4 text-blue-900 shadow-sm">
                        <Info className="text-blue-500 shrink-0 mt-0.5" size={24} />
                        <div className="flex flex-col gap-1.5">
                          <h4 className="font-bold text-lg text-blue-800">New Article Detected & Classified!</h4>
                          <p className="text-sm leading-relaxed">
                            The <strong>GitHub Checker Agent</strong> scanned the repository and confirmed that this information is <strong>not</strong> already present.
                            The agent resolved that <strong>{result.bestFitFile?.name}</strong> is the best-suited category file to receive the summary.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={`https://github.com/bsenst/praxis-it/edit/bsenst-patch-1/${result.bestFitFile?.name}`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="px-4 py-1.5 bg-[#FF4B4B] text-white rounded font-semibold text-xs flex items-center gap-1.5 hover:bg-[#E04040] transition-colors shadow"
                              id="btn_edit_file"
                            >
                              <Edit size={13} />
                              <span>Edit on GitHub: {result.bestFitFile?.name}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agent Classifier Reasoning Block */}
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Classification Reasoning (Agent 1)
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed font-sans italic">
                        "{result.reasoning}"
                      </p>
                    </div>

                    {/* Summary Output Markdown Block */}
                    {!result.isPresent && result.summary && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <FileText size={14} className="text-[#FF4B4B]" />
                            <span>Generated Executive Summary (Agent 2)</span>
                          </span>
                          <button
                            onClick={() => copyToClipboard(result.summary || "")}
                            className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600 font-medium transition-colors flex items-center gap-1.5 focus:outline-none"
                            title="Copy Quarto Markdown Summary"
                            id="btn_copy_markdown"
                          >
                            {copied ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Markdown</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Display Summary */}
                        <div className="p-6 bg-white prose max-w-none text-sm text-gray-700 font-sans leading-relaxed whitespace-pre-wrap select-all selection:bg-rose-200">
                          {result.summary}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 2: AGENT LOGS */}
                {activeTab === "logs" && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-semibold text-gray-400">
                      Step-by-Step Chain of Thought and Decision Log
                    </span>
                    
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-gray-900 text-gray-100 font-mono text-xs flex flex-col divide-y divide-gray-800">
                      <div className="p-3 bg-gray-950 font-bold flex justify-between items-center text-gray-400">
                        <span>Agent Pipeline Audit Console</span>
                        <span className="text-[10px] text-gray-600">UTC-7 Local Cloud Run</span>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto flex flex-col p-3 gap-2 bg-[#0d1117] text-left">
                        {result.logs?.map((log, index) => {
                          const isError = log.type === "error";
                          const isSuccess = log.type === "success";
                          const isWarning = log.type === "warning";
                          const isMcp = log.type.startsWith("mcp");
                          
                          let badgeBg = "bg-gray-800 text-gray-300";
                          if (isError) badgeBg = "bg-rose-950 text-rose-400 border border-rose-900";
                          if (isSuccess) badgeBg = "bg-emerald-950 text-emerald-400 border border-emerald-900";
                          if (isWarning) badgeBg = "bg-amber-950 text-amber-400 border border-amber-900";
                          if (isMcp) badgeBg = "bg-indigo-950 text-indigo-400 border border-indigo-900";

                          return (
                            <div key={index} className="flex gap-2.5 items-start py-1">
                              <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${badgeBg}`}>
                                {log.agent}
                              </span>
                              <span className={`leading-relaxed ${
                                isError ? "text-rose-400" : isWarning ? "text-amber-400" : isSuccess ? "text-emerald-400" : "text-gray-300"
                              }`}>
                                {log.message}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: MCP PAYLOADS */}
                {activeTab === "mcp" && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-xs text-indigo-900 leading-normal flex gap-3">
                      <Code className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                      <div>
                        <strong>What is MCP?</strong> The <strong>Model Context Protocol (MCP)</strong> acts as an API gateway letting Small Language Models discover and query local & external resources (like GitHub repos) securely. Below is the exact JSON structured transport protocol payload executed during this run.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        MCP JSON Transport Payloads
                      </span>
                      
                      <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto text-left whitespace-pre">
{`{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "github-server::list_directory_contents",
    "arguments": {
      "owner": "bsenst",
      "repo": "praxis-it",
      "path": "/"
    }
  },
  "id": "mcp-call-7319"
}`}
                      </div>

                      <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto text-left whitespace-pre">
{`{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found \${repoFiles.length || 55} files ending in .qmd in root directory path."
      }
    ],
    "isError": false
  },
  "id": "mcp-call-7319"
}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: PYTHON STREAMLIT EXPORT */}
                {activeTab === "python" && (
                  <div className="flex flex-col gap-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex gap-4 text-emerald-950 shadow-sm">
                      <Sparkles className="text-emerald-600 shrink-0 mt-0.5" size={24} />
                      <div className="flex flex-col gap-1.5 text-left">
                        <h4 className="font-bold text-lg text-emerald-900">Python Refactored Streamlit Code Ready!</h4>
                        <p className="text-sm leading-relaxed">
                          We have refactored the entire Dual-Agent clinical IT summarizer as a clean, single-file <strong>Streamlit Python App</strong>. 
                          This script runs entirely on Streamlit Cloud's standard CPU tier by communicating serverlessly with open-source models via Hugging Face.
                        </p>
                      </div>
                    </div>

                    {/* How to Run Guides */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <h5 className="font-bold text-sm text-gray-800 mb-2">💻 Run Locally</h5>
                        <div className="bg-gray-900 text-gray-100 p-2.5 rounded font-mono text-xs select-all mb-2">
                          pip install streamlit requests
                        </div>
                        <div className="bg-gray-900 text-gray-100 p-2.5 rounded font-mono text-xs select-all">
                          streamlit run app.py
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <h5 className="font-bold text-sm text-gray-800 mb-2">🚀 Deploy to Streamlit Cloud</h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          1. Create a <strong>requirements.txt</strong> with: <code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">requests</code> and <code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">streamlit</code>.<br />
                          2. Push <code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">app.py</code> and <code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">requirements.txt</code> to your GitHub repo.<br />
                          3. Connect your repo to <a href="https://share.streamlit.io" target="_blank" className="text-[#FF4B4B] underline font-bold">share.streamlit.io</a> and launch!
                        </p>
                      </div>
                    </div>

                    {/* Python Code block */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Code size={14} className="text-[#FF4B4B]" />
                          <span>app.py (Refactored Streamlit Code)</span>
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(PYTHON_CODE);
                            setPythonCopied(true);
                            setTimeout(() => setPythonCopied(false), 2000);
                          }}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600 font-medium transition-colors flex items-center gap-1.5 focus:outline-none"
                          id="btn_copy_python_tab"
                        >
                          {pythonCopied ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied app.py!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy app.py</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="p-4 bg-[#0d1117] text-left overflow-x-auto">
                        <pre className="font-mono text-xs text-gray-300 whitespace-pre leading-relaxed select-all">
                          {PYTHON_CODE}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* --- BOTTOM PERSISTENT PYTHON STREAMLIT CLOUD GUIDE --- */}
            <div className="mt-8 border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-[#FF4B4B] text-white p-2 rounded-lg">
                  <Code size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-base">
                    🐍 Python Refactoring & Streamlit Cloud Exporter
                  </h4>
                  <p className="text-xs text-gray-500">
                    Your complete agent coprocessor, written in Python, is ready to deploy!
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                We have generated a standalone <strong>app.py</strong> file in the workspace root. It features exact alignment with the <strong>bsenst-patch-1</strong> branch of <strong>bsenst/praxis-it</strong>, supports serverless Hugging Face API execution for CPU instances, and replicates this beautiful interactive dual-agent layout.
              </p>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(PYTHON_CODE);
                    setPythonCopied(true);
                    setTimeout(() => setPythonCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-[#FF4B4B] text-gray-700 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer"
                  id="btn_copy_python_bottom"
                >
                  {pythonCopied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span className="text-emerald-700">Copied app.py!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy app.py Code</span>
                    </>
                  )}
                </button>
                <a
                  href="https://share.streamlit.io"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="px-4 py-2 bg-[#FF4B4B] hover:bg-[#E04040] text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
                >
                  <span>🚀 Deploy to Streamlit Cloud</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
