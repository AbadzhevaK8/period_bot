import { CSSProperties } from 'react'

export type ThemeId =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'

export type PhaseName = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'

export const themes: Array<{ id: ThemeId; label: string }> = [
  { id: '1', label: 'Neon Pop' },
  { id: '2', label: 'Candy Rush' },
  { id: '3', label: 'Primary Beat' },
  { id: '4', label: 'Tropical' },
  { id: '5', label: 'Cyber Acid' },
  { id: '6', label: 'Sunset' },
  { id: '7', label: 'Ocean Glow' },
  { id: '8', label: 'Berry Club' },
  { id: '9', label: 'Sorbet' },
  { id: '10', label: 'Carnival' },
  { id: '11', label: 'Heatwave' },
  { id: '12', label: 'Jewel Box' },
  { id: '13', label: 'Electric Sky' },
  { id: '14', label: 'Citrus' },
  { id: '15', label: 'Bubblegum' },
  { id: '16', label: 'Signal' },
]

export const themePreviewColors: Record<ThemeId, { background: string; text: string }> = {
  '1': { background: '#282A36', text: '#F8F8F2' },
  '2': { background: '#F8F8F2', text: '#282A36' },
  '3': { background: '#1E222A', text: '#E6EFF7' },
  '4': { background: '#FAFAFA', text: '#24292E' },
  '5': { background: '#1A1B26', text: '#C0CAF5' },
  '6': { background: '#F7F8FC', text: '#1F2335' },
  '7': { background: '#242933', text: '#ECEFF4' },
  '8': { background: '#ECEFF4', text: '#2E3440' },
  '9': { background: '#1E1E2E', text: '#CDD6F4' },
  '10': { background: '#EFF1F5', text: '#4C4F69' },
  '11': { background: '#282828', text: '#FBF1C7' },
  '12': { background: '#FBF1C7', text: '#3C3836' },
  '13': { background: '#002B36', text: '#EEE8D5' },
  '14': { background: '#FDF6E3', text: '#073642' },
  '15': { background: '#2E2E2E', text: '#D6D6D6' },
  '16': { background: '#D6D6D6', text: '#2E2E2E' },
}

export const themePhaseColors: Record<ThemeId, Record<PhaseName, string>> = {
  '1': { menstruation: '#FF2DAA', follicular: '#00F5A0', ovulation: '#FFE156', luteal: '#8A4FFF' },
  '2': { menstruation: '#FF6B9A', follicular: '#4ECDC4', ovulation: '#FFE66D', luteal: '#6A4CFF' },
  '3': { menstruation: '#0057FF', follicular: '#FF006E', ovulation: '#FFD500', luteal: '#00B050' },
  '4': { menstruation: '#00B4D8', follicular: '#FF9F1C', ovulation: '#F72585', luteal: '#70E000' },
  '5': { menstruation: '#B6FF00', follicular: '#00A3FF', ovulation: '#FF00C8', luteal: '#FF7A00' },
  '6': { menstruation: '#FF7A18', follicular: '#E83F6F', ovulation: '#3A0CA3', luteal: '#FFD166' },
  '7': { menstruation: '#0077B6', follicular: '#00B4D8', ovulation: '#90E0EF', luteal: '#7400B8' },
  '8': { menstruation: '#D81159', follicular: '#4361EE', ovulation: '#7209B7', luteal: '#FF8C42' },
  '9': { menstruation: '#FFAFCC', follicular: '#BDE0FE', ovulation: '#CAFFBF', luteal: '#FFC8DD' },
  '10': { menstruation: '#00BBF9', follicular: '#F15BB5', ovulation: '#FEE440', luteal: '#9B5DE5' },
  '11': { menstruation: '#F94144', follicular: '#F3722C', ovulation: '#F9C74F', luteal: '#43AA8B' },
  '12': { menstruation: '#009B72', follicular: '#2D00F7', ovulation: '#FFBA08', luteal: '#D00000' },
  '13': { menstruation: '#00F5D4', follicular: '#00BBF9', ovulation: '#F15BB5', luteal: '#FEE440' },
  '14': { menstruation: '#FFEA00', follicular: '#FF7B00', ovulation: '#80B918', luteal: '#00A8E8' },
  '15': { menstruation: '#FF70A6', follicular: '#70D6FF', ovulation: '#FF9770', luteal: '#E9FF70' },
  '16': { menstruation: '#0000FF', follicular: '#FF0000', ovulation: '#00C853', luteal: '#FFD600' },
}

export function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}

export function getStoredTheme() {
  const saved = localStorage.getItem('period_theme')
  return isThemeId(saved) ? saved : '1'
}

export function applyTheme(theme: ThemeId) {
  localStorage.setItem('period_theme', theme)
  document.documentElement.dataset.theme = theme
}

export function phaseColorForTheme(theme: ThemeId, phaseName?: string) {
  if (phaseName === 'menstruation' || phaseName === 'follicular' || phaseName === 'ovulation' || phaseName === 'luteal') {
    return themePhaseColors[theme][phaseName]
  }
  return themePhaseColors[theme].follicular
}

function readableTextColor(hexColor: string) {
  const hex = hexColor.replace('#', '')
  const channels = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((channel) => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  const whiteContrast = 1.05 / (luminance + 0.05)
  const blackContrast = (luminance + 0.05) / 0.05

  return blackContrast >= whiteContrast ? '#111827' : '#FFFFFF'
}

export function phaseStyleForTheme(_theme: ThemeId, phaseColor: string) {
  return {
    '--day-cell-text': readableTextColor(phaseColor),
    background: phaseColor,
  } as CSSProperties
}

export function dayCardStyleForTheme(theme: ThemeId, phaseColor: string) {
  return {
    ...phaseStyleForTheme(theme, phaseColor),
    '--day-card-phase': phaseColor,
  } as CSSProperties
}
