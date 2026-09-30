const PALETTE = [
  ['#ff885e', '#ff516a'],
  ['#ffcd6a', '#ffa85c'],
  ['#82b1ff', '#665fff'],
  ['#a0de7e', '#54cb68'],
  ['#53edd6', '#28c9b7'],
  ['#72d5fd', '#2a9ef1'],
  ['#e0a2f3', '#d669ed'],
]

function hash(value: string) {
  let result = 0
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0
  return result
}

function initials(title: string) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '#'
  if (/^\d/.test(words[0])) return words.join('').slice(-2)
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

type AvatarProps = {
  seed: string
  title: string
  size?: number
}

export function Avatar({ seed, title, size = 54 }: AvatarProps) {
  const [from, to] = PALETTE[hash(seed) % PALETTE.length]
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(${from}, ${to})` }}
      aria-hidden="true"
    >
      {initials(title)}
    </div>
  )
}
