#!/usr/bin/env python3
"""
run_new_labels_with_indicator.py — using a local HuggingFace model to generate new labels
for Bliss words when an indicator is applied.

Usage:
  python scripts/run_new_labels_with_indicator.py \\
    --model /path/to/hf-checkpoint \\
    --prompts scripts/data/new_labels_with_indicator_prompts.jsonl \\
    --output scripts/data/new_labels_with_indicator.jsonl \\
    [--runner my-model] \\
    [--prompt-version indicator-label-prompts-v1] \\
    [--quantize]

Input rows (from generate_indicator_label_prompts.js), one per line, first line is a
`_meta` header carrying the shared system prompt:
  {"targetId":"101_99","wordId":101,"gloss":"...","pos":"noun","indicatorId":99,
   "indicatorName":"plural","prompt":"..."}

Output rows (one per target, written immediately as they're generated). Each run
overwrites `--output` from scratch; because generation is deterministic (see
`do_sample=False` below), re-running after a crash reproduces the same file.
  {"targetId":"101_99","wordId":101,"gloss":"...","pos":"noun","indicatorId":99,
   "indicatorName":"plural","newLabel":"...","rawResponseText":"...","runner":"...",
   "promptVersion":"..."}

Adapted from docs/test_slm.py.
"""
import argparse
import json
import sys
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch

SYSTEM_PROMPT_FALLBACK = "You are a helpful linguistic assistant."


def read_system_prompt(lines, fallback):
    """Return (system_prompt, data_lines): extract _meta header if present."""
    if lines:
        try:
            first = json.loads(lines[0])
            if first.get("_meta") is True and isinstance(first.get("systemPrompt"), str):
                return first["systemPrompt"], lines[1:]
        except (json.JSONDecodeError, ValueError):
            pass
    return fallback, lines


def extract_label(text: str) -> str:
    """Take the first non-empty line of the response, stripped of quotes/whitespace."""
    for line in text.splitlines():
        line = line.strip().strip("\"'")
        if line:
            return line
    return ""


def load_model(model_path: str, quantize: bool):
    """Load tokenizer and model from a local HuggingFace checkpoint."""

    print("Loading tokenizer from path: ", model_path, file=sys.stderr)
    tokenizer = AutoTokenizer.from_pretrained(model_path)

    if quantize:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.bfloat16,
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            dtype="auto",
            device_map="auto",
        )

    model.eval()
    return model, tokenizer


def generate_response(model, tokenizer, prompt: str, system_prompt: str, max_tokens: int = 64):
    """Tokenize prompt, generate until the model's natural stop, decode new tokens only."""
    text = tokenizer.apply_chat_template(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        add_generation_prompt=True,
        tokenize=False,
    )
    inputs = tokenizer(text=text, return_tensors="pt").to(model.device)
    input_len = inputs["input_ids"].shape[-1]

    outputs = model.generate(**inputs, max_new_tokens=max_tokens, do_sample=False)
    response = tokenizer.decode(outputs[0][input_len:], skip_special_tokens=True)
    return response


def main():
    parser = argparse.ArgumentParser(
        description="Generate indicator labels for Bliss words using a local HuggingFace model."
    )
    parser.add_argument("--model", required=True,
                        help="Path to HuggingFace checkpoint directory")
    parser.add_argument("--prompts", required=True,
                        help="Path to prompt JSONL (output of generate_indicator_label_prompts.js)")
    parser.add_argument("--output", required=True,
                        help="Path to write result JSONL (overwritten if it already exists)")
    parser.add_argument("--runner", default=None,
                        help="Label stored in each output row (default: model dir basename)")
    parser.add_argument("--prompt-version", default=None,
                        help="Label stored in each output row (default: prompts file stem)")
    parser.add_argument("--quantize", action="store_true",
                        help="Load model in 4-bit NF4 quantization (for low VRAM)")
    parser.add_argument("--max-tokens", type=int, default=64,
                        help="Max new tokens for generation (default: 64)")
    args = parser.parse_args()

    runner = args.runner or Path(args.model.rstrip("/\\")).name
    prompt_version = args.prompt_version or Path(args.prompts).stem
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(args.prompts, encoding="utf-8") as f_in:
            all_lines = [line.strip() for line in f_in if line.strip()]
    except OSError as exc:
        print(f"Error: Failed to read prompts file \"{args.prompts}\": {exc}", file=sys.stderr)
        sys.exit(1)
    system_prompt, data_lines = read_system_prompt(all_lines, SYSTEM_PROMPT_FALLBACK)

    print(f"Loading model from {args.model} ...", file=sys.stderr)
    model, tokenizer = load_model(args.model, args.quantize)
    print("Model loaded.", file=sys.stderr)

    mode = "w"
    count = 0
    errors = 0
    with open(output_path, mode, encoding="utf-8") as f_out:
        for line in data_lines:
            target_id = None
            try:
                row = json.loads(line)
                target_id = row["targetId"]
                raw = generate_response(model, tokenizer, row["prompt"], system_prompt, args.max_tokens)

                out_row = {
                    "targetId": target_id,
                    "wordId": row["wordId"],
                    "gloss": row["gloss"],
                    "pos": row["pos"],
                    "indicatorId": row["indicatorId"],
                    "indicatorName": row["indicatorName"],
                    "newLabel": extract_label(raw),
                    "rawResponseText": raw,
                    "runner": runner,
                    "promptVersion": prompt_version,
                }
                f_out.write(json.dumps(out_row) + "\n")
                f_out.flush()

                count += 1
                print(f"[{count}] {target_id}: {out_row['newLabel']}", file=sys.stderr)
            except Exception as exc:  # noqa: BLE001 - continue the batch on any row failure
                errors += 1
                label = target_id if target_id is not None else line[:200]
                print(f"Error processing row {label}: {exc}", file=sys.stderr)
                continue

    print(
        f"\nDone. Wrote {count} rows ({errors} errors) to {output_path}",
        file=sys.stderr,
    )

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
