export const darkColors = {
  // Основные цвета - адаптированы под логотип
  background: '#0F172A',
  surface: '#334155',
  card: '#334155',

  // Текст - более мягкие контрасты
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

  // Акцентные цвета - из логотипа
  primary: '#3B82F6', // Синий из логотипа
  primaryHover: '#2563EB',
  accent: '#06B6D4', // Бирюзовый из логотипа

  // Дополнительные цвета из логотипа
  orange: '#F97316', // Оранжевый из логотипа
  teal: '#06B6D4', // Бирюзовый из логотипа

  // Состояния
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Границы и разделители
  border: '#475569',
  divider: '#64748B',

  // Интерактивные элементы
  button: '#334155',
  buttonHover: '#475569',
  input: '#334155',
  inputBorder: '#475569',

  // Слайдер
  sliderMin: '#3B82F6',
  sliderMax: '#475569',
  sliderThumb: '#3B82F6',
};

export const lightColors = {
  // Основные цвета - адаптированы под логотип
  background: '#F8FAFC',
  surface: '#E2E8F0',
  card: '#E2E8F0',

  // Текст - контрастные цвета
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',

  // Акцентные цвета - из логотипа
  primary: '#3B82F6', // Синий из логотипа
  primaryHover: '#2563EB',
  accent: '#06B6D4', // Бирюзовый из логотипа

  // Дополнительные цвета из логотипа
  orange: '#F97316', // Оранжевый из логотипа
  teal: '#06B6D4', // Бирюзовый из логотипа

  // Состояния
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',

  // Границы и разделители
  border: '#CBD5E1',
  divider: '#94A3B8',

  // Интерактивные элементы
  button: '#E2E8F0',
  buttonHover: '#CBD5E1',
  input: '#FFFFFF',
  inputBorder: '#94A3B8',

  // Слайдер
  sliderMin: '#3B82F6',
  sliderMax: '#CBD5E1',
  sliderThumb: '#3B82F6',
};

export type ColorScheme = typeof darkColors;
