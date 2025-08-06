const API_CONFIG = {
    GROK: {
        key: 'xai-zSIdhvUYKuPsvpUz0BhSZXP3WrwiXBQI1JXlUKjLOHQZX2gT1wJNAVEFwIGaQybzxP7flfUBkQhOzPHF',
        baseUrl: 'https://api.x.ai/v1',
        model: 'grok-2-1212',
        enabled: true // Controlador de estado
    },
    GEMINI: {
        key: 'AIzaSyB-l1hH_2N028RC_KxRT7vjt9w_8V9CdAU',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-1.5-flash',
        enabled: true
    },
    CNPJ: {
        urls: [
            'https://receitaws.com.br/v1/cnpj/',
            'https://brasilapi.com.br/api/cnpj/v1/',
            'https://publica.cnpj.ws/cnpj/'
        ]
    },
    SOCIAL: {
        instagram: {
            enabled: true,
            fallback: true // Usar dados simulados se APIs falharem
        },
        facebook: {
            enabled: true,
            fallback: true
        }
    },
    FALLBACK_MODE: window.location.hostname === 'localhost', // Auto-detect local
    MAX_RETRIES: 3,
    TIMEOUT: 30000 // 30 segundos
};

// Rate limiting aprimorado
const RATE_LIMITS = {
    GROK: { requests: 50, window: 60000, current: 0, reset: Date.now() },
    GEMINI: { requests: 30, window: 60000, current: 0, reset: Date.now() },
    CNPJ: { requests: 2, window: 60000, current: 0, reset: Date.now() }
};

// Cache com TTL inteligente
const CACHE_CONFIG = {
    company: 86400000,     // 24 horas
    social: 3600000,       // 1 hora
    ai_analysis: 7200000,  // 2 horas
    products: 86400000,    // 24 horas
    menu: 3600000          // 1 hora
};

// Log de status das APIs
console.log('🔧 Configuração PMG ProspecPro carregada:', {
    grok: API_CONFIG.GROK.enabled ? '✅' : '❌',
    gemini: API_CONFIG.GEMINI.enabled ? '✅' : '❌',
    fallback: API_CONFIG.FALLBACK_MODE ? '🔄' : '🚀'
});
