"""Rychlé kontroly dat a hodnoticích podmínek; nepotřebují PyTorch."""

import json
from pathlib import Path
import tempfile
import unittest

from chat_data import assert_evaluation_separate, read_cases, read_data
from chat_quality import assess


class ChatDataTests(unittest.TestCase):
    def read(self, training, validation):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "data.json"
            path.write_text(json.dumps({"training": training, "validation": validation}), encoding="utf-8")
            return read_data(path)

    def test_catches_same_question_with_different_answers(self):
        with self.assertRaisesRegex(ValueError, "zadání"):
            self.read([[["user", "Ahoj"], ["assistant", "Ahoj"]]],
                      [[["user", "Ahoj"], ["assistant", "Čau"]]])

    def test_catches_shared_prefix_in_longer_conversation(self):
        with self.assertRaisesRegex(ValueError, "zadání"):
            self.read([[["user", "Ahoj"], ["assistant", "Ahoj"], ["user", "Jak to jde?"], ["assistant", "Dobře"]]],
                      [[["user", "AHOJ"], ["assistant", "Čau"]]])

    def test_normalizes_unicode_and_whitespace(self):
        with self.assertRaisesRegex(ValueError, "zadání"):
            self.read([[["user", "Téma  dne"], ["assistant", "Ano"]]],
                      [[["user", "Te\u0301ma\ndne"], ["assistant", "Jiné"]]])

    def test_question_without_accents_or_punctuation_is_not_independent(self):
        with self.assertRaisesRegex(ValueError, "zadání"):
            self.read([[["user", "Jak se máš?"], ["assistant", "Dobře"]]],
                      [[["user", "JAK SE MAS!"], ["assistant", "Jiné"]]])

    def test_rejects_duplicate_conversation(self):
        item = [["user", "Ahoj"], ["assistant", "Čau"]]
        with self.assertRaisesRegex(ValueError, "Opakovaný"):
            self.read([item, item], [[["user", "Jiný dotaz"], ["assistant", "Odpověď"]]])

    def test_rejects_wrong_role_and_empty_messages(self):
        for item in ([[["assistant", "Ahoj"], ["assistant", "Čau"]]],
                     [[["user", " "], ["assistant", "Čau"]]]):
            with self.assertRaises(ValueError):
                self.read(item, [[["user", "Dotaz"], ["assistant", "Odpověď"]]])

    def test_heldout_question_must_not_appear_in_either_split(self):
        data = {"training": [[["user", "Ahoj"], ["assistant", "Čau"]]], "validation": []}
        with self.assertRaisesRegex(ValueError, "překrývá"):
            assert_evaluation_separate(data, [{"id": "a", "messages": [["user", "Ahoj"]]}])

    def test_eval_cases_are_distinct(self):
        cases = read_cases()
        self.assertEqual(len(cases), 30)
        assert_evaluation_separate({"training": [], "validation": []}, cases)

    def test_assessment_distinguishes_topic_and_fabricated_action(self):
        case = {"mustMentionAny": ["poznámk"], "forbidden": ["uložil jsem"]}
        self.assertTrue(assess(case, {"text": "Poznámku najdeš v aplikaci.", "endedWithEos": True})["passedTechnicalChecks"])
        self.assertIn("forbidden_claim", assess(case, {"text": "Uložil jsem poznámku.", "endedWithEos": True})["issues"])
        self.assertIn("missing_expected_topic", assess(case, {"text": "Ahoj.", "endedWithEos": True})["issues"])

    def test_assessment_catches_broken_and_unfinished_text(self):
        for answer, issue in (("", "empty"), ("Ahoj\ufffd", "invalid_text"),
                              ("ano ano ano ano", "repetition")):
            self.assertIn(issue, assess({}, {"text": answer, "endedWithEos": True})["issues"])
        self.assertIn("no_eos", assess({}, {"text": "V pořádku.", "endedWithEos": False})["issues"])


if __name__ == "__main__":
    unittest.main()
