"""Malý konverzační experiment. Výstup není automaticky nasazován do aplikace."""

import argparse
from array import array
from collections import Counter
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time
import unicodedata

import torch
from torch import nn
from torch.nn import functional as F


ROOT = Path(__file__).resolve().parent
CONFIG = {"vocab": 4096, "context": 256, "width": 192, "heads": 4, "layers": 4}
PAD, BOS, EOS, USER, ASSISTANT, SEP = range(6)
IGNORE = -100


def digest(value):
    return hashlib.sha256(value).hexdigest()


def peak_memory_mib():
    if sys.platform != "linux":
        return None
    import resource
    return round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1)


def read_data(path):
    if path.stat().st_size > 5_000_000:
        raise ValueError("Pilot přijímá nejvýše 5 MB dat.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Data musí obsahovat oddělenou trénovací a ověřovací sadu.")
    seen = set()
    for split in ("training", "validation"):
        conversations = data.get(split)
        if not isinstance(conversations, list) or not 1 <= len(conversations) <= 5000:
            raise ValueError(f"Chybí platná sada {split}.")
        for conversation in conversations:
            if not isinstance(conversation, list) or not 2 <= len(conversation) <= 16 or len(conversation) % 2:
                raise ValueError("Rozhovor musí střídavě obsahovat uživatele a asistenta.")
            normalized = []
            for i, message in enumerate(conversation):
                role = "user" if i % 2 == 0 else "assistant"
                if not isinstance(message, list) or len(message) != 2 or message[0] != role:
                    raise ValueError("Neplatná role zprávy.")
                text = message[1]
                if not isinstance(text, str) or not text.strip() or len(text) > 500:
                    raise ValueError("Zpráva potřebuje 1 až 500 znaků.")
                normalized.append([role, unicodedata.normalize("NFC", " ".join(text.split())).casefold()])
            key = json.dumps(normalized, ensure_ascii=False)
            if key in seen:
                raise ValueError("Opakovaný rozhovor nebo překryv trénování a ověřování.")
            seen.add(key)
    return data


class Tokenizer:
    """Vlastní deterministické BPE; učí se výhradně z trénovací sady."""

    def __init__(self, merges=()):
        self.merges = [tuple(pair) for pair in merges]
        self.pieces = [b""] * 6 + [bytes([i]) for i in range(256)]
        self.ranks = {}
        for pair in self.merges:
            self.ranks[pair] = len(self.pieces)
            self.pieces.append(self.pieces[pair[0]] + self.pieces[pair[1]])

    @staticmethod
    def merge(ids, pair, token):
        result, i = [], 0
        while i < len(ids):
            if i + 1 < len(ids) and (ids[i], ids[i + 1]) == pair:
                result.append(token)
                i += 2
            else:
                result.append(ids[i])
                i += 1
        return tuple(result)

    @classmethod
    def train(cls, texts):
        words = Counter(
            tuple(byte + 6 for byte in piece.encode("utf-8"))
            for text in texts for piece in re.findall(r"\s+|[^\s]+", text)
        )
        merges = []
        while 262 + len(merges) < CONFIG["vocab"]:
            pairs = Counter()
            for word, count in words.items():
                for pair in zip(word, word[1:]):
                    pairs[pair] += count
            if not pairs:
                break
            pair = min(pairs, key=lambda item: (-pairs[item], item))
            if pairs[pair] < 2:
                break
            token = 262 + len(merges)
            updated = Counter()
            for word, count in words.items():
                updated[cls.merge(word, pair, token)] += count
            words = updated
            merges.append(pair)
        return cls(merges)

    def encode(self, text):
        result = []
        for piece in re.findall(r"\s+|[^\s]+", text):
            ids = tuple(byte + 6 for byte in piece.encode("utf-8"))
            while len(ids) > 1:
                pair = min(zip(ids, ids[1:]), key=lambda item: self.ranks.get(item, math.inf))
                if pair not in self.ranks:
                    break
                ids = self.merge(ids, pair, self.ranks[pair])
            result.extend(ids)
        return result

    def decode(self, ids):
        return b"".join(self.pieces[i] for i in ids if i >= 6).decode("utf-8", errors="replace")


class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        width = config["width"]
        self.heads = config["heads"]
        self.ln1 = nn.LayerNorm(width)
        self.ln2 = nn.LayerNorm(width)
        self.qkv = nn.Linear(width, 3 * width)
        self.proj = nn.Linear(width, width)
        self.ff1 = nn.Linear(width, 4 * width)
        self.ff2 = nn.Linear(4 * width, width)

    def forward(self, x):
        batch, length, width = x.shape
        q, k, v = [
            item.view(batch, length, self.heads, width // self.heads).transpose(1, 2)
            for item in self.qkv(self.ln1(x)).chunk(3, dim=-1)
        ]
        attention = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        x = x + self.proj(
            attention.transpose(1, 2).contiguous().view(batch, length, width)
        )
        return x + self.ff2(F.gelu(self.ff1(self.ln2(x))))


class ChatModel(nn.Module):
    def __init__(self, config=CONFIG):
        super().__init__()
        self.tokens = nn.Embedding(config["vocab"], config["width"])
        self.positions = nn.Embedding(config["context"], config["width"])
        self.blocks = nn.ModuleList(
            [Block(config) for _ in range(config["layers"])]
        )
        self.norm = nn.LayerNorm(config["width"])
        for module in self.modules():
            if isinstance(module, (nn.Linear, nn.Embedding)):
                nn.init.normal_(module.weight, std=0.02)
                if isinstance(module, nn.Linear):
                    nn.init.zeros_(module.bias)

    def forward(self, ids):
        positions = torch.arange(ids.shape[1], device=ids.device)
        x = self.tokens(ids) + self.positions(positions)
        for block in self.blocks:
            x = block(x)
        return F.linear(self.norm(x), self.tokens.weight)


def make_rows(conversations, tokenizer):
    rows = []
    size = CONFIG["context"]
    for conversation in conversations:
        ids, targets = [BOS], [False]
        for role, text in conversation:
            message = [USER if role == "user" else ASSISTANT]
            message += tokenizer.encode(text)
            message.append(SEP if role == "user" else EOS)
            ids.extend(message)
            targets.extend(
                [False] + [role == "assistant"] * (len(message) - 1)
            )
        for start in range(0, len(ids) - 1, size // 2):
            part = ids[start:start + size + 1]
            mask = targets[start + 1:start + len(part)]
            if any(mask):
                x = part[:-1] + [PAD] * (size - len(part) + 1)
                y = [
                    token if enabled else IGNORE
                    for token, enabled in zip(part[1:], mask)
                ]
                y += [IGNORE] * (size - len(y))
                rows.append((x, y))
            if start + size + 1 >= len(ids):
                break
    if not rows:
        raise ValueError("Sada neobsahuje odpovědi pro učení.")
    return (
        torch.tensor([row[0] for row in rows]),
        torch.tensor([row[1] for row in rows]),
    )


def loss_for(model, x, y):
    return F.cross_entropy(
        model(x).flatten(0, 1), y.flatten(), ignore_index=IGNORE
    )


@torch.no_grad()
def evaluate(model, rows):
    model.eval()
    total, count = 0.0, 0
    for start in range(0, min(len(rows[0]), 16), 4):
        x = rows[0][start:start + 4]
        y = rows[1][start:start + 4]
        valid = int((y != IGNORE).sum())
        total += float(loss_for(model, x, y)) * valid
        count += valid
    result = total / count
    if not math.isfinite(result):
        raise ValueError("Ověřování vytvořilo neplatnou ztrátu.")
    return result


@torch.no_grad()
def generate_example(model, tokenizer):
    model.eval()
    prompt = "Ahoj, kdo jsi?"
    ids = [BOS, USER] + tokenizer.encode(prompt) + [SEP, ASSISTANT]
    generated = []
    random = torch.Generator().manual_seed(123)
    for _ in range(40):
        context = torch.tensor([ids[-CONFIG["context"]:]])
        logits = model(context)[0, -1].clone()
        logits[len(tokenizer.pieces):] = -torch.inf
        logits[[PAD, BOS, USER, ASSISTANT, SEP]] = -torch.inf
        token = int(
            torch.multinomial(
                F.softmax(logits / 0.7, dim=-1), 1, generator=random
            )
        )
        if token == EOS:
            break
        generated.append(token)
        ids.append(token)
    return {
        "prompt": prompt,
        "text": tokenizer.decode(generated),
        "note": "Pouze diagnostická ukázka; model může produkovat nesmyslný text.",
    }


def export_weights(model, output):
    tensors, checksum, offset = [], hashlib.sha256(), 0
    with (output / "weights.bin").open("wb") as file:
        for name, value in model.named_parameters():
            if not bool(torch.isfinite(value).all()):
                raise ValueError("Model obsahuje neplatné váhy.")
            values = array("f", value.detach().cpu().flatten().tolist())
            if values.itemsize != 4:
                raise ValueError("Export vyžaduje 32bitový float.")
            if sys.byteorder != "little":
                values.byteswap()
            data = values.tobytes()
            tensors.append({
                "name": name,
                "shape": list(value.shape),
                "byteOffset": offset,
                "bytes": len(data),
            })
            file.write(data)
            checksum.update(data)
            offset += len(data)
    return {
        "format": "float32-le",
        "bytes": offset,
        "sha256": checksum.hexdigest(),
        "tensors": tensors,
    }


def self_test():
    import tempfile

    torch.manual_seed(42)
    tokenizer = Tokenizer.train(["Ahoj světe", "Ahoj světe"])

    for text in ("Příliš žluťoučký kůň 🐶", "nové neznámé slovo"):
        if tokenizer.decode(tokenizer.encode(text)) != text:
            raise AssertionError("Neprošel převod českého textu.")

    restored = Tokenizer(tokenizer.merges)
    if restored.encode("Ahoj světe") != tokenizer.encode("Ahoj světe"):
        raise AssertionError("Tokenizér není reprodukovatelný.")

    config = {**CONFIG, "width": 24, "layers": 1, "context": 16}
    model = ChatModel(config).eval()
    a = torch.randint(6, 262, (1, 16))
    b = a.clone()
    b[:, 8:] = torch.randint(6, 262, (1, 8))

    with torch.no_grad():
        if not torch.allclose(model(a)[:, :8], model(b)[:, :8], atol=1e-6):
            raise AssertionError("Model vidí budoucí tokeny.")

    rows = make_rows(
        [[["user", "Ahoj"], ["assistant", "Čau"]]],
        tokenizer,
    )
    if int((rows[1] != IGNORE).sum()) != len(tokenizer.encode("Čau")) + 1:
        raise AssertionError("Učí se i uživatelská část zprávy.")

    with tempfile.TemporaryDirectory() as folder:
        manifest = export_weights(model, Path(folder))
        blob = (Path(folder) / "weights.bin").read_bytes()

        if (
            digest(blob) != manifest["sha256"]
            or len(blob) != sum(p.numel() for p in model.parameters()) * 4
        ):
            raise AssertionError("Nesouhlasí export vah.")

        path = Path(folder) / "invalid.json"
        same = [["user", "Ahoj"], ["assistant", "Čau"]]
        path.write_text(
            json.dumps({"training": [same], "validation": [same]}),
            encoding="utf-8",
        )
        try:
            read_data(path)
        except ValueError:
            pass
        else:
            raise AssertionError("Kontrola přijala překrývající se sady.")

    print(
        "Kontroly textu, tokenizéru, kauzality, cílových tokenů a exportu prošly.",
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=60)
    parser.add_argument("--steps", type=int, default=200)
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--data", type=Path, default=ROOT / "chat_data.json")
    parser.add_argument(
        "--out", type=Path, default=ROOT / "chat-pilot-output"
    )
    parser.add_argument("--resume", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if (
        not 1 <= args.seconds <= 600
        or not 1 <= args.steps <= 2000
        or not 1 <= args.threads <= 4
    ):
        parser.error(
            "Povolen je čas 1–600 sekund, 1–2000 kroků a 1–4 vlákna."
        )

    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)

    if args.self_test:
        self_test()
        return

    data = read_data(args.data)
    data_hash = digest(
        json.dumps(data, ensure_ascii=False, sort_keys=True).encode("utf-8")
    )
    tokenizer = Tokenizer.train(
        text
        for conversation in data["training"]
        for _, text in conversation
    )
    train_rows = make_rows(data["training"], tokenizer)
    validation_rows = make_rows(data["validation"], tokenizer)

    torch.manual_seed(42)
    model = ChatModel()
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=0.0003, weight_decay=0.01
    )
    generator = torch.Generator().manual_seed(42)
    previous_steps = 0

    if args.resume:
        if args.resume.stat().st_size > 64_000_000:
            raise ValueError("Příliš velký checkpoint.")

        saved = torch.load(
            args.resume, map_location="cpu", weights_only=True
        )
        if (
            saved.get("architecture") != "buddy-transformer-v1"
            or saved["config"] != CONFIG
            or saved["dataSha256"] != data_hash
            or saved["tokenizerMerges"] != tokenizer.merges
        ):
            raise ValueError(
                "Checkpoint patří jiným datům nebo jiné konfiguraci."
            )

        model.load_state_dict(saved["model"])
        optimizer.load_state_dict(saved["optimizer"])
        generator.set_state(saved["generator"])
        previous_steps = saved["steps"]

    before = evaluate(model, validation_rows)
    model.train()

    started = time.perf_counter()
    steps, supervised, last_loss = 0, 0, None

    while (
        steps < args.steps
        and time.perf_counter() - started < args.seconds
    ):
        indexes = torch.randint(
            len(train_rows[0]), (4,), generator=generator
        )
        x, y = train_rows[0][indexes], train_rows[1][indexes]

        optimizer.zero_grad(set_to_none=True)
        loss = loss_for(model, x, y)
        if not bool(torch.isfinite(loss)):
            raise ValueError("Trénování vytvořilo neplatnou ztrátu.")

        loss.backward()
        nn.utils.clip_grad_norm_(
            model.parameters(), 1.0, error_if_nonfinite=True
        )
        optimizer.step()

        steps += 1
        supervised += int((y != IGNORE).sum())
        last_loss = float(loss.detach())

        if steps % 10 == 0:
                        print(f"Krok {steps}, trénovací ztráta {last_loss:.4f}", flush=True)

    elapsed = time.perf_counter() - started
    after = evaluate(model, validation_rows)
    output = args.out.resolve()
    output.mkdir(parents=True, exist_ok=True)
    weights = export_weights(model, output)

    manifest = {
        "version": 1,
        "architecture": "buddy-transformer-v1",
        "config": CONFIG,
        **weights,
        "activation": "gelu-erf",
        "layerNormEpsilon": 0.00001,
        "tokenizer": {
            "type": "byte-bpe-v1",
            "byteOffset": 6,
            "merges": tokenizer.merges,
            "activeVocabulary": len(tokenizer.pieces),
            "specialTokens": {
                "pad": PAD,
                "bos": BOS,
                "eos": EOS,
                "user": USER,
                "assistant": ASSISTANT,
                "sep": SEP,
            },
        },
        "tiedOutputWeight": "tokens.weight",
    }

    report = {
        "version": 1,
        "torch": torch.__version__,
        "config": CONFIG,
        "dataSha256": data_hash,
        "parameters": sum(p.numel() for p in model.parameters()),
        "activeVocabulary": len(tokenizer.pieces),
        "trainingConversations": len(data["training"]),
        "validationConversations": len(data["validation"]),
        "stepsThisRun": steps,
        "stepsTotal": previous_steps + steps,
        "trainingSeconds": round(elapsed, 3),
        "averageStepMs": round(1000 * elapsed / max(steps, 1), 2),
        "supervisedTokensPerSecond": round(
            supervised / max(elapsed, 0.001), 2
        ),
        "validationLossBefore": before,
        "validationLossAfter": after,
        "lastTrainingLoss": last_loss,
        "modelBytes": weights["bytes"],
        "modelSha256": weights["sha256"],
        "example": generate_example(model, tokenizer),
        "note": (
            "Malá autorská sada a pilot měří technickou funkčnost. "
            "Ztráta není procento správnosti ani důkaz plynulé komunikace."
        ),
    }

    torch.save({
        "architecture": "buddy-transformer-v1",
        "config": CONFIG,
        "dataSha256": data_hash,
        "tokenizerMerges": tokenizer.merges,
        "model": model.state_dict(),
        "optimizer": optimizer.state_dict(),
        "generator": generator.get_state(),
        "steps": previous_steps + steps,
    }, output / "checkpoint.pt")

    report["peakTrainingProcessMiB"] = peak_memory_mib()

    for name, value in (
        ("manifest.json", manifest),
        ("report.json", report),
    ):
        (output / name).write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    summary = (
        f"### Pilot konverzačního modelu\n\n"
        f"Parametry: {report['parameters']:,}\n\n"
        f"Váhy: {report['modelBytes']:,} bajtů\n\n"
        f"Kroky tohoto běhu: {steps}\n\n"
        f"Trénování: {elapsed:.2f} s; "
        f"průměrný krok: {report['averageStepMs']} ms\n\n"
        f"Špička RAM trénovacího procesu: "
        f"{report['peakTrainingProcessMiB']} MiB "
        f"(není měření telefonu)\n\n"
        f"Ověřovací ztráta: {before:.4f} → {after:.4f}\n\n"
        f"{report['note']}\n"
    )
    print(summary, flush=True)

    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open(
            "a", encoding="utf-8"
        ) as file:
            file.write(summary)


if __name__ == "__main__":
    main()
