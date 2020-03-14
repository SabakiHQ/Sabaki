# Engine Analysis Integration

> This guide is for engine developers.

There a couple of extra GTP commands you can implement to integrate with
Sabaki's engine analysis.

## `analyze <color> <interval>`

### Arguments

- `color` - The
  [GTP color](https://www.lysator.liu.se/~gunnar/gtp/gtp2-spec-draft2/gtp2-spec.html#SECTION00042000000000000000)
  of the player whose perspective we want to analyze.
- `interval` - The interval in which updates should occur in centiseconds.

### Response

First, output a `=` to indicate the start of the response. Every `interval`
centisecond, output a line of the following form:

```
info <keyvalue>... pv <vertex>... (info <keyvalue>... pv <vertex>...)...

# Example

info move D4 visits 836 winrate 4656 prior 839 lcb 4640 order 0 pv D4 Q16 D16 Q3 R5 info move D16 visits 856 winrate 4655 prior 856 lcb 4639 order 1 pv D16 Q4 Q16 C4 E3 info move Q4 visits 828 winrate 4653 prior 877 lcb 4633 order 2 pv Q4 D16 Q16 D3 C5
```

where `keyvalue` is two non-whitespace strings joined by a space and `vertex` a
[GTP vertex](https://www.lysator.liu.se/~gunnar/gtp/gtp2-spec-draft2/gtp2-spec.html#SECTION00042000000000000000).

Necessary key value pairs are:

- `move` - The
  [GTP vertex](https://www.lysator.liu.se/~gunnar/gtp/gtp2-spec-draft2/gtp2-spec.html#SECTION00042000000000000000)
  of the move being analyzed.
- `visits` - The number of visits invested in `move` so far.
- `winrate` - If specified as an integer, it represents the win rate percentage
  times 100 of `move`, e.g. `9543` for `95.43%`. If specified as a float, i.e.
  includes a `.`, it represents the win rate percentage given between `0.0` and
  `1.0`.

Optional key value pairs:

- `scoreLead` - The predicted average number of points that the current side is
  leading by when playing `move`.

The response will terminate when any input is written to `stdin`.

## `genmove_analyze <color> <interval>`

### Arguments

- `color` - The
  [GTP color](https://www.lysator.liu.se/~gunnar/gtp/gtp2-spec-draft2/gtp2-spec.html#SECTION00042000000000000000)
  of the player whose move we want to generate.
- `interval` - The interval in which updates should occur, in centiseconds.

### Response

First, output a `=` to indicate the start of the response. Every `interval`
centisecond, output a line of the following form:

```
info <keyvalue>... pv <vertex>... (info <keyvalue>... pv <vertex>...)...
```

See [`analyze`](#analyze-color-interval) for more details.

In the end, when the engine has finished generating the move, the response
should terminate with the following line:

```
play <vertex>
```
