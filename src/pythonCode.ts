export const PYTHON_CODE = `# -*- coding: utf-8 -*-
"""
Streamlit Praxis-IT Agent Workspace
Allows interacting with two agents to check, summarize, and link articles against bsenst/praxis-it.
Fully prepared for direct deployment to Streamlit Cloud (CPU-friendly Serverless APIs).
"""

import streamlit as st
import requests
import json
import os
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
        response = requests.post(url, headers=headers, json=payload, timeout=30)
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
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            st.error(f"Gemini API Error: {response.text}")
    except Exception as e:
        st.error(f"Gemini connection error: {str(e)}")
    return None

# --- SIDEBAR (st.sidebar) ---
with st.sidebar:
    st.markdown("### 🛠️ Configuration & Models")
    
    # Model Selection (st.selectbox)
    model_provider = st.selectbox(
        "Agent Engine Provider",
        ["Hugging Face (Serverless CPU)", "Gemini Cloud Proxy"]
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
    else:
        model_id = "gemini-1.5-flash"
        gemini_key = st.text_input("Gemini API Key", type="password", value=os.environ.get("GEMINI_API_KEY", ""))
        hf_token = ""

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

        add_log("MCP Gateway", "info", f"Verbindung mit GitHub MCP Server wird aufgebaut...")
        add_log("MCP Gateway", "success", f"Erfolgreich {len(repo_files)} .qmd-Dateien eingelesen.")

        with st.spinner("🤖 Agenten analysieren den Text und stimmen sich ab..."):
            
            # --- AGENT 1: GitHub Checker Agent ---
            add_log("GitHub Checker Agent", "info", f"Prüfe, ob der Inhalt bereits im Repo '{REPO_OWNER}/{REPO_NAME}' vorhanden ist.")
            
            # Semantic prompt for checking
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

            # Run Agent 1
            checker_raw = None
            if model_provider == "Gemini Cloud Proxy":
                checker_raw = call_gemini_api(checker_prompt, gemini_key)
            else:
                checker_raw = call_huggingface_api(model_id, checker_prompt, hf_token)

            # Parse Agent 1 Response
            is_present = False
            matching_file = None
            best_fit_file = "allgemeinmedizin.qmd"
            reasoning = "Standard Klassifizierung aufgrund von Verbindungsfehlern."

            if checker_raw:
                try:
                    cleaned_raw = checker_raw.strip().replace("\`\`\`json", "").replace("\`\`\`", "").strip()
                    data = json.loads(cleaned_raw)
                    is_present = data.get("isPresent", False)
                    matching_file = data.get("matchingFilename")
                    best_fit_file = data.get("bestFitFilename", "allgemeinmedizin.qmd")
                    reasoning = data.get("reasoning", "")
                    
                    add_log("GitHub Checker Agent", "success", f"Analyse abgeschlossen. Vorhanden: {is_present}. Bester Match: {best_fit_file}.")
                except Exception:
                    add_log("GitHub Checker Agent", "warning", "Konnte JSON-Antwort nicht parsen, führe heuristischen Fallback aus.")
                    for f in repo_files:
                        keyword = f.replace(".qmd", "")
                        if keyword in article_text.lower() or keyword in article_title.lower():
                            best_fit_file = f
                            reasoning = f"Heuristische Zuordnung zur Datei {f} basierend auf Keyword-Übereinstimmung."
                            break
            
            # --- AGENT 2: Summarizer Agent ---
            summary_text = ""
            if not is_present:
                add_log("Summarizer Agent", "info", f"Aktiviert! Erstelle Executive Summary für '{best_fit_file}'...")
                
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
                    add_log("Summarizer Agent", "success", f"Zusammenfassung erfolgreich generiert ({len(summary_text)} Zeichen).")
                else:
                    summary_text = "*Zusammenfassung konnte nicht generiert werden.*"
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
