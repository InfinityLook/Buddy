"""Kontrola autorských dat bez závislosti na PyTorchi."""

import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parent


def key(messages):
    return tuple((role, unicodedata.normalize("NFC", " ".join(text.split())).casefold())
                 for role, text in messages)


def prompt_keys(conversation):
    return {prompt_key(conversation[:i]) for i in range(1, len(conversation), 2)}


def prompt_key(messages):
    # Psaní bez diakritiky nebo s jinou interpunkcí nevytváří nezávislý test.
    def canonical(text):
        value = "".join(c for c in unicodedata.normalize("NFD", text.casefold())
                        if unicodedata.category(c) != "Mn")
        return " ".join(re.findall(r"\w+", value))
    return tuple((role, canonical(text)) for role, text in messages)


def read_data(path):
    path = Path(path)
    if path.stat().st_size > 5_000_000:
        raise ValueError("Pilot přijímá nejvýše 5 MB dat.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Data musí obsahovat oddělené sady.")
    seen, prompts = set(), {}
    for split in ("training", "validation"):
        conversations = data.get(split)
        if not isinstance(conversations, list) or not 1 <= len(conversations) <= 5000:
            raise ValueError(f"Chybí platná sada {split}.")
        prompts[split] = set()
        for conversation in conversations:
            if not isinstance(conversation, list) or not 2 <= len(conversation) <= 16 or len(conversation) % 2:
                raise ValueError("Rozhovor musí střídavě obsahovat uživatele a asistenta.")
            for i, message in enumerate(conversation):
                role = "user" if i % 2 == 0 else "assistant"
                if not isinstance(message, list) or len(message) != 2 or message[0] != role:
                    raise ValueError("Neplatná role zprávy.")
                text = message[1]
                if not isinstance(text, str) or not text.strip() or len(text) > 500:
                    raise ValueError("Zpráva potřebuje 1 až 500 znaků.")
            normalized = key(conversation)
            if normalized in seen:
                raise ValueError("Opakovaný rozhovor nebo překryv sad.")
            seen.add(normalized)
            prompts[split].update(prompt_keys(conversation))
    if prompts["training"] & prompts["validation"]:
        raise ValueError("Trénování obsahuje ověřovací zadání, i když má jinou odpověď.")
    return data


def read_cases(path=ROOT / "chat_eval.json"):
    path = Path(path)
    if path.stat().st_size > 250_000:
        raise ValueError("Příliš velká kontrolní sada.")
    cases = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(cases, list) or not 1 <= len(cases) <= 100:
        raise ValueError("Neplatná kontrolní sada.")
    seen = set()
    for case in cases:
        if not isinstance(case, dict) or not isinstance(case.get("id"), str) or case["id"] in seen:
            raise ValueError("Chybí jedinečné ID kontrolního případu.")
        seen.add(case["id"])
        messages = case.get("messages")
        if not isinstance(messages, list) or not 1 <= len(messages) <= 15 or len(messages) % 2 != 1:
            raise ValueError("Kontrolní rozhovor musí končit uživatelským dotazem.")
        for i, message in enumerate(messages):
            if (not isinstance(message, list) or len(message) != 2
                    or message[0] != ("user" if i % 2 == 0 else "assistant")
                    or not isinstance(message[1], str) or not message[1].strip()
                    or len(message[1]) > 500):
                raise ValueError("Neplatná kontrolní zpráva.")
        if not isinstance(case.get("category"), str) or not isinstance(case.get("question", False), bool):
            raise ValueError("Neplatné kontrolní podmínky.")
        for field in ("mustMentionAny", "forbidden"):
            if not isinstance(case.get(field, []), list) or any(not isinstance(v, str) or not v for v in case.get(field, [])):
                raise ValueError("Neplatné kontrolní podmínky.")
    return cases


def assert_evaluation_separate(data, cases):
    used = {prompt for split in ("training", "validation")
            for conversation in data[split] for prompt in prompt_keys(conversation)}
    seen = set()
    for case in cases:
        prompt = prompt_key(case["messages"])
        if prompt in used or prompt in seen:
            raise ValueError(f"Kontrolní zadání {case['id']} se překrývá s jinou sadou.")
        seen.add(prompt)
