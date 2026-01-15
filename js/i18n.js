/**
 * ============================================
 * RETURNFY i18n - Internationalization System
 * ============================================
 *
 * Automatic language detection based on IP geolocation
 * with manual language switcher
 */

// Supported languages
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'pt-BR': 'Português (BR)',
  'pt-PT': 'Português (PT)',
  'es': 'Español',
  'it': 'Italiano',
  'pl': 'Polski',
  'cs': 'Čeština'
};

// Country to language mapping
const COUNTRY_TO_LANGUAGE = {
  'BR': 'pt-BR',
  'PT': 'pt-PT',
  'ES': 'es',
  'IT': 'it',
  'PL': 'pl',
  'CZ': 'cs'
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Current translations cache
let currentTranslations = {};
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Detect user's country from IP using ipapi.co (free tier)
 */
async function detectCountryFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || null;
  } catch (error) {
    console.warn('[i18n] Failed to detect country from IP:', error);
    return null;
  }
}

/**
 * Get language from localStorage or browser preference
 */
function getSavedLanguage() {
  // Check localStorage first (manual selection)
  const saved = localStorage.getItem('returnfy_language');
  if (saved && SUPPORTED_LANGUAGES[saved]) {
    return saved;
  }

  // Check browser language
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang) {
    // Try exact match first
    if (SUPPORTED_LANGUAGES[browserLang]) {
      return browserLang;
    }
    // Try language without region (e.g., 'en' from 'en-US')
    const langCode = browserLang.split('-')[0];
    if (SUPPORTED_LANGUAGES[langCode]) {
      return langCode;
    }
  }

  return null;
}

/**
 * Load translations for a specific language
 */
async function loadTranslations(lang) {
  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${lang}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[i18n] Error loading translations:', error);
    // Fallback to English
    if (lang !== DEFAULT_LANGUAGE) {
      return await loadTranslations(DEFAULT_LANGUAGE);
    }
    return {};
  }
}

/**
 * Apply translations to the page
 */
function applyTranslations(translations) {
  const elements = document.querySelectorAll('[data-i18n]');

  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) {
      // Check if element has a placeholder attribute
      if (el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', translations[key]);
      } else {
        el.textContent = translations[key];
      }
    }
  });

  currentTranslations = translations;
}

/**
 * Get translated text by key
 */
function t(key, replacements = {}) {
  let text = currentTranslations[key] || key;

  // Replace placeholders like {current} with values
  Object.keys(replacements).forEach(placeholder => {
    text = text.replace(`{${placeholder}}`, replacements[placeholder]);
  });

  return text;
}

/**
 * Initialize i18n system
 */
async function initI18n() {
  console.log('[i18n] Initializing...');

  // Check if user has manually selected a language
  let language = getSavedLanguage();

  // If no manual selection, detect from IP
  if (!language) {
    const country = await detectCountryFromIP();
    if (country && COUNTRY_TO_LANGUAGE[country]) {
      language = COUNTRY_TO_LANGUAGE[country];
      console.log(`[i18n] Detected country: ${country}, using language: ${language}`);
    }
  } else {
    console.log(`[i18n] Using saved/browser language: ${language}`);
  }

  // Fallback to default
  if (!language) {
    language = DEFAULT_LANGUAGE;
    console.log(`[i18n] Using default language: ${language}`);
  }

  // Load and apply translations
  await setLanguage(language);

  // Create language switcher
  createLanguageSwitcher();
}

/**
 * Set the current language
 */
async function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES[lang]) {
    console.warn(`[i18n] Unsupported language: ${lang}`);
    lang = DEFAULT_LANGUAGE;
  }

  console.log(`[i18n] Loading language: ${lang}`);

  const translations = await loadTranslations(lang);
  applyTranslations(translations);

  currentLanguage = lang;
  localStorage.setItem('returnfy_language', lang);

  // Update document lang attribute
  document.documentElement.lang = lang;

  // Update language switcher
  updateLanguageSwitcher();

  console.log(`[i18n] Language set to: ${lang}`);
}

/**
 * Create language switcher in footer
 */
function createLanguageSwitcher() {
  // Check if footer exists
  const footer = document.querySelector('body > .container');
  if (!footer) return;

  // Create switcher HTML
  const switcherHTML = `
    <div style="text-align: center; padding: 16px 20px 20px; margin-top: 12px;">
      <div style="display: inline-flex; align-items: center; gap: 12px; background: white; padding: 12px 16px; border-radius: 8px; border: 1px solid #e1e3e5; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6d7175;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <select id="languageSwitcher" style="border: none; background: none; font-size: 14px; font-weight: 500; color: #202223; cursor: pointer; outline: none; font-family: inherit;">
          ${Object.keys(SUPPORTED_LANGUAGES).map(code =>
            `<option value="${code}">${SUPPORTED_LANGUAGES[code]}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `;

  // Insert before the last footer text
  footer.insertAdjacentHTML('beforeend', switcherHTML);

  // Add event listener
  const switcher = document.getElementById('languageSwitcher');
  switcher.value = currentLanguage;
  switcher.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });
}

/**
 * Update language switcher selection
 */
function updateLanguageSwitcher() {
  const switcher = document.getElementById('languageSwitcher');
  if (switcher) {
    switcher.value = currentLanguage;
  }
}

// Export functions for use in other scripts
window.i18n = {
  init: initI18n,
  setLanguage: setLanguage,
  t: t,
  getCurrentLanguage: () => currentLanguage,
  getSupportedLanguages: () => SUPPORTED_LANGUAGES
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
