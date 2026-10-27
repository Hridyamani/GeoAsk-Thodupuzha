
import os
import ollama

OLLAMA_HOST = os.getenv(
    "OLLAMA_HOST",
    "http://localhost:11434"
)
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen3:4b")

client = ollama.Client(host=OLLAMA_HOST)


def check_qwen_connection():
    """Check whether Ollama and the configured model are available."""
    try:
        result = client.list()
        model_names = [model.model for model in result.models]

        if QWEN_MODEL not in model_names:
            return {
                "status": "error",
                "message": f"Model {QWEN_MODEL} is not installed."
            }

        return {
            "status": "success",
            "model": QWEN_MODEL,
            "message": "Qwen3 is available."
        }

    except Exception as exc:
        return {
            "status": "error",
            "message": "Cannot connect to Ollama.",
            "detail": str(exc)
        }


def ask_qwen(prompt: str) -> str:
    """Generate and return a visible answer from Qwen3."""
    response = client.chat(
        model=QWEN_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a concise GIS assistant. "
                    "Answer directly in one or two sentences. "
                    "Do not explain your reasoning."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        stream=False,
        think=False,
        options={
            "num_predict": 256,
            "temperature": 0.0,
        },
    )

   
    answer = (response.message.content or "").strip()

    # Remove reasoning text if it appears in the content.
    if "</think>" in answer:
        answer = answer.rsplit("</think>", 1)[-1].strip()

    if not answer:
        raise RuntimeError(
            "Qwen3 returned an empty answer. "
            "Inspect the response thinking field and model output."
        )

    return answer
