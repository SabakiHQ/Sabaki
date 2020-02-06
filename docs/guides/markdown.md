# Markdown in Sabaki

Sabaki supports a subset of _Markdown_ in the comments. If you're not familiar
with Markdown, I suggest you read the
[original syntax documentation](http://daringfireball.net/projects/markdown/syntax)
by John Gruber. Markdown is very straight-forward and simple to learn.

## Changes

To make a simple line break in Markdown, normally you'd have to end the line
with two spaces, but this is not required in Sabaki.

Code blocks don't work in Sabaki. Images will be simply converted into links.
HTML input is not allowed.

## Auto linking

Sabaki will automatically create clickable links for URLs and email addresses.

Board coordinates can also be detected automatically. Hovering over them will
show the position on the board.

As of Sabaki v0.12.3 you can link to specific moves in the main variation by
move number. Just write `#` followed by the move number and Sabaki will
automatically create a link, e.g:

```
> Soon after Shuusaku released his last move #127, although Gennan seems calm,
> however his ears suddenly got red. This is a natural response from the human
> body when one is in panic, Black must have played an outstanding move.
```
