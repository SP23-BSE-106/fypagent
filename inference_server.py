"""
Nemotron Nano Inference Server
================================
FastAPI server that loads the fine-tuned Nemotron Nano checkpoint from the
`nemotron-nano-30b-trained-transformers-1200samples-cot--v1.tar.gz` archive
(or an already-extracted directory `./nemotron-nano-model/`) and exposes a
`POST /generate` endpoint that returns a structured JSON workflow.

Prerequisites (install once):
    pip install fastapi uvicorn transformers torch accelerate

Usage:
    python inference_server.py

The server will run on http://localhost:8000
"""

import json
import os
import re
import tarfile
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────────────
TAR_PATH   = Path("nemotron-nano-30b-trained-transformers-1200samples-cot--v1.tar.gz")
MODEL_DIR  = Path("nemotron-nano-model")
HOST       = os.getenv("INFERENCE_HOST", "0.0.0.0")
PORT       = int(os.getenv("INFERENCE_PORT", "8000"))
MAX_NEW_TOKENS_DEFAULT = 1024

# ─── Model globals (loaded once at startup) ─────────────────────────────────
tokenizer = None
model     = None

# ─── System prompt ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an AI workflow architect. Given a plain-English description of what an agent should do, you MUST respond with ONLY valid JSON matching this exact schema — no markdown, no explanation, no extra text.

Schema:
{
  "name": "string (short agent name)",
  "description": "string (one sentence summary)",
  "nodes": [
    {
      "id": "string (unique, e.g. node_1)",
      "name": "string (human-readable step name)",
      "type": "one of: trigger | llm | rag | api | condition | output | tool | memory",
      "description": "string (what this step does)"
    }
  ],
  "edges": [
    {
      "id": "string (unique, e.g. edge_1)",
      "source": "node_id",
      "target": "node_id",
      "label": "optional string"
    }
  ]
}

Rules:
- Always start with a trigger node and end with an output node.
- Include 4-8 nodes total.
- Connect every node to at least one other node via edges.
- Output ONLY the JSON object. No markdown code blocks, no prose."""

# ─── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(title="Nemotron Nano Inference Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str
    max_new_tokens: Optional[int] = MAX_NEW_TOKENS_DEFAULT


class GenerateResponse(BaseModel):
    workflow: dict


# ─── Helper: extract tar if needed ──────────────────────────────────────────
def ensure_model_directory():
    if MODEL_DIR.exists() and any(MODEL_DIR.iterdir()):
        log.info("Model directory already exists: %s", MODEL_DIR)
        return

    if not TAR_PATH.exists():
        raise FileNotFoundError(
            f"Neither model directory '{MODEL_DIR}' nor archive '{TAR_PATH}' found. "
            "Please place the .tar.gz file in the project root."
        )

    log.info("Extracting model archive %s → %s …", TAR_PATH, MODEL_DIR)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with tarfile.open(TAR_PATH, "r:gz") as tar:
        tar.extractall(MODEL_DIR)
    log.info("Extraction complete.")


# ─── Helper: strip JSON from model output ───────────────────────────────────
def extract_json(text: str) -> dict:
    # Remove markdown code fences if present
    text = re.sub(r"```(?:json)?", "", text).strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from model output:\n{text[:500]}")


# ─── Startup: load model ─────────────────────────────────────────────────────
@app.on_event("startup")
async def load_model():
    global tokenizer, model

    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch

        ensure_model_directory()

        # Find the actual model sub-directory (tar might have a top-level folder)
        candidates = [MODEL_DIR] + [p for p in MODEL_DIR.iterdir() if p.is_dir()]
        model_path = next(
            (p for p in candidates if (p / "config.json").exists()),
            None
        )
        if model_path is None:
            raise FileNotFoundError(
                f"No config.json found in {MODEL_DIR}. "
                "Please check the extracted archive structure."
            )

        log.info("Loading tokenizer from %s …", model_path)
        tokenizer = AutoTokenizer.from_pretrained(str(model_path), trust_remote_code=True)

        log.info("Loading model from %s …", model_path)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        log.info("Using device: %s", device)

        model = AutoModelForCausalLM.from_pretrained(
            str(model_path),
            trust_remote_code=True,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
        )
        if device == "cpu":
            model = model.to("cpu")

        model.eval()
        log.info("✅ Nemotron Nano model loaded successfully.")

    except Exception as exc:
        log.error("❌ Failed to load model: %s", exc)
        # Don't crash the server — let the /generate endpoint return a clear error.


# ─── Health check ────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


# ─── Generate endpoint ───────────────────────────────────────────────────────
@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Check server startup logs."
        )

    # Build the chat / instruction prompt
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": req.prompt},
    ]

    # Use apply_chat_template if available, otherwise fall back to simple format
    try:
        input_text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    except Exception:
        input_text = (
            f"<|system|>{SYSTEM_PROMPT}</s>"
            f"<|user|>{req.prompt}</s>"
            "<|assistant|>"
        )

    try:
        import torch
        inputs = tokenizer(input_text, return_tensors="pt").to(model.device)

        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=req.max_new_tokens,
                do_sample=False,           # greedy — deterministic, better for JSON
                temperature=1.0,
                pad_token_id=tokenizer.eos_token_id,
            )

        # Decode only the newly generated tokens
        new_ids = output_ids[0][inputs["input_ids"].shape[-1]:]
        raw_text = tokenizer.decode(new_ids, skip_special_tokens=True)

        log.info("Raw model output (first 300 chars): %s", raw_text[:300])

        workflow = extract_json(raw_text)
        return GenerateResponse(workflow=workflow)

    except Exception as exc:
        log.error("Generation error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
