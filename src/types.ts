export interface FileInfo {
  name: string;
  path: string;
  sha: string;
  size: number;
  html_url: string;
  type: string;
}

export interface AgentLog {
  timestamp: string;
  agent: "GitHub Checker Agent" | "Summarizer Agent" | "MCP Gateway";
  type: "info" | "success" | "warning" | "error" | "mcp_call" | "mcp_response";
  message: string;
}

export interface ArticleCheckResult {
  isPresent: boolean;
  matchingFile?: FileInfo;
  bestFitFile?: FileInfo;
  reasoning: string;
  summary?: string;
  logs: AgentLog[];
  articleTitle: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: "huggingface" | "gemini";
  description: string;
}
