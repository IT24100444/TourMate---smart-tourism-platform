import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "False")  # Gemini API key only

@dataclass
class AgentConfig:
    model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    mcp_server_port: int = 8090
    max_iterations: int = 2          # Reduced from 3 → fewer LLM round-trips per node
    pii_redaction_enabled: bool = True
    injection_detection_enabled: bool = True

config = AgentConfig()
