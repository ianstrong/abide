export const KEYS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export const CHORDS = [
  { id: 'major', label: 'Major', short: '', intervals: [0, 4, 7] },
  { id: 'minor', label: 'Minor', short: 'm', intervals: [0, 3, 7] },
  { id: 'maj7', label: 'Major 7', short: 'maj7', intervals: [0, 4, 7, 11] },
  { id: 'min7', label: 'Minor 7', short: 'm7', intervals: [0, 3, 7, 10] },
  { id: 'sus2', label: 'Sus2', short: 'sus2', intervals: [0, 2, 7] },
  { id: 'sus4', label: 'Sus4', short: 'sus4', intervals: [0, 5, 7] },
  { id: 'add9', label: 'Add9', short: 'add9', intervals: [0, 4, 7, 14] },
  { id: 'maj9', label: 'Major 9', short: 'maj9', intervals: [0, 4, 7, 11, 14] },
  { id: 'min9', label: 'Minor 9', short: 'm9', intervals: [0, 3, 7, 10, 14] },
] as const

export type ChordId = (typeof CHORDS)[number]['id']

export function isChordId(value: string): value is ChordId {
  return CHORDS.some((chord) => chord.id === value)
}

export function getChord(id: ChordId) {
  const chord = CHORDS.find((item) => item.id === id)
  if (!chord) throw new Error(`Unknown chord ${id}`)
  return chord
}

export function midiToFreq(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function noteName(midi: number) {
  const name = KEYS[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function transposedKeyIndex(keyIndex: number, transpose: number) {
  return (keyIndex + transpose + 1200) % 12
}

/**
 * Root sits near octave 3.
 * Tones a step apart are lifted an octave so the pad never rubs,
 * then the whole chord drops if the top note would get piercing.
 */
export function chordMidis(keyIndex: number, chordId: ChordId, transpose: number) {
  const chord = getChord(chordId)
  const root = 48 + keyIndex + transpose
  const voiced = chord.intervals.map((interval) => {
    let midi = root + interval
    while (midi > 76) midi -= 12
    while (midi < 43) midi += 12
    return midi
  })

  for (let pass = 0; pass < 5; pass += 1) {
    voiced.sort((a, b) => a - b)
    let lifted = false
    for (let i = 1; i < voiced.length; i += 1) {
      const gap = voiced[i] - voiced[i - 1]
      if (gap > 0 && gap <= 2 && voiced[i] + 12 <= 79) {
        voiced[i] += 12
        lifted = true
      }
    }
    if (!lifted) break
  }

  const unique = [...new Set(voiced)].sort((a, b) => a - b)
  const top = unique[unique.length - 1] ?? root
  if (top > 74) {
    return unique.map((midi) => midi - 12).sort((a, b) => a - b)
  }
  return unique
}

export function chordTitle(keyIndex: number, chordId: ChordId, transpose: number) {
  const chord = getChord(chordId)
  const name = KEYS[transposedKeyIndex(keyIndex, transpose)]
  return `${name} ${chord.label}`
}
