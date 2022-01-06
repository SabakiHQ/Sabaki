# Spell Checker

You can choose the languages you want the spell checker to be aware of with the
setting `comments.langs`, e.g.

    "comments.langs": [
      "en-US",
      "fr-FR"
    ],

This said, you can pretend extra spellings are correct using `Add to Dictionary`
from the context menu that is activated on misspelled words.

The words you add to Sabaki with way populate the `Custom Dictionary.txt` you'll
find in your Sabaki configuration directory.

You may edit this file by hand, for example to add multiple words at once or to
remove wrong spellings. Just be sure:

- to do this when sabaki if off
- to remove the very last line if it starts with `checksum_v1 =`

The checksum will get recomputed when you add a new word with
`Add to Dictionary`.

Here is an excerpt of Romaji go terms (see
[Sensei's](https://senseis.xmp.net/?GoTerms)) you may be tempted to add:

    aji
    atari
    boshi
    chuban
    dame
    fuseki
    geta
    gote
    hane
    honte
    hoshi
    joseki
    kakari
    keima
    kikashi
    ko
    kogeima
    komi
    komoku
    kosumi
    miai
    moyo
    nikentobi
    nobi
    nozoki
    ogeima
    ponnuki
    sabaki
    san-san
    seki
    sente
    shibori
    shicho
    shimari
    tengen
    tenuki
    tesuji
    tewari
    tobi
    tsuke
    warikomi
    yose
