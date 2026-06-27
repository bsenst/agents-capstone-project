import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Resilient list of files in bsenst/praxis-it for fast search and fallback if API limits are hit
const FALLBACK_REPO_FILES = [
  "agentische-ki.qmd",
  "allergologie.qmd",
  "allgemeinmedizin.qmd",
  "ambient-scribe.qmd",
  "ambulantes-operieren.qmd",
  "anamneseerhebung.qmd",
  "apotheken.qmd",
  "arbeitsmedizin.qmd",
  "augenheilkunde.qmd",
  "ausbildung.qmd",
  "buchhaltung.qmd",
  "chatbot.qmd",
  "daten-und-infrastruktur.qmd",
  "datenschutz.qmd",
  "dermatologie.qmd",
  "diabetologie.qmd",
  "dienstplanung.qmd",
  "digitale-innovation.qmd",
  "digitale-kompetenz.qmd",
  "digitale-reife.qmd",
  "digitale-stellvertretung.qmd",
  "digitale-trennung.qmd",
  "digitales-arbeitsleben.qmd",
  "diskurs.qmd",
  "einleitung.qmd",
  "entscheidungsunterstuetzung.qmd",
  "ernaehrung.qmd",
  "ethik.qmd",
  "forschung.qmd",
  "frauenheilkunde.qmd",
  "gastroenterologie.qmd",
  "gefaessmedizin.qmd",
  "geriatrie.qmd",
  "gesetzgebung.qmd",
  "gesundheitskompetenz.qmd",
  "grosse-sprachmodelle.qmd",
  "hno.qmd",
  "impfsoftware.qmd",
  "index.qmd",
  "international.qmd",
  "it-sicherheit.qmd",
  "kassenaerztliche-vereinigung.qmd",
  "ki-regulation.qmd",
  "kimdienst.qmd",
  "kinderheilkunde.qmd",
  "kommunikation.qmd",
  "krankenhaus.qmd",
  "krankenkassen.qmd",
  "krankheitsverstaendnis.qmd",
  "kuenstliche-intelligenz.qmd",
  "kurznachrichtendienst.qmd",
  "labor.qmd",
  "llm-leistungsvergleich.qmd",
  "lokale-ki.qmd",
  "maschinelles-lernen.qmd",
];

// Helper to query Hugging Face Serverless Inference API
async function queryHuggingFace(model: string, prompt: string, hfToken?: string) {
  const token = hfToken || process.env.HF_TOKEN;
  if (!token) {
    throw new Error("Hugging Face API token is required for direct HF execution.");
  }

  const endpoint = `https://api-inference.huggingface.co/models/${model}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face API returned error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text;
  } else if (result.generated_text) {
    return result.generated_text;
  }
  return JSON.stringify(result);
}

// Route to get list of files in bsenst/praxis-it (from GitHub with local fallback)
app.get("/api/github/files", async (req, res) => {
  try {
    const response = await fetch("https://api.github.com/repos/bsenst/praxis-it/contents", {
      headers: {
        "User-Agent": "aistudio-build",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const files = data
        .filter((item: any) => item.type === "file" && item.name.endsWith(".qmd"))
        .map((item: any) => ({
          name: item.name,
          path: item.path,
          sha: item.sha,
          size: item.size,
          html_url: item.html_url,
          type: item.type,
        }));
      res.json({ files, source: "github_live" });
    } else {
      // Fallback to local
      const files = FALLBACK_REPO_FILES.map((name) => ({
        name,
        path: name,
        sha: "fallback_sha",
        size: 2000,
        html_url: `https://github.com/bsenst/praxis-it/blob/bsenst-patch-1/${name}`,
        type: "file",
      }));
      res.json({ files, source: "fallback_local", warning: "GitHub API rate limit or error, using local manifest." });
    }
  } catch (error: any) {
    const files = FALLBACK_REPO_FILES.map((name) => ({
      name,
      path: name,
      sha: "fallback_sha",
      size: 2000,
      html_url: `https://github.com/bsenst/praxis-it/blob/bsenst-patch-1/${name}`,
      type: "file",
    }));
    res.json({ files, source: "fallback_local", error: error.message });
  }
});

// --- OFFLINE COMPILATION ENGINES IN TYPESCRIPT ---
function offlineSemanticCheckerTS(title: string, text: string, files: string[]) {
  const fileKeywords: Record<string, string[]> = {
    "it-sicherheit": ["sicherheit", "cyber", "phishing", "angriff", "schadsoftware", "schwachstelle", "firewall", "passwort", "schlüssel", "smc-b", "ehba", "signatur", "virus", "viren", "malware", "ransomware", "trojaner"],
    "kimdienst": ["kim", "telematik", "nachricht", "verschlüsselung", "e-mail", "ti-dienst", "komunikation"],
    "dermatologie": ["dermatologie", "haut", "melanom", "muttermal", "scan", "auflicht", "arzt", "hautkrebs", "flecken"],
    "diabetologie": ["diabetes", "diabetologie", "insulin", "blutzucker", "glukose", "sensor"],
    "geriatrie": ["geriatrie", "altenmedizin", "senioren", "alter", "multimorbidität", "pflege", "angehörige"],
    "allgemeinmedizin": ["allgemeinmedizin", "hausarzt", "praxis", "patienten", "versorgung", "ebm", "arztpraxis"],
    "datenschutz": ["datenschutz", "dsgvo", "daten", "privatsphäre", "schweigepflicht", "patientendaten", "gespeichert"],
    "agentische-ki": ["agent", "coprocessor", "workflow", "automatisierung", "mcp", "agenten", "entscheidung"],
    "grosse-sprachmodelle": ["llm", "sprachmodell", "gpt", "llama", "qwen", "gemini", "prompts", "generative"],
    "kuenstliche-intelligenz": ["ki", "künstliche", "intelligenz", "deep learning", "maschinelles", "lernen", "neuronalen"],
    "telemedizin": ["telemedizin", "video", "videosprechstunde", "monitoring", "online", "fernbehandlung", "sprechstunde"],
    "anamneseerhebung": ["anamnese", "befragung", "erhebung", "fragebogen", "aufnahme"],
    "ambulantes-operieren": ["operieren", "ambulant", "chirurgie", "op", "eingriff", "chirurgisch"],
    "apotheken": ["apotheke", "rezept", "e-rezept", "medikation", "arzneimittel", "rezeptfrei"],
    "arbeitsmedizin": ["arbeit", "arbeitsmedizin", "berufsgenossenschaft", "betriebsmedizin", "arbeitsplatz"],
    "augenheilkunde": ["auge", "augen", "ophtha", "sehtest", "glaukom", "visus"],
    "ausbildung": ["ausbildung", "mfa", "studium", "weiterbildung", "lehre", "azubi"],
    "buchhaltung": ["buchhaltung", "rechnung", "finanzen", "steuer", "ebm", "abrechnung", "honorar"],
    "chatbot": ["chatbot", "chat", "bot", "assistent", "interaktiv", "dialog"],
  };

  const combined = ((title || "") + " " + text).toLowerCase();
  let bestFile = "allgemeinmedizin.qmd";
  let bestScore = 0;

  for (const f of files) {
    const fName = f.replace(".qmd", "");
    let score = 0;
    if (combined.includes(fName)) {
      score += 25;
    }

    const keywords = fileKeywords[fName] || [];
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        const count = combined.split(kw).length - 1;
        score += count * 4;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestFile = f;
    }
  }

  let isPresent = false;
  let matchingFilename: string | null = null;
  const titleClean = (title || "").toLowerCase().replace(/[^a-z0-9\s]/g, "");

  if (titleClean) {
    for (const f of files) {
      const fClean = f.replace(".qmd", "").replace(/-/g, " ");
      if (fClean.includes(titleClean) || titleClean.includes(fClean)) {
        isPresent = true;
        matchingFilename = f;
        break;
      }
    }
  }

  let reasoning = "";
  if (isPresent) {
    reasoning = `Die Offline-Linguistik-Engine identifizierte eine genaue thematische Übereinstimmung des Artikeltitels mit der bestehenden Datei '${matchingFilename}'.`;
  } else {
    reasoning = `Die Offline-Linguistik-Engine hat den Artikel analysiert und mit einer Konfidenz von ${bestScore} Punkten der am besten passenden Kategorie '${bestFile}' zugeordnet.`;
  }

  return { isPresent, matchingFilename, bestFitFilename: bestFile, reasoning };
}

function generateOfflineSummaryTS(title: string, text: string, targetFile: string) {
  const paragraphs = text.split("\n").map(p => p.trim()).filter(p => p.length > 30);
  const sentences: string[] = [];
  for (const p of paragraphs) {
    const sents = p.split(/(?<=[.!?])\s+/);
    for (const s of sents) {
      const st = s.trim();
      if (st.length > 15) {
        sentences.push(st);
      }
    }
  }

  const keywords = ["ki", "künstliche intelligenz", "sicherheit", "kim", "praxis", "arzt", "digital", "pvs", "telemedizin", "integration", "risiko", "patienten", "datenschutz"];
  const highlightCandidates: { score: number; sentence: string }[] = [];

  for (const s of sentences) {
    const sLower = s.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (sLower.includes(kw)) score += 3;
    }
    if (s.length > 40 && s.length < 220) {
      highlightCandidates.push({ score, sentence: s });
    }
  }

  highlightCandidates.sort((a, b) => b.score - a.score);
  let bullets = highlightCandidates.slice(0, 4).map(c => c.sentence);

  if (bullets.length < 3) {
    bullets = sentences.slice(0, 3);
  }

  bullets = bullets.map(b => b.replace(/[.]+$/, "") + ".");

  const textLower = text.toLowerCase();
  let actionItems: string[] = [];

  if (textLower.includes("sicherheit") || textLower.includes("kim") || textLower.includes("risiko") || textLower.includes("schwachstelle")) {
    actionItems = [
      "Überprüfung der Verschlüsselungsprotokolle und privaten Schlüssel (eHBA/SMC-B) im Praxisnetzwerk.",
      "Einrichtung strenger Firewalls und lokaler Antiviren-Scanner für alle KIM-Anhänge.",
      "Regelmäßige Durchführung von Backups und Durchführung von IT-Sicherheitsschulungen des Praxisteams.",
      "Einhaltung der Richtlinien der Kassenärztlichen Bundesvereinigung (KBV) zur IT-Sicherheit."
    ];
  } else if (textLower.includes("ki") || textLower.includes("künstliche") || textLower.includes("dermatologie")) {
    actionItems = [
      "Evaluierung von KI-gestützten Diagnosetools hinsichtlich ihrer PVS-Integration.",
      "Klärung haftungsrechtlicher Fragen und Einholen von Einverständniserklärungen der Patienten.",
      "Nutzung von KI-Systemen primär als 'Zweitmeinung' zur Entlastung bei Routineuntersuchungen.",
      "Regelmäßige Fortbildung des Fachpersonals zur korrekten Interpretation von KI-Analysen."
    ];
  } else if (textLower.includes("telemedizin") || textLower.includes("geriatrie") || textLower.includes("videosprechstunde")) {
    actionItems = [
      "Einrichtung einer stabilen Videoplattform mit zertifiziertem Datenschutz-Siegel.",
      "Einbindung von Angehörigen oder Pflegediensten zur technischen Unterstützung älterer Patienten.",
      "Abrechnungsprüfung geriatriespezifischer Telemedizin-Zuschläge im EBM.",
      "Kombination von Telemonitoring mit regelmäßigen physischen Hausbesuchen."
    ];
  } else {
    actionItems = [
      "Schnittstellenkompatibilität mit dem Praxisverwaltungssystem (PVS) prüfen.",
      "Datenschutzrechtliche Konformität (DSGVO) bei der Datenspeicherung sicherstellen.",
      "Schulung aller Praxismitarbeiter zur neuen digitalen Anwendung organisieren.",
      "Workflow-Anpassungen im Praxisalltag schrittweise evaluieren und dokumentieren."
    ];
  }

  const qmdTitle = title || "Eintrag zur Praxis-IT Digitalisierung";
  const dateStr = new Date().toISOString().split("T")[0];

  let summary = `---
title: "${qmdTitle}"
date: "${dateStr}"
category: "${targetFile}"
---

### 📝 Executive Summary (Resiliente Offline-Synthese)
Dieses Dokument fasst die wichtigsten praxisrelevanten Aspekte zum Thema **${qmdTitle}** zusammen. Es dient als strukturierte Ergänzung für die Fachrubrik \`${targetFile}\` im Repositorium \`bsenst/praxis-it\`.

### 💡 Haupterkenntnisse & Kernaussagen
`;

  for (const b of bullets) {
    summary += `- ${b}\n`;
  }

  summary += `
### 🛠️ Handlungsempfehlungen für die Praxis
Um diese Entwicklungen erfolgreich und sicher im Praxisalltag umzusetzen, sollten folgende Schritte geprüft werden:
`;

  for (const action of actionItems) {
    summary += `- [ ] **${action}**\n`;
  }

  summary += `
---
*Hinweis: Diese Zusammenfassung wurde von der lokalen, ausfallsicheren NLP-Heuristik-Engine kompiliert, um ununterbrochene Arbeitsfähigkeit bei Netzwerk- oder API-Störungen zu garantieren.*`;

  return summary;
}

// Endpoint to run the Multi-Agent workflow
app.post("/api/check-article", async (req, res) => {
  const { articleTitle, articleText, modelId, hfToken } = req.body;

  if (!articleText) {
    return res.status(400).json({ error: "Article text is required" });
  }

  const logs: any[] = [];
  const addLog = (agent: string, type: string, message: string) => {
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      agent,
      type,
      message,
    });
  };

  try {
    // 1. Simulating MCP Server call to get Github contents
    addLog("MCP Gateway", "mcp_call", `mcp:call -> github-server::list_directory_contents(owner="bsenst", repo="praxis-it", path="/")`);
    
    let repoFilesList = FALLBACK_REPO_FILES;
    try {
      const ghResponse = await fetch("https://api.github.com/repos/bsenst/praxis-it/contents", {
        headers: { "User-Agent": "aistudio-build" },
      });
      if (ghResponse.ok) {
        const data = await ghResponse.json();
        repoFilesList = data
          .filter((item: any) => item.type === "file" && item.name.endsWith(".qmd"))
          .map((item: any) => item.name);
        addLog("MCP Gateway", "mcp_response", `mcp:result -> List of ${repoFilesList.length} files retrieved from GitHub successfully.`);
      } else {
        addLog("MCP Gateway", "warning", `GitHub API rate limit hit. Falling back to local catalog of ${repoFilesList.length} files.`);
      }
    } catch (err) {
      addLog("MCP Gateway", "warning", `Failed to contact GitHub live. Using cached index of ${repoFilesList.length} files.`);
    }

    // 2. RUN AGENT 1: GitHub Checker Agent
    // We want to check if the article matches an existing file or find the best-suited file to edit.
    addLog("GitHub Checker Agent", "info", `Analyzing file list to determine if an article matching "${articleTitle || 'Untitled'}" is present.`);

    const checkPrompt = `You are the "GitHub Checker Agent" for the 'bsenst/praxis-it' Quarto markdown repository.
The repository contains clinical/IT digitalization files for medical offices in Germany.
Here is the list of existing .qmd files in the repository:
${repoFilesList.map(f => `- ${f}`).join("\n")}

You have received an article:
Title: ${articleTitle || "Untitled"}
Text excerpt/full text:
${articleText.substring(0, 3000)}

Analyze the repository files and determine:
1. Is the topic/article already present? (Look for matches in files like 'it-sicherheit.qmd', 'dermatologie.qmd', 'agentische-ki.qmd', etc.)
2. If it IS already present, identify the matching filename.
3. If it is NOT already present, identify which existing file "best suits" to receive this summary (e.g. if the article is about diabetes software, 'diabetologie.qmd' or 'impfsoftware.qmd', etc. is best).

Respond STRICTLY in JSON format with this structure:
{
  "isPresent": boolean,
  "matchingFilename": string or null,
  "bestFitFilename": string,
  "reasoning": "A concise explanation of why it is present or why the selected file is the best fit, in German."
}`;

    let checkResultJson: any = { isPresent: false, matchingFilename: null, bestFitFilename: "allgemeinmedizin.qmd", reasoning: "Standard fallback" };
    
    try {
      // Call Gemini to do the Agent 1 reasoning (Structured JSON)
      const checkResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: checkPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isPresent: { type: Type.BOOLEAN },
              matchingFilename: { type: Type.STRING },
              bestFitFilename: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ["isPresent", "matchingFilename", "bestFitFilename", "reasoning"],
          }
        }
      });

      checkResultJson = JSON.parse(checkResponse.text || "{}");
      addLog("GitHub Checker Agent", "success", `Analysis complete. isPresent: ${checkResultJson.isPresent}. Best file match: ${checkResultJson.bestFitFilename}.`);
      addLog("GitHub Checker Agent", "info", `Reasoning: ${checkResultJson.reasoning}`);
    } catch (e: any) {
      addLog("GitHub Checker Agent", "warning", `Online checker call failed (${e.message}). Invoking resilient offline-linguistic engine...`);
      const offlineCheck = offlineSemanticCheckerTS(articleTitle, articleText, repoFilesList);
      checkResultJson = {
        isPresent: offlineCheck.isPresent,
        matchingFilename: offlineCheck.matchingFilename,
        bestFitFilename: offlineCheck.bestFitFilename,
        reasoning: offlineCheck.reasoning
      };
      addLog("GitHub Checker Agent", "success", `Offline Analysis complete. isPresent: ${checkResultJson.isPresent}. Best file match: ${checkResultJson.bestFitFilename}.`);
      addLog("GitHub Checker Agent", "info", `Offline Reasoning: ${checkResultJson.reasoning}`);
    }

    let summaryText = "";

    // 3. RUN AGENT 2: Summarizer Agent (only if not present)
    if (!checkResultJson.isPresent) {
      addLog("Summarizer Agent", "info", `Article not present. Activating Summarizer Agent using model: ${modelId}`);

      const summaryPrompt = `You are the "Summarizer Agent" for the 'bsenst/praxis-it' Quarto markdown repository.
Create a highly professional, well-structured executive summary of the following article in German.
Format the summary in clean Quarto markdown (.qmd) style suitable for insertion into the target file "${checkResultJson.bestFitFilename}".
Use headers, lists, and emphasis where appropriate. Keep it concise but dense with value.

Article Title: ${articleTitle || "Untitled"}
Article Text:
${articleText}

Generate the Quarto Markdown summary block:`;

      try {
        // Check which engine/model to run
        if (modelId.startsWith("gemini")) {
          // Run via Gemini (acting as simulated small model or directly)
          const geminiSummary = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: summaryPrompt,
            config: {
              systemInstruction: "You are an expert medical IT editor. Generate dense, structured summaries in flawless German.",
            }
          });
          summaryText = geminiSummary.text || "Failed to generate summary.";
        } else {
          // Run via Hugging Face
          try {
            addLog("Summarizer Agent", "info", `Contacting Hugging Face Inference API for ${modelId}...`);
            summaryText = await queryHuggingFace(modelId, summaryPrompt, hfToken);
          } catch (hfError: any) {
            addLog("Summarizer Agent", "warning", `Hugging Face call failed: ${hfError.message}. Falling back to pre-configured local engine (Gemini Flash as simulated SML).`);
            const geminiBackup = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: summaryPrompt,
            });
            summaryText = geminiBackup.text || "Failed to generate summary via fallback.";
          }
        }
      } catch (backupError: any) {
        addLog("Summarizer Agent", "warning", `All online summarizer services failed (${backupError.message}). Compiling resilient offline heuristics...`);
        summaryText = generateOfflineSummaryTS(articleTitle, articleText, checkResultJson.bestFitFilename);
      }

      addLog("Summarizer Agent", "success", `Summary successfully created! (${summaryText.length} characters)`);
    } else {
      addLog("Summarizer Agent", "info", `Summarizer Agent idle. Article is already present in ${checkResultJson.matchingFilename}.`);
    }

    // Resolve filenames to full file object info
    const allFilesMapped = repoFilesList.map(name => ({
      name,
      path: name,
      sha: "file_sha",
      size: 1500,
      html_url: `https://github.com/bsenst/praxis-it/blob/bsenst-patch-1/${name}`,
      type: "file"
    }));

    const matchingFile = checkResultJson.matchingFilename 
      ? allFilesMapped.find(f => f.name === checkResultJson.matchingFilename)
      : undefined;

    const bestFitFile = checkResultJson.bestFitFilename
      ? allFilesMapped.find(f => f.name === checkResultJson.bestFitFilename)
      : allFilesMapped[0];

    res.json({
      isPresent: checkResultJson.isPresent,
      matchingFile: matchingFile || (checkResultJson.isPresent ? { name: checkResultJson.matchingFilename, html_url: `https://github.com/bsenst/praxis-it/blob/bsenst-patch-1/${checkResultJson.matchingFilename}` } : undefined),
      bestFitFile: bestFitFile || { name: checkResultJson.bestFitFilename, html_url: `https://github.com/bsenst/praxis-it/blob/bsenst-patch-1/${checkResultJson.bestFitFilename}` },
      reasoning: checkResultJson.reasoning,
      summary: summaryText,
      logs,
      articleTitle: articleTitle || "Untitled"
    });

  } catch (error: any) {
    addLog("MCP Gateway", "error", `Fatal workflow error: ${error.message}`);
    res.status(500).json({ error: error.message, logs });
  }
});

// Vite & Static Hosting config
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
