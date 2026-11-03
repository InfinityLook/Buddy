"""Jednoduché diagnostické podmínky, nikoli automatické hodnocení inteligence."""

import re
import unicodedata


def normalized(text):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", text.casefold())
                            if unicodedata.category(c) != "Mn").split())


def assess(case, answer):
    text = answer["text"].strip()
    value = normalized(text)
    issues = []
    if not text:
        issues.append("empty")
    if len(text) > 480:
        issues.append("too_long")
    if "\ufffd" in text or any(ord(c) < 32 and c not in "\t\n\r" for c in text):
        issues.append("invalid_text")
    if not answer.get("endedWithEos", False):
        issues.append("no_eos")
    if re.search(r"\b(\w+)(?:\s+\1){3,}\b", value):
        issues.append("repetition")
    expected = case.get("mustMentionAny", [])
    if expected and not any(normalized(word) in value for word in expected):
        issues.append("missing_expected_topic")
    if case.get("question") and "?" not in text:
        issues.append("missing_question")
    if any(normalized(word) in value for word in case.get("forbidden", [])):
        issues.append("forbidden_claim")
    return {"passedTechnicalChecks": not issues, "issues": issues}
