"""Gateway simulado, compatible con la API de chat de OpenAI.

No llama a ningún proveedor. Responde con un prefijo fijo para que en el chat
se vea que LibreChat habló con este servicio y no con OpenAI o Anthropic.
"""

import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 4000
MODEL = "qvision-sim"
EXPECTED = os.environ.get("GATEWAY_API_KEY", "")


def reply_for(payload):
    messages = payload.get("messages") or []
    user_text = ""
    for message in reversed(messages):
        if message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, str):
            user_text = content
        elif isinstance(content, list):
            parts = []
            for part in content:
                if isinstance(part, dict) and isinstance(part.get("text"), str):
                    parts.append(part["text"])
            user_text = "\n".join(parts)
        break
    snippet = user_text.replace("\n", " ").strip()[:180]
    return (
        "[AI-Gateway-QVision] El gateway simulado recibió este chat "
        f"(modelo {payload.get('model') or MODEL}) antes de cualquier proveedor. "
        f"Mensaje: {snippet}"
    )


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print(f"gateway {self.command} {self.path} {args[1] if len(args) > 1 else ''}", flush=True)

    def _authorized(self):
        if not EXPECTED:
            return False
        header = self.headers.get("Authorization", "")
        api_key = self.headers.get("x-api-key", "")
        return header == f"Bearer {EXPECTED}" or api_key == EXPECTED

    def _json(self, status, body):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b""
        if not raw:
            return {}
        return json.loads(raw.decode())

    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        if path in ("/health", "/v1/health"):
            self._json(200, {"status": "ok", "gateway": "AI-Gateway-QVision"})
            return
        if path in ("/v1/models", "/models"):
            if not self._authorized():
                self._json(401, {"error": {"message": "unauthorized", "type": "auth"}})
                return
            self._json(
                200,
                {
                    "object": "list",
                    "data": [
                        {
                            "id": MODEL,
                            "object": "model",
                            "created": 1,
                            "owned_by": "ai-gateway-sim",
                        }
                    ],
                },
            )
            return
        self._json(404, {"error": {"message": "not found", "type": "not_found"}})

    def do_POST(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        if path not in ("/v1/chat/completions", "/chat/completions"):
            self._json(404, {"error": {"message": "not found", "type": "not_found"}})
            return
        if not self._authorized():
            self._json(401, {"error": {"message": "unauthorized", "type": "auth"}})
            return
        try:
            payload = self._read_json()
        except json.JSONDecodeError:
            self._json(400, {"error": {"message": "invalid json", "type": "invalid_request"}})
            return

        text = reply_for(payload)
        model = payload.get("model") or MODEL
        created = int(time.time())
        usage = {"prompt_tokens": 8, "completion_tokens": 24, "total_tokens": 32}
        print(
            f"gateway chat model={model} stream={bool(payload.get('stream'))} chars={len(text)}",
            flush=True,
        )

        if payload.get("stream"):
            def chunk(delta, finish):
                return {
                    "id": "chatcmpl-gateway",
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model,
                    "choices": [{"index": 0, "delta": delta, "finish_reason": finish}],
                }

            parts = [
                f"data: {json.dumps(chunk({'role': 'assistant', 'content': text}, None))}\n\n",
                f"data: {json.dumps(chunk({}, 'stop'))}\n\n",
                "data: [DONE]\n\n",
            ]
            body = "".join(parts).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self._json(
            200,
            {
                "id": "chatcmpl-gateway",
                "object": "chat.completion",
                "created": created,
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": text},
                        "finish_reason": "stop",
                    }
                ],
                "usage": usage,
            },
        )


if __name__ == "__main__":
    if not EXPECTED:
        raise SystemExit("GATEWAY_API_KEY is required")
    print(f"AI-Gateway-QVision listening on {PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
