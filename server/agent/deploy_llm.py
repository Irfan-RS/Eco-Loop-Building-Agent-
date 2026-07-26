import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from agent.oss_llm_server import start_oss_llm_server

def main():
    print("=" * 70)
    print("🤖 EcoLoop: Deploying Self-Hosted Open-Source LLM Service")
    print("   Model: Llama 3.1 8B Instruct (GGUF / Ollama / vLLM API Protocol)")
    print("   Endpoint: http://127.0.0.1:11434/v1/chat/completions")
    print("=" * 70)
    start_oss_llm_server(port=11434)

if __name__ == "__main__":
    main()
