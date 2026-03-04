# Local Model Routing (Ollama) — JCA

## Runtime assumptions
- Ollama running: `ollama serve` (or tray app active)
- Local models available: `qwen3.5:0.8b` (+ optionally `qwen3.5:2b`, `qwen3.5:4b`)

## Default routing
- heartbeat / periodic checks: `qwen3.5:2b`
- routine JCA tasks (summaries, triage, simple matching checks): `qwen3.5:4b`
- fallback fast model: `qwen3.5:0.8b`

## Escalate to cloud model when
1. Output confidence is low / inconsistent
2. Task needs deep reasoning or long-context planning
3. Complex code refactors or security-sensitive decisions
4. Local model times out twice

## Suggested commands
```powershell
ollama list
ollama pull qwen3.5:2b
ollama pull qwen3.5:4b
```

## Quick health check
```powershell
ollama run qwen3.5:0.8b "antwoord kort: lokaal model werkt"
```
