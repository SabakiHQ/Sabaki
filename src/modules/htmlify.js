export function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// The link patterns may match quotes, so escape them before a match is
// placed inside an attribute value.
function escapeQuotes(input) {
  return input.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function htmlify(input, {moveNumberTitle = ''} = {}) {
  let urlRegex = /\b(ht|f)tps?:\/\/[^\s<]+[^<.,:;"\')\]\s](\/\B|\b)/i
  let emailRegex = /\b[^\s@<]+@[^\s@<]+\b/i
  let variationRegex =
    /\b(black\s+?|white\s+?|[bw]\s*)(([a-hj-z]\d{1,2}[ ]+)+[a-hj-z]\d{1,2})\b/i
  let coordRegex = /\b[a-hj-z]\d{1,2}\b/i
  let movenumberRegex = /(\B#|\bmove[ ]+)(\d+)\b/i
  let totalRegex = new RegExp(
    `(${[urlRegex, emailRegex, variationRegex, coordRegex, movenumberRegex]
      .map((regex) => regex.source)
      .join('|')})`,
    'gi',
  )

  input = input.replace(totalRegex, (match) => {
    let tokens

    if (urlRegex.test(match))
      return `<a href="${escapeQuotes(match)}" class="comment-external">${match}</a>`
    if (emailRegex.test(match))
      return `<a href="mailto:${escapeQuotes(match)}" class="comment-external">${match}</a>`
    if ((tokens = variationRegex.exec(match)))
      return `<span
        class="comment-variation"
        data-color="${tokens[1] ? tokens[1][0].toLowerCase() : ''}"
        data-moves="${tokens[2]}"
      >${match}</span>`
    if (coordRegex.test(match))
      return `<span class="comment-coord">${match}</span>`
    if ((tokens = movenumberRegex.exec(match)))
      return `<a
        href="#"
        class="comment-movenumber"
        title="${moveNumberTitle}"
        data-movenumber="${tokens[2]}"
      >${match}</a>`
  })

  return input
}
