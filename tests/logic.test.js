import { describe, it, expect } from 'vitest'
import phrasebank from '../src/data/phrasebank.json'
import glossary from '../src/data/glossary.json'
import manglish from '../src/data/manglish.json'
import { extractNumbers, checkNumbers, normalizeDigits } from '../src/lib/numbers.js'
import { decideAction } from '../src/lib/confidence.js'
import { similarity, normalizeText } from '../src/lib/text.js'
import { findPhrase, normalizeManglish, applyGlossary, phrasesForTrade, TRADES } from '../src/lib/phrases.js'
import { translate, TranslateError } from '../src/lib/translate.js'
import { classifyLevels } from '../src/lib/audioLevel.js'
import { isLevelUnlocked, levelStats, scoreAttempt } from '../src/lib/learn.js'
import { DEMOS } from '../src/lib/demos.js'

describe('numbers', () => {
  it('reads digits in Malayalam, Devanagari and Tamil scripts', () => {
    expect(normalizeDigits('൪൦൦ ४०० ௪௦௦')).toBe('400 400 400')
  })
  it('extracts digits and English number words', () => {
    expect(extractNumbers('The price is 400 rupees')).toEqual([400])
    expect(extractNumbers('three hundred and fifty rupees')).toEqual([350])
    expect(extractNumbers('It takes ten minutes')).toEqual([10])
  })
  it('extracts common Malayalam number words', () => {
    expect(extractNumbers('നാനൂറ് രൂപ')).toEqual([400])
    expect(extractNumbers('നാനൂറ്റി അമ്പത് രൂപ')).toEqual([450])
  })
  it('matches when the numbers survive translation', () => {
    expect(checkNumbers('കിലോയ്ക്ക് 400 രൂപ', '400 rupees per kilo', 'en').status).toBe('match')
  })
  it('blocks a changed price', () => {
    const r = checkNumbers('കിലോയ്ക്ക് 400 രൂപ', '40 rupees per kilo', 'en')
    expect(r.status).toBe('mismatch')
  })
  it('blocks an invented large number', () => {
    expect(checkNumbers('ഈ മീൻ ഫ്രഷ് ആണ്', 'This fish is fresh, 500 rupees', 'en').status).toBe('mismatch')
  })
  it('ignores stray small words like "one"', () => {
    expect(checkNumbers('ഇത് നല്ലതാണ്', 'This one is good', 'en').status).toBe('none')
  })
  it('flags numbers that vanished in Hindi or Tamil as unverified, not wrong', () => {
    expect(checkNumbers('കിലോയ്ക്ക് 400 രൂപ', 'चार सौ रुपये प्रति किलो', 'hi').status).toBe('unverified')
  })
})

describe('confidence', () => {
  it('rejects empty and low confidence', () => {
    expect(decideAction('', 0.9).kind).toBe('empty')
    expect(decideAction('hello', 0.5).kind).toBe('empty')
  })
  it('asks to confirm between 0.6 and 0.75', () => {
    expect(decideAction('hello', 0.6).kind).toBe('confirm')
    expect(decideAction('hello', 0.74).kind).toBe('confirm')
  })
  it('accepts 0.75 and above, and treats unknown confidence as acceptable', () => {
    expect(decideAction('hello', 0.75).kind).toBe('ok')
    expect(decideAction('hello', 0).kind).toBe('ok')
    expect(decideAction('hello', undefined).kind).toBe('ok')
  })
})

describe('text similarity', () => {
  it('ignores punctuation and case', () => {
    expect(similarity('This fish is fresh!', 'this fish is fresh')).toBe(1)
  })
  it('ignores zero-width joiners in Malayalam', () => {
    expect(normalizeText('ന‍')).toBe('ന')
  })
  it('scores different sentences low', () => {
    expect(similarity('hello there', 'completely different words')).toBeLessThan(0.5)
  })
})

describe('phrase bank', () => {
  it('has 12 phrases per trade, all four languages filled', () => {
    for (const t of TRADES) {
      const list = phrasesForTrade(t)
      expect(list).toHaveLength(12)
      for (const p of list) for (const k of ['en', 'ml', 'pron', 'hi', 'ta']) expect(p[k], `${p.id}.${k}`).toBeTruthy()
    }
  })
  it('keeps the same numbers in every language of a phrase', () => {
    for (const p of phrasebank.filter((x) => x.trade !== 'common')) {
      const en = extractNumbers(p.en).join(',')
      expect(extractNumbers(p.ml).join(','), p.id).toBe(en)
    }
  })
  it('finds an exact phrase and returns the reviewed translation', () => {
    const hit = findPhrase('കിലോയ്ക്ക് 400 രൂപയാണ്', 'ml', 'en', 'fish')
    expect(hit.target).toBe('The price is 400 rupees per kilo.')
  })
  it('never answers 300 with the 400 phrase', () => {
    expect(findPhrase('കിലോയ്ക്ക് 300 രൂപയാണ്', 'ml', 'en', 'fish')).toBeNull()
  })
  it('does not match phrases from another trade', () => {
    expect(findPhrase('ഹെയർകട്ട് 200 രൂപയാണ്', 'ml', 'en', 'fish')).toBeNull()
  })
  it('every demo line resolves from the phrase bank in every language', () => {
    for (const trade of TRADES) {
      for (const step of DEMOS[trade]) {
        const from = step.side === 'worker' ? 'ml' : 'en'
        const to = step.side === 'worker' ? ['en', 'hi', 'ta'] : ['ml']
        for (const t of to) expect(findPhrase(step.text, from, t, trade), `${trade}: ${step.text} -> ${t}`).not.toBeNull()
      }
    }
  })
})

describe('Manglish and glossary', () => {
  it('turns Malayalam-script English into English', () => {
    expect(normalizeManglish('ഈ മീൻ ഫ്രഷ് ആണ്, റേറ്റ് കുറവാണ്')).toBe('ഈ മീൻ fresh ആണ്, rate കുറവാണ്')
  })
  it('prefers the longer match', () => {
    expect(normalizeManglish('റൂം നമ്പർ 12')).toBe('room number 12')
  })
  it('does not replace inside a longer word', () => {
    expect(normalizeManglish('ഫ്രഷായിട്ടുള്ള')).toBe('ഫ്രഷായിട്ടുള്ള')
  })
  it('swaps fish names for the right English term', () => {
    expect(applyGlossary('കരിമീൻ ഉണ്ട്', 'ml', 'en', 'fish')).toContain('pearl spot')
  })
  it('swaps English fish names back to Malayalam for the worker', () => {
    expect(applyGlossary('Do you have prawns?', 'en', 'ml', 'fish')).toContain('ചെമ്മീൻ')
  })
  it('has at least 10 glossary terms per trade and valid Manglish entries', () => {
    for (const t of TRADES) expect(glossary.filter((g) => g.trade === t).length).toBeGreaterThanOrEqual(10)
    expect(Object.keys(manglish).length).toBeGreaterThan(20)
  })
})

describe('translate', () => {
  it('uses the phrase bank without touching the network', async () => {
    const fetchImpl = () => { throw new Error('should not be called') }
    const r = await translate('ഈ മീൻ ഫ്രഷ് ആണ്.', 'ml', 'hi', { trade: 'fish', fetchImpl })
    expect(r.via).toBe('phrasebank')
    expect(r.text).toBe('यह मछली ताज़ी है।')
  })
  it('falls back to the model and cleans Manglish and fish names first', async () => {
    let asked = ''
    const fetchImpl = async (url) => {
      asked = decodeURIComponent(url)
      return { ok: true, status: 200, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'We have fresh pearl spot' } }) }
    }
    const r = await translate('കരിമീൻ ഫ്രഷ് ഉണ്ട്', 'ml', 'en', { trade: 'fish', fetchImpl })
    expect(r.via).toBe('model')
    expect(asked).toContain('pearl spot')
    expect(asked).toContain('fresh')
  })
  it('reports quota and network problems with clear codes', async () => {
    const quota = async () => ({ ok: true, status: 200, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL' } }) })
    await expect(translate('എന്തോ ഒന്ന്', 'ml', 'en', { trade: 'fish', fetchImpl: quota })).rejects.toMatchObject({ code: 'quota' })
    const down = async () => { throw new TypeError('Failed to fetch') }
    await expect(translate('എന്തോ ഒന്ന്', 'ml', 'en', { trade: 'fish', fetchImpl: down })).rejects.toBeInstanceOf(TranslateError)
  })
})

describe('audio level', () => {
  it('flags quiet, noisy and fine recordings', () => {
    expect(classifyLevels({ floor: 0.001, peak: 0.01 })).toBe('quiet')
    expect(classifyLevels({ floor: 0.12, peak: 0.3 })).toBe('noisy')
    expect(classifyLevels({ floor: 0.01, peak: 0.2 })).toBe('ok')
  })
})

describe('learning', () => {
  it('scores the best alternative', () => {
    const s = scoreAttempt('This fish is fresh.', [{ transcript: 'this fish is rush' }, { transcript: 'this fish is fresh' }])
    expect(s).toBe(1)
  })
  it('unlocks level 2 after 80% (rounded down) of level 1', () => {
    const progress = { 'fish-1': { passed: true }, 'fish-2': { passed: true } }
    expect(isLevelUnlocked('fish', 2, progress)).toBe(false)
    progress['fish-3'] = { passed: true }
    expect(isLevelUnlocked('fish', 2, progress)).toBe(true)
    expect(levelStats('fish', 1, progress)).toEqual({ total: 4, passed: 3 })
    expect(isLevelUnlocked('fish', 3, progress)).toBe(false)
  })
})
