"""Reprodukovatelný numerický test; náhodné váhy nejsou konverzační model."""

import base64
import json
from pathlib import Path
import tempfile

import torch

from chat_pilot import ChatModel, Tokenizer, export_weights


def main():
    torch.set_num_threads(1)
    torch.manual_seed(1729)
    config = {"vocab": 512, "context": 64, "width": 8, "heads": 2, "layers": 2}
    tokenizer = Tokenizer.train(["Ahoj světe! Ahoj světe!", "Příliš žluťoučký kůň 🐶"] * 2)
    model = ChatModel(config).eval()
    texts = ["Ahoj světe!", "Příliš žluťoučký kůň 🐶", "\tAhoj\n světe\u0085!", "neznámé: 42 🚀"]
    ids = [1, 3] + tokenizer.encode("Ahoj světe!") + [5, 4]
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder)
        exported = export_weights(model, path)
        manifest = {
            "version": 1, "architecture": "buddy-transformer-v1", "config": config,
            **exported, "activation": "gelu-erf", "layerNormEpsilon": 0.00001,
            "tokenizer": {"type": "byte-bpe-v1", "byteOffset": 6,
                          "merges": tokenizer.merges, "activeVocabulary": len(tokenizer.pieces),
                          "specialTokens": {"pad": 0, "bos": 1, "eos": 2, "user": 3, "assistant": 4, "sep": 5}},
            "tiedOutputWeight": "tokens.weight",
        }
        with torch.no_grad():
            logits = model(torch.tensor([ids]))[0, :, :len(tokenizer.pieces)].tolist()
        fixture = {"note": "Náhodné váhy pouze pro shodu Python/TypeScript.",
                   "manifest": manifest,
                   "weightsBase64": base64.b64encode((path / "weights.bin").read_bytes()).decode("ascii"),
                   "texts": [{"text": text, "ids": tokenizer.encode(text)} for text in texts],
                   "tokens": ids, "logits": logits}
    target = Path(__file__).resolve().parents[2] / "tests/fixtures/buddy-transformer-v1.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(fixture, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Numerický fixture zapsán.")


if __name__ == "__main__":
    main()
