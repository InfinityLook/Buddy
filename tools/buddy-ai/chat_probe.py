"""Krátké ukázky odpovědí uloženého modelu, bez dalšího trénování."""

import argparse
import html
import json
import os
from pathlib import Path
import time

import torch

from chat_pilot import (
    ASSISTANT, BOS, CONFIG, EOS, MAX_CHECKPOINT_BYTES, PAD, ROOT, SEP, USER,
    ChatModel, Tokenizer, digest,
)
from decoding import banned_by_repeat
from chat_data import assert_evaluation_separate, read_cases, read_data
from chat_quality import assess


CASES = [
    ("Známé zadání", [("user", "Ahoj Buddy.")]),
    ("Známé zadání", [("user", "Kdo jsi?")]),
    ("Kontrolní otázka", [("user", "Ahoj, kdo jsi?")]),
    ("Jiné znění", [("user", "Dnes toho mám moc a nevím, kde začít.")]),
    ("Volný rozhovor", [("user", "Nechci nic zařizovat. Můžeme si jen povídat?")]),
    ("Poděkování", [("user", "Díky, moc jsi mi pomohl.")]),
    ("Známé zadání", [("user", "Jak vytvořím poznámku?")]),
    ("Dotaz na provedení akce", [("user", "Otevřel jsi mi už plánovač?")]),
    ("Navazující rozhovor", [
        ("user", "Dnes musím dokončit projekt."),
        ("assistant", "Co ti na něm ještě chybí?"),
        ("user", "Poslední odstavec."),
    ]),
    ("Navazující rozhovor", [
        ("user", "Zítra mám test z biologie."),
        ("assistant", "Jaká témata bude test obsahovat?"),
        ("user", "Lidské srdce."),
    ]),
]


@torch.no_grad()
def answer(model, tokenizer, messages, greedy=False):
    started = time.perf_counter()
    ids = [BOS]
    for role, text in messages:
        ids.append(USER if role == "user" else ASSISTANT)
        ids.extend(tokenizer.encode(text))
        ids.append(SEP if role == "user" else EOS)
    ids.append(ASSISTANT)
    if len(ids) + 48 > CONFIG["context"]:
        raise ValueError("Zkušební rozhovor se nevejde do kontextu.")
    generated = []
    ended = False
    random = torch.Generator().manual_seed(123)
    for _ in range(48):
        logits = model(torch.tensor([ids]))[0, -1].clone()
        logits[len(tokenizer.pieces):] = -torch.inf
        logits[[PAD, BOS, USER, ASSISTANT, SEP]] = -torch.inf

        banned = banned_by_repeat(generated)
        if banned:
            blocked = logits.clone()
            blocked[list(banned)] = -torch.inf
            # Pokud by blokace vyčerpala všechny platné kandidáty, bezpečně
            # se vrátí k nezablokovanému výběru (stejná záchrana jako v JS).
            if bool(torch.isfinite(blocked).any()):
                logits = blocked

        token = int(logits.argmax()) if greedy else int(torch.multinomial(
            torch.softmax(logits / 0.7, dim=-1), 1, generator=random
        ))
        if token == EOS:
            ended = True
            break
        generated.append(token)
        ids.append(token)
    return {
        "text": tokenizer.decode(generated),
        "tokens": len(generated),
        "hitTokenLimit": len(generated) == 48,
        "endedWithEos": ended,
        "elapsedMs": round((time.perf_counter() - started) * 1000, 2),
    }


def cell(text):
    return html.escape(" ".join(text.split())).replace("|", "\\|")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path,
                        default=ROOT / "chat-pilot-output" / "checkpoint.pt")
    parser.add_argument("--out", type=Path, default=ROOT / "chat-pilot-output")
    parser.add_argument("--data", type=Path)
    args = parser.parse_args()
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    if args.checkpoint.stat().st_size > MAX_CHECKPOINT_BYTES:
        raise ValueError("Příliš velký checkpoint.")
    saved = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    if (saved.get("architecture") != "buddy-transformer-v1"
            or saved.get("config") != CONFIG):
        raise ValueError("Checkpoint má jinou architekturu nebo konfiguraci.")
    tokenizer = Tokenizer(saved["tokenizerMerges"])
    if not 262 <= len(tokenizer.pieces) <= CONFIG["vocab"]:
        raise ValueError("Neplatná velikost slovníku.")
    model = ChatModel()
    model.load_state_dict(saved["model"])
    model.eval()
    cases = read_cases()
    if args.data:
        data = read_data(args.data)
        if digest(json.dumps(data, ensure_ascii=False, sort_keys=True).encode("utf-8")) != saved["dataSha256"]:
            raise ValueError("Kontrolní data nepatří tomuto checkpointu.")
        assert_evaluation_separate(data, cases)
    results = [
        {"category": category, "messages": messages,
         "answer": answer(model, tokenizer, messages)}
        for category, messages in CASES
    ]
    report = {
        "version": 1, "steps": saved["steps"],
        "dataSha256": saved["dataSha256"],
        "temperature": 0.7, "seed": 123, "maxNewTokens": 48,
        "note": "Ruční posouzení ukázek; nejde o skóre správnosti ani bezpečnosti.",
        "results": results,
    }
    heldout = []
    for case in cases:
        result = answer(model, tokenizer, case["messages"], greedy=True)
        heldout.append({**case, "answer": result, **assess(case, result)})
    quality = {
        "version": 1, "dataSha256": saved["dataSha256"], "steps": saved["steps"],
        "checkpointSha256": digest(args.checkpoint.read_bytes()),
        "casesSha256": digest((ROOT / 'chat_eval.json').read_bytes()),
        "decoding": "greedy", "maxNewTokens": 48,
        "total": len(heldout),
        "passedTechnicalChecks": sum(item["passedTechnicalChecks"] for item in heldout),
        "readyForRelease": False, "requiresHumanReview": True,
        "note": "Diagnostické podmínky nejsou měření inteligence ani automatické schválení. Význam, češtinu a chod na telefonu je nutné posoudit zvlášť.",
        "results": heldout,
    }
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "conversation-check.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.out / "quality-check.json").write_text(
        json.dumps(quality, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    summary = "### Ukázky odpovědí modelu\n\n" + report["note"] + "\n\n"
    summary += "| Typ | Vstup | Odpověď |\n|---|---|---|\n"
    for result in results:
        history = " / ".join(
            ("Ty: " if role == "user" else "Buddy: ") + text
            for role, text in result["messages"]
        )
        text = result["answer"]["text"] or "(prázdná odpověď)"
        if result["answer"]["hitTokenLimit"]:
            text += " [limit výstupu]"
        summary += f"| {cell(result['category'])} | {cell(history)} | {cell(text)} |\n"
    summary += (f"\n### Nezávislá kontrolní zadání\n\n"
                f"Technické podmínky splnilo {quality['passedTechnicalChecks']} z {quality['total']} odpovědí. "
                f"{quality['note']}\n\n| ID | Odpověď | Nesplněné podmínky |\n|---|---|---|\n")
    for result in heldout:
        summary += f"| {result['id']} | {cell(result['answer']['text']) or '(prázdná)'} | {', '.join(result['issues']) or '—'} |\n"
    print(summary, flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as file:
            file.write("\n" + summary)


if __name__ == "__main__":
    main()
