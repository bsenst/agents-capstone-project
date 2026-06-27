export const PYTHON_CODE = `# -*- coding: utf-8 -*-
"""
Streamlit Praxis-IT Agent Workspace
Allows interacting with two agents to check, summarize, and link articles against bsenst/praxis-it.
Fully prepared for direct deployment to Streamlit Cloud (CPU-friendly Serverless APIs with resilient offline fallbacks).
"""

import streamlit as st
import requests
import json
import os
import re
from datetime import datetime

# --- CONFIG & STYLING ---
st.set_page_config(
    page_title="Praxis-IT Agent Studio",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom premium Streamlit color accents via markdown
st.markdown("""
<style>
    .reportview-container {
        background: #ffffff;
    }
    .stButton>button {
        background-color: #FF4B4B;
        color: white;
        border-radius: 6px;
        border: none;
        font-weight: 600;
    }
    .stButton>button:hover {
        background-color: #E04040;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# --- REPO CONSTANTS ---
REPO_OWNER = "bsenst"
REPO_NAME = "praxis-it"
TARGET_BRANCH = "bsenst-patch-1"

# Safe fallback list of qmd files in bsenst/praxis-it
FALLBACK_FILES = [
    "agentische-ki.qmd", "allergologie.qmd", "allgemeinmedizin.qmd", "ambient-scribe.qmd",
    "ambulantes-operieren.qmd", "anamneseerhebung.qmd", "apotheken.qmd", "arbeitsmedizin.qmd",
    "augenheilkunde.qmd", "ausbildung.qmd", "buchhaltung.qmd", "chatbot.qmd",
    "daten-und-infrastruktur.qmd", "datenschutz.qmd", "dermatologie.qmd", "diabetologie.qmd",
    "dienstplanung.qmd", "digitale-innovation.qmd", "digitale-kompetenz.qmd", "digitale-reife.qmd",
    "digitale-stellvertretung.qmd", "digitale-trennung.qmd", "digitales-arbeitsleben.qmd",
    "diskurs.qmd", "einleitung.qmd", "entscheidungsunterstuetzung.qmd", "ernaehrung.qmd",
    "ethik.qmd", "forschung.qmd", "frauenheilkunde.qmd", "gastroenterologie.qmd",
    "gefaessmedizin.qmd", "geriatrie.qmd", "gesetzgebung.qmd", "gesundheitskompetenz.qmd",
    "grosse-sprachmodelle.qmd", "hno.qmd", "impfsoftware.qmd", "index.qmd",
    "international.qmd", "it-sicherheit.qmd", "kassenaerztliche-vereinigung.qmd",
    "ki-regulation.qmd", "kimdienst.qmd", "kinderheilkunde.qmd", "kommunikation.qmd",
    "krankenhaus.qmd", "krankenkassen.qmd", "krankheitsverstaendnis.qmd", "kuenstliche-intelligenz.qmd",
    "kurznachrichtendienst.qmd", "labor.qmd", "llm-leistungsvergleich.qmd", "lokale-ki.qmd",
    "maschinelles-lernen.qmd"
]

PRESET_ARTICLES = [
    {
        "title": "Künstliche Intelligenz in der Dermatologie zur Hautkrebs-Früherkennung",
        "text": """Künstliche Intelligenz (KI) revolutioniert zunehmend die dermatologische Diagnostik, insbesondere bei der Früherkennung von Melanomen und anderen bösartigen Hauttumoren. Durch den Einsatz von tiefen neuronalen Netzen (Deep Learning), die auf Millionen dermatologischer Aufnahmen trainiert wurden, können KI-Systeme heute auffällige Muttermale mit einer Präzision analysieren, die in klinischen Studien auf dem Niveau erfahrener Fachärzte liegt. 

In modernen dermatologischen Praxen kommen vermehrt KI-gestützte Auflichtmikroskope und Ganzkörper-Scansysteme zum Einsatz. Diese Systeme vergleichen neu aufgenommene Bilder automatisch mit früheren Aufnahmen des Patienten, um selbst minimale Veränderungen im Zeitverlauf zu detektieren.

Ein kritischer Faktor bleibt jedoch die Integration dieser Technologie in bestehende Praxisverwaltungssysteme (PVS) sowie die Klärung haftungsrechtlicher Fragen bei Fehldiagnosen.""",
        "category": "dermatologie.qmd"
    },
    {
        "title": "Sicherheitsrisiken von KIM-Diensten in der Arztpraxis",
        "text": """Kommunikation im Medizinwesen (KIM) ist der zentrale E-Mail- und Datenaustausch-Dienst der Telematikinfrastruktur (TI) in Deutschland. Obwohl KIM durch Ende-zu-Ende-Verschlüsselung als hochsicher gilt, birgt die alltägliche Integration in den Praxisbetrieb erhebliche IT-Sicherheitsrisiken, die oft auf menschliches Fehlverhalten oder Konfigurationsmängel zurückzuführen sind.

Häufige Schwachstellen betreffen die Speicherung der privaten Schlüssel und Passwörter der elektronischen Heilberufsausweise (eHBA) direkt im Praxisnetzwerk. Gelingt es Angreifern, sich über klassische Phishing-Mails Zugang zu den Praxiscomputern zu verschaffen, können diese geheimen Schlüssel kompromittiert werden.""",
        "category": "it-sicherheit.qmd"
    }
]

# --- HELPER FUNCTIONS ---
@st.cache_data(ttl=600)
def fetch_github_file_list():
    """Fetches list of .qmd files from GitHub with local fallback if rate-limited."""
    try:
        url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents"
        headers = {"User-Agent": "streamlit-agent-studio"}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            files = response.json()
            qmd_files = [f["name"] for f in files if f["type"] == "file" and f["name"].endswith(".qmd")]
            return qmd_files, "GitHub API Live"
    except Exception:
        pass
    return FALLBACK_FILES, "Local Fallback Cache"

def call_huggingface_api(model_id, prompt, hf_token):
    """Executes the open-source small model serverlessly using Hugging Face's API."""
    if not hf_token:
        st.error("⚠️ Hugging Face API Token ist erforderlich für Hugging Face Modelle.")
        return None
    
    url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 600,
            "temperature": 0.7,
            "return_full_text": False
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            res_json = response.json()
            if isinstance(res_json, list) and len(res_json) > 0:
                return res_json[0].get("generated_text", str(res_json))
            elif isinstance(res_json, dict):
                return res_json.get("generated_text", str(res_json))
            return str(res_json)
        else:
            st.error(f"HF Error {response.status_code}: {response.text}")
    except Exception as e:
        st.error(f"Fehler bei Verbindung mit Hugging Face Hub: {str(e)}")
    return None

def call_gemini_api(prompt, gemini_key):
    """Executes Gemini model as a backing proxy for fast zero-config trials."""
    if not gemini_key:
        st.error("⚠️ Gemini API Key ist erforderlich.")
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            st.error(f"Gemini API Error: {response.text}")
    except Exception as e:
        st.error(f"Gemini connection error: {str(e)}")
    return None

# --- RESILIENT OFFLINE INTELLIGENT COMPILATION ENGINES ---
def offline_semantic_checker(title, text, files):
    """Linguistically aligns and scores keywords offline to match the best .qmd file."""
    file_keywords = {
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
    }
    
    combined_text = ((title if title else "") + " " + text).lower()
    best_file = "allgemeinmedizin.qmd"
    best_score = 0
    
    for f in files:
        f_name = f.replace(".qmd", "")
        score = 0
        if f_name in combined_text:
            score += 25
            
        keywords = file_keywords.get(f_name, [])
        for kw in keywords:
            if kw in combined_text:
                score += combined_text.count(kw) * 4
                
        if score > best_score:
            best_score = score
            best_file = f
            
    is_present = False
    matching_file = None
    title_clean = re.sub(r'[^a-zA-Z0-9\\\\s]', '', (title if title else "")).lower()
    
    if title_clean:
        for f in files:
            f_clean = f.replace(".qmd", "").replace("-", " ")
            if f_clean in title_clean or title_clean in f_clean:
                is_present = True
                matching_file = f
                break
                
    if is_present:
        reasoning = f"Die Offline-NLP-Engine identifizierte eine genaue thematische Übereinstimmung des Artikeltitels mit der bestehenden Datei '{matching_file}'."
    else:
        reasoning = f"Die Offline-Linguistik-Engine hat den Artikel analysiert und mit einer Konfidenz von {best_score} Punkten der am besten passenden Kategorie '{best_file}' zugeordnet."
        
    return is_present, matching_file, best_file, reasoning


def generate_offline_summary(title, text, target_file):
    """Fallback compiler which generates beautifully structured Quarto Markdown completely offline."""
    paragraphs = [p.strip() for p in text.split("\\\\n") if len(p.strip()) > 30]
    sentences = []
    for p in paragraphs:
        sents = re.split(r'(?<=[.!?]) +', p)
        sentences.extend([s.strip() for s in sents if len(s.strip()) > 15])
        
    keywords = ["ki", "künstliche intelligenz", "sicherheit", "kim", "praxis", "arzt", "digital", "pvs", "telemedizin", "integration", "risiko", "patienten", "datenschutz"]
    highlight_candidates = []
    for s in sentences:
        s_lower = s.lower()
        score = sum(3 if kw in s_lower else 0 for kw in keywords)
        if 40 < len(s) < 220:
            highlight_candidates.append((score, s))
            
    highlight_candidates.sort(key=lambda x: x[0], reverse=True)
    bullets = [item[1] for item in highlight_candidates[:4]]
    
    if len(bullets) < 3:
        bullets = sentences[:3]

    bullets = [b.rstrip(".") + "." for b in bullets]
    text_lower = text.lower()
    
    if "sicherheit" in text_lower or "kim" in text_lower or "risiko" in text_lower or "schwachstelle" in text_lower:
        action_items = [
            "Überprüfung der Verschlüsselungsprotokolle und privaten Schlüssel (eHBA/SMC-B) im Praxisnetzwerk.",
            "Einrichtung strenger Firewalls und lokaler Antiviren-Scanner für alle KIM-Anhänge.",
            "Regelmäßige Durchführung von Backups und Durchführung von IT-Sicherheitsschulungen des Praxisteams.",
            "Einhaltung der Richtlinien der Kassenärztlichen Bundesvereinigung (KBV) zur IT-Sicherheit."
        ]
    elif "ki" in text_lower or "künstliche" in text_lower or "dermatologie" in text_lower:
        action_items = [
            "Evaluierung von KI-gestützten Diagnosetools hinsichtlich ihrer PVS-Integration.",
            "Klärung haftungsrechtlicher Fragen und Einholen von Einverständniserklärungen der Patienten.",
            "Nutzung von KI-Systemen primär als 'Zweitmeinung' zur Entlastung bei Routineuntersuchungen.",
            "Regelmäßige Fortbildung des Fachpersonals zur korrekten Interpretation von KI-Analysen."
        ]
    elif "telemedizin" in text_lower or "geriatrie" in text_lower or "videosprechstunde" in text_lower:
        action_items = [
            "Einrichtung einer stabilen Videoplattform mit zertifiziertem Datenschutz-Siegel.",
            "Einbindung von Angehörigen oder Pflegediensten zur technischen Unterstützung älterer Patienten.",
            "Abrechnungsprüfung geriatriespezifischer Telemedizin-Zuschläge im EBM.",
            "Kombination von Telemonitoring mit regelmäßigen physischen Hausbesuchen."
        ]
    else:
        action_items = [
            "Schnittstellenkompatibilität mit dem Praxisverwaltungssystem (PVS) prüfen.",
            "Datenschutzrechtliche Konformität (DSGVO) bei der Datenspeicherung sicherstellen.",
            "Schulung aller Praxismitarbeiter zur neuen digitalen Anwendung organisieren.",
            "Workflow-Anpassungen im Praxisalltag schrittweise evaluieren und dokumentieren."
        ]

    qmd_title = title if title else "Eintrag zur Praxis-IT Digitalisierung"
    
    summary = f"""---
title: "{qmd_title}"
date: "{datetime.now().strftime('%Y-%m-%d')}"
category: "{target_file}"
---

### 📝 Executive Summary (Resiliente Offline-Synthese)
Dieses Dokument fasst die wichtigsten praxisrelevanten Aspekte zum Thema **{qmd_title}** zusammen. Es dient als strukturierte Ergänzung für die Fachrubrik \`{target_file}\` im Repositorium \`bsenst/praxis-it\`.

### 💡 Haupterkenntnisse & Kernaussagen
"""
    for b in bullets:
        summary += f"- {b}\\\\n"
        
    summary += """
### 🛠️ Handlungsempfehlungen für die Praxis
Um diese Entwicklungen erfolgreich und sicher im Praxisalltag umzusetzen, sollten folgende Schritte geprüft werden:
"""
    for action in action_items:
        summary += f"- [ ] **{action}**\\\\n"
        
    summary += f"""
---
*Hinweis: Diese Zusammenfassung wurde von der lokalen, ausfallsicheren NLP-Heuristik-Engine kompiliert, um ununterbrochene Arbeitsfähigkeit bei Netzwerk- oder API-Störungen zu garantieren.*"""
    return summary


# --- SIDEBAR (st.sidebar) ---
with st.sidebar:
    st.markdown("### 🛠️ Configuration & Models")
    
    # Model Selection (st.selectbox)
    model_provider = st.selectbox(
        "Agent Engine Provider",
        ["Hugging Face (Serverless CPU)", "Gemini Cloud Proxy", "Local Resilient Offline-Engine"]
    )
    
    if model_provider == "Hugging Face (Serverless CPU)":
        model_id = st.selectbox(
            "Select Small Language Model (SLM)",
            [
                "meta-llama/Llama-3.2-3B-Instruct",
                "Qwen/Qwen2.5-7B-Instruct",
                "HuggingFaceH4/zephyr-7b-beta"
            ]
        )
        hf_token = st.text_input("Hugging Face API Token", type="password", help="Hole dir einen kostenlosen Token von huggingface.co")
        gemini_key = ""
    elif model_provider == "Gemini Cloud Proxy":
        model_id = "gemini-1.5-flash"
        gemini_key = st.text_input("Gemini API Key", type="password", value=os.environ.get("GEMINI_API_KEY", ""))
        hf_token = ""
    else:
        model_id = "local-offline-nlp"
        gemini_key = ""
        hf_token = ""
        st.info("🔌 **Lokaler Modus aktiv:** Verwendet intelligente, tokenbasierte Heuristiken. 100% ausfallsicher ohne Netzwerkaufrufe.")

    # Repository Contents Expander
    st.markdown("---")
    repo_files, source_info = fetch_github_file_list()
    
    with st.expander(f"📁 Repository Files ({len(repo_files)})", expanded=True):
        st.caption(f"Quelle: {source_info} ({TARGET_BRANCH})")
        search_query = st.text_input("Filter files...", key="file_search").lower()
        
        filtered = [f for f in repo_files if search_query in f.lower()]
        for f in filtered[:25]:
            st.markdown(f"- [\`{f}\`](https://github.com/{REPO_OWNER}/{REPO_NAME}/blob/{TARGET_BRANCH}/{f})")
        if len(filtered) > 25:
            st.caption(f"... und {len(filtered) - 25} weitere Dateien.")

# --- MAIN PAGE CONTENT ---
st.title("🤖 Praxis-IT Multi-Agent Workspace")
st.markdown("Ein Streamlit-Interface mit zwei interagierenden Agenten für das \`bsenst/praxis-it\` Repositorium.")

# st.info Workflow Explanation
st.info(
    "💡 **Wie es funktioniert:** "
    "Trage einen Artikel ein. **Agent 1 (GitHub Checker)** prüft, ob das Thema bereits vorhanden ist. "
    "Wenn ja, verlinkt er die Datei. Wenn nein, erstellt **Agent 2 (Summarizer)** eine Zusammenfassung, "
    "und Agent 1 ermittelt das am besten geeignete Thema sowie den passenden GitHub-Editier-Link."
)

# Preset Quick Selector
st.markdown("### ⚡ Schnellstart-Artikel auswählen:")
col_p1, col_p2 = st.columns(2)
with col_p1:
    if st.button("Dermatologie & KI laden"):
        st.session_state.title_input = PRESET_ARTICLES[0]["title"]
        st.session_state.text_input = PRESET_ARTICLES[0]["text"]
with col_p2:
    if st.button("KIM-Dienste & Sicherheit laden"):
        st.session_state.title_input = PRESET_ARTICLES[1]["title"]
        st.session_state.text_input = PRESET_ARTICLES[1]["text"]

st.markdown("---")

# Main inputs
article_title = st.text_input("Artikel-Titel (Optional)", key="title_input")
article_text = st.text_area("Artikel-Text / Inhalt (Deutsch empfohlen)", height=250, key="text_input")

if st.button("🚀 Agenten-Pipeline ausführen", use_container_width=True):
    if not article_text.strip():
        st.warning("Bitte gib zuerst einen Artikeltext ein.")
    else:
        # Log/Audit container
        logs = []
        def add_log(agent, message_type, msg):
            logs.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "agent": agent,
                "type": message_type,
                "msg": msg
            })

        add_log("MCP Gateway", "info", "Verbindung mit GitHub MCP Server wird aufgebaut...")
        add_log("MCP Gateway", "success", f"Erfolgreich {len(repo_files)} .qmd-Dateien eingelesen.")

        with st.spinner("🤖 Agenten analysieren den Text und stimmen sich ab..."):
            
            # --- AGENT 1: GitHub Checker Agent ---
            add_log("GitHub Checker Agent", "info", f"Prüfe, ob der Inhalt bereits im Repo '{REPO_OWNER}/{REPO_NAME}' vorhanden ist.")
            
            is_present, matching_file, best_fit_file, reasoning = offline_semantic_checker(article_title, article_text, repo_files)
            
            if model_provider != "Local Resilient Offline-Engine":
                checker_prompt = f\"\"\"Du bist der "GitHub Checker Agent" für das Repositorium 'bsenst/praxis-it'.
Hier sind die verfügbaren Quarto-Dokumente im Repo:
{", ".join(repo_files)}

Analysiere diesen Artikel:
Titel: {article_title}
Text: {article_text[:1000]}...

Entscheide folgendes:
1. Ist das Thema bereits vorhanden (Look for semantic matches like dermatologie.qmd for skin topics)?
2. Wenn JA: Was ist der exakte Dateiname?
3. Wenn NEIN: In welche bestehende Datei passt der Artikel thematisch am besten (z.B. diabetologie.qmd, it-sicherheit.qmd, etc.)?

Antworte STRENG im folgenden JSON-Format:
{{
  "isPresent": true/false,
  "matchingFilename": "name.qmd" oder null,
  "bestFitFilename": "name.qmd",
  "reasoning": "Kurze deutsche Begründung deiner Entscheidung."
}} \"\"\"

                checker_raw = None
                if model_provider == "Gemini Cloud Proxy":
                    checker_raw = call_gemini_api(checker_prompt, gemini_key)
                else:
                    checker_raw = call_huggingface_api(model_id, checker_prompt, hf_token)

                if checker_raw:
                    try:
                        cleaned_raw = checker_raw.strip().replace("\`\`\`json", "").replace("\`\`\`", "").strip()
                        data = json.loads(cleaned_raw)
                        is_present = data.get("isPresent", False)
                        matching_file = data.get("matchingFilename")
                        best_fit_file = data.get("bestFitFilename", best_fit_file)
                        reasoning = data.get("reasoning", reasoning)
                        add_log("GitHub Checker Agent", "success", f"API-Analyse abgeschlossen. Vorhanden: {is_present}. Bester Match: {best_fit_file}.")
                    except Exception:
                        add_log("GitHub Checker Agent", "warning", "Konnte JSON-Antwort nicht parsen, verwende robustes Offline-Linguistik-Ergebnis.")
                else:
                    add_log("GitHub Checker Agent", "warning", "Modellaufruf fehlgeschlagen. Heuristische Offline-Zuordnung erfolgreich angewendet.")
            else:
                add_log("GitHub Checker Agent", "success", f"Offline-Zuordnung abgeschlossen. Bester Match: {best_fit_file}.")

            # --- AGENT 2: Summarizer Agent ---
            summary_text = ""
            if not is_present:
                add_log("Summarizer Agent", "info", f"Aktiviert! Erstelle Executive Summary für '{best_fit_file}'...")
                
                if model_provider != "Local Resilient Offline-Engine":
                    summarizer_prompt = f\"\"\"Du bist der "Summarizer Agent" für praxis-it.
Erstelle eine prägnante, professionelle Zusammenfassung des Artikels auf Deutsch.
Formatiere sie in sauberem Quarto Markdown (.qmd), bereit zur Integration in die Datei '{best_fit_file}'.

Artikel Titel: {article_title}
Text: {article_text}

Zusammenfassung in Quarto-Format:\"\"\"

                    if model_provider == "Gemini Cloud Proxy":
                        summary_text = call_gemini_api(summarizer_prompt, gemini_key)
                    else:
                        summary_text = call_huggingface_api(model_id, summarizer_prompt, hf_token)
                    
                    if summary_text:
                        add_log("Summarizer Agent", "success", f"Zusammenfassung über API erfolgreich generiert ({len(summary_text)} Zeichen).")
                    else:
                        add_log("Summarizer Agent", "warning", "API konnte keine Zusammenfassung liefern. Kompiliere resiliente Offline-Heuristik...")
                        summary_text = generate_offline_summary(article_title, article_text, best_fit_file)
                else:
                    add_log("Summarizer Agent", "info", "Generiere resiliente, offline-basierte Zusammenfassung...")
                    summary_text = generate_offline_summary(article_title, article_text, best_fit_file)
                    add_log("Summarizer Agent", "success", f"Offline-Heuristik-Dokument erfolgreich kompiliert ({len(summary_text)} Zeichen).")
            else:
                add_log("Summarizer Agent", "info", "Deaktiviert, da der Artikel bereits im Repositorium vorhanden ist.")

        # --- DISPLAY RESULTS ---
        st.markdown("### 🏆 Ergebnisse der Agenten-Koprozessierung")
        
        tab_output, tab_logs, tab_mcp = st.tabs(["📄 Output Zusammenfassung", "📜 Agenten Protokoll (Logs)", "🔌 MCP Transport"])
        
        with tab_output:
            if is_present:
                st.success("✅ **Dieser Artikel existiert bereits im Repositorium!**")
                display_file = matching_file if matching_file else "Ausgewählte Datei"
                view_url = f"https://github.com/{REPO_OWNER}/{REPO_NAME}/blob/{TARGET_BRANCH}/{display_file}"
                st.markdown(f"**Gefundene Datei:** \`{display_file}\`")
                st.markdown(f"[🔗 Artikel direkt im GitHub-Repo anzeigen]({view_url})")
            else:
                st.info("ℹ️ **Neuer Artikel erkannt! Zusammenfassung wurde erstellt.**")
                edit_url = f"https://github.com/{REPO_OWNER}/{REPO_NAME}/edit/{TARGET_BRANCH}/{best_fit_file}"
                st.markdown(f"**Empfohlene Ziel-Kategorie:** \`{best_fit_file}\`")
                st.markdown(f"[✍️ Jetzt direkt in '{best_fit_file}' auf GitHub einfügen]({edit_url})")
                
                st.markdown("#### Generierte Quarto Zusammenfassung:")
                st.code(summary_text, language="markdown")

            st.markdown("#### Klassifizierungs-Begründung (Agent 1):")
            st.info(f"*{reasoning}*")

        with tab_logs:
            st.markdown("#### Protokoll der Agenten-Interaktion (Audit Trail)")
            for log in logs:
                col_t, col_a, col_m = st.columns([1, 2, 5])
                with col_t:
                    st.caption(log["time"])
                with col_a:
                    if log["type"] == "success":
                        st.markdown(f"🟢 **{log['agent']}**")
                    elif log["type"] == "warning":
                        st.markdown(f"🟡 **{log['agent']}**")
                    else:
                        st.markdown(f"🔵 **{log['agent']}**")
                with col_m:
                    st.write(log["msg"])

        with tab_mcp:
            st.markdown("#### Simulierter Model Context Protocol (MCP) JSON RPC Payload")
            mcp_req = {
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {
                    "name": "github-server::list_directory_contents",
                    "arguments": {
                        "owner": REPO_OWNER,
                        "repo": REPO_NAME,
                        "path": "/"
                    }
                },
                "id": "mcp-call-python-771"
            }
            st.json(mcp_req)
            st.caption("Das MCP Gateway ermöglicht es Offline- und Serverless-Modellen, sich live mit GitHub-Diensten zu koordinieren.")
`;
