#!/usr/bin/env python3
"""
Usage: python3 scripts/transcribe.py <audio_file_path> [initial_prompt]
Outputs JSON: {"text": "..."} or {"error": "..."}
Env: WHISPER_MODEL=small|base|tiny (default: small)
"""
import json
import os
import sys


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "no audio file provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    initial_prompt = sys.argv[2] if len(sys.argv) > 2 else (
        "中文科研面试口语。术语：风速预测、Transformer、物理一致性、时间一致性、"
        "物理约束、知识蒸馏、第一作者、具身智能、损失函数、投稿。"
    )
    model_name = os.environ.get("WHISPER_MODEL", "small")

    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        segments, _ = model.transcribe(
            audio_path,
            language="zh",
            beam_size=5,
            best_of=5,
            temperature=0.0,
            initial_prompt=initial_prompt,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        text = "".join(seg.text.strip() for seg in segments).strip()
        print(json.dumps({"text": text}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
