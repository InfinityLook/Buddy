"""Testy blokace opakování v decoding.py – bez závislosti na PyTorchi.

Zrcadlí stejné tři scénáře jako buddy-generation-runtime.test.ts pro JS
dekodér: blokace + výběr další nejlepší varianty, bezpečný návrat při
vyčerpání všech kandidátů, a žádná falešná blokace u krátké historie.
"""

import unittest

from decoding import banned_by_repeat


class BannedByRepeatTests(unittest.TestCase):
    def test_vynecha_token_ktery_by_zopakoval_trigram(self):
        # [6, 7, 6] se už v historii objevilo; aktuální sufix je [6, 7],
        # takže doplnění dalším 6 by trigram přesně zopakovalo.
        self.assertEqual(banned_by_repeat([6, 7, 6, 7]), {6})

    def test_vrati_prazdnou_mnozinu_kdyz_historie_nehrozi(self):
        self.assertEqual(banned_by_repeat([6]), set())
        self.assertEqual(banned_by_repeat([]), set())
        self.assertEqual(banned_by_repeat([6, 7]), set())

    def test_zablokuje_vsechny_kandidaty_kdyz_je_to_opravnene(self):
        # V malém slovníku (jen EOS=2 a token 6 jsou platné) historie
        # zablokuje obě – volající se musí vrátit k nezablokovanému výběru.
        recent = [6, 6, 2, 6, 6, 6, 6, 6]
        self.assertEqual(banned_by_repeat(recent), {2, 6})

    def test_nerozsiri_blokaci_mimo_skutecny_opakovany_trigram(self):
        # Trigram [1, 2, 3] se neopakuje, takže nic nesmí být blokováno.
        self.assertEqual(banned_by_repeat([1, 2, 3, 4, 5]), set())


if __name__ == "__main__":
    unittest.main()
