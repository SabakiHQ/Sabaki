const timedGames = new WeakMap()

function hasMoveTiming(tree) {
  if (!timedGames.has(tree)) {
    let timed = false
    for (let {data} of tree.listNodes()) {
      if (
        ['B', 'W'].some(
          (color) =>
            data[color] != null && parseNumber(data[`${color}L`]?.[0]) != null,
        )
      ) {
        timed = true
        break
      }
    }
    timedGames.set(tree, timed)
  }
  return timedGames.get(tree)
}

function parseNumber(value) {
  if (value == null || value.trim() === '') return null
  let number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function formatTime(seconds) {
  seconds = Math.floor(seconds)
  let hours = Math.floor(seconds / 3600)
  let minutes = Math.floor(seconds / 60) % 60
  let remainder = String(seconds % 60).padStart(2, '0')

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`
}

export function getPlayerTimes(tree, id) {
  if (!hasMoveTiming(tree)) return [null, null]

  let times = [null, null]
  let overtimeCounts = [null, null]

  // Only inherit from ancestors, so rewinding or changing variations cannot
  // pick up clocks from later moves or another branch.
  for (let node of tree.listNodesVertically(id, -1, {})) {
    for (let [index, color] of ['B', 'W'].entries()) {
      if (times[index] == null) {
        times[index] = parseNumber(node.data[`${color}L`]?.[0])
      }
      if (overtimeCounts[index] == null) {
        overtimeCounts[index] = parseNumber(node.data[`O${color}`]?.[0])
      }
    }
  }

  let mainTime = parseNumber(tree.root.data.TM?.[0])
  let overtime = tree.root.data.OT?.[0] || null

  return times.map((time, index) => {
    time = time ?? mainTime
    let count = overtimeCounts[index]
    if (time == null) return count == null ? overtime : `×${count}`
    return formatTime(time) + (count == null ? '' : ` ×${count}`)
  })
}
