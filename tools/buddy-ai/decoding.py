"""Blokace opakování při generování – bez závislosti na PyTorchi.

Používá ji chat_pilot.py (diagnostický příklad v pilotním běhu) i
chat_probe.py (ukázky odpovědí a nezávislá kontrolní zadání) – obě cesty
generování mají stejné pravidlo proti smyčkám. Zrcadlí `bannedByRepeat` z
src/buddy/local/generation/runtime.ts (prohlížečový dekodér) co do logiky a
jména konstanty, jen přenesené do Pythonu. Díky nulové závislosti na torchi
je testovatelná i v prostředí, kde PyTorch chybí (viz test_chat_pilot.py).
"""

# Délka n-gramu, který se nesmí zopakovat (3 = zabrání doslovné smyčce, povolí běžné krátké shody).
NO_REPEAT_NGRAM_SIZE = 3


def banned_by_repeat(generated, n=NO_REPEAT_NGRAM_SIZE):
    """Tokeny, které by zopakovaly už vygenerovaný n-gram z `generated`.

    `generated` je prostý seznam ID tokenů (ne tensor) – jen už vygenerovaná
    část odpovědi, nikdy vstupní výzva. Prázdná množina, pokud historie na
    rozpoznání n-gramu ještě nestačí.
    """
    banned = set()
    prefix_length = n - 1
    if len(generated) <= prefix_length:
        return banned
    prefix_start = len(generated) - prefix_length
    prefix = generated[prefix_start:]
    for i in range(len(generated) - prefix_length):
        if generated[i:i + prefix_length] == prefix:
            banned.add(generated[i + prefix_length])
    return banned
