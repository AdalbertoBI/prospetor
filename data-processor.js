// Service Worker para processamento de dados em background
const CACHE_NAME = 'pmg-prospector-v1';
const urlsToCache = [
    '/',
    '/style.css',
    '/components.css',
    '/main.js',
    '/api-keys.js',
    '/imagens.json',
    '/catalog.json',
    '/competitors-data.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ Service Worker: Cache aberto');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('❌ Service Worker: Erro no cache:', error);
            })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - retorna resposta do cache
                if (response) {
                    return response;
                }

                return fetch(event.request).then((response) => {
                    // Verifica se a resposta é válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clona a resposta
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});

// Processamento de dados em background
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'PROCESS_MENU_DATA':
            processMenuData(data)
                .then((result) => {
                    event.ports[0].postMessage({ success: true, result });
                })
                .catch((error) => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
            break;

        case 'ANALYZE_COMPETITORS':
            analyzeCompetitors(data)
                .then((result) => {
                    event.ports[0].postMessage({ success: true, result });
                })
                .catch((error) => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
            break;

        case 'CACHE_CLEANUP':
            cleanupCache()
                .then(() => {
                    event.ports[0].postMessage({ success: true });
                });
            break;
    }
});

// Processamento de dados de cardápio
async function processMenuData(menuText) {
    try {
        const items = extractMenuItems(menuText);
        const categories = categorizeItems(items);
        const priceAnalysis = analyzePricing(items);
        const ingredients = extractIngredients(menuText);

        return {
            items,
            categories,
            priceAnalysis,
            ingredients,
            processedAt: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Erro no processamento do menu: ${error.message}`);
    }
}

// Extração de itens do menu
function extractMenuItems(text) {
    const items = [];
    
    // Padrões para identificar itens do menu
    const patterns = [
        // Padrão: Nome do item R$ preço
        /([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][^R$\n]{10,})\s*R\$\s*(\d+(?:,\d{2})?)/gi,
        // Padrão: Nome - Descrição - R$ preço
        /([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][^\-\n]{3,})\s*-\s*([^\-\n]{10,})\s*-\s*R\$\s*(\d+(?:,\d{2})?)/gi,
        // Padrão: Número. Nome R$ preço
        /\d+\.\s*([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][^R$\n]{10,})\s*R\$\s*(\d+(?:,\d{2})?)/gi
    ];

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const item = {
                name: match[1].trim(),
                price: parseFloat(match[2].replace(',', '.')),
                description: match[3] ? match[3].trim() : '',
                rawText: match[0]
            };
            
            if (item.name.length > 3 && item.price > 0) {
                items.push(item);
            }
        }
    });

    // Remover duplicatas baseadas no nome
    const uniqueItems = items.filter((item, index, self) =>
        index === self.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase())
    );

    return uniqueItems;
}

// Categorização inteligente de itens
function categorizeItems(items) {
    const categories = {
        'pizzas': [],
        'hambúrgueres': [],
        'massas': [],
        'carnes': [],
        'frutos_do_mar': [],
        'sobremesas': [],
        'bebidas': [],
        'entradas': [],
        'outros': []
    };

    const categoryKeywords = {
        'pizzas': ['pizza', 'margherita', 'calabresa', 'portuguesa', 'pepperoni', 'mozzarella'],
        'hambúrgueres': ['hambúrguer', 'burger', 'x-bacon', 'x-tudo', 'cheeseburger', 'sanduíche'],
        'massas': ['espaguete', 'lasanha', 'macarrão', 'penne', 'ravioli', 'nhoque', 'talharim'],
        'carnes': ['bife', 'picanha', 'alcatra', 'frango', 'costela', 'file', 'carne'],
        'frutos_do_mar': ['camarão', 'peixe', 'salmão', 'bacalhau', 'lula', 'polvo'],
        'sobremesas': ['pudim', 'torta', 'sorvete', 'mousse', 'brigadeiro', 'doce', 'açaí'],
        'bebidas': ['refrigerante', 'suco', 'água', 'cerveja', 'vinho', 'caipirinha', 'drink'],
        'entradas': ['salada', 'bruschetta', 'antipasto', 'entrada', 'aperitivo', 'porção']
    };

    items.forEach(item => {
        const itemName = item.name.toLowerCase();
        let categorized = false;

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => itemName.includes(keyword))) {
                categories[category].push(item);
                categorized = true;
                break;
            }
        }

        if (!categorized) {
            categories.outros.push(item);
        }
    });

    // Remover categorias vazias
    Object.keys(categories).forEach(key => {
        if (categories[key].length === 0) {
            delete categories[key];
        }
    });

    return categories;
}

// Análise de preços
function analyzePricing(items) {
    if (items.length === 0) {
        return { min: 0, max: 0, average: 0, median: 0 };
    }

    const prices = items.map(item => item.price).sort((a, b) => a - b);
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const median = prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];

    return {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        average: Math.round(average * 100) / 100,
        median: Math.round(median * 100) / 100,
        distribution: calculatePriceDistribution(prices)
    };
}

// Distribuição de preços por faixas
function calculatePriceDistribution(prices) {
    const ranges = {
        '0-15': 0,
        '15-30': 0,
        '30-50': 0,
        '50-100': 0,
        '100+': 0
    };

    prices.forEach(price => {
        if (price <= 15) ranges['0-15']++;
        else if (price <= 30) ranges['15-30']++;
        else if (price <= 50) ranges['30-50']++;
        else if (price <= 100) ranges['50-100']++;
        else ranges['100+']++;
    });

    return ranges;
}

// Extração de ingredientes comuns
function extractIngredients(text) {
    const commonIngredients = [
        'queijo', 'mozzarella', 'cheddar', 'gorgonzola', 'parmesão',
        'tomate', 'cebola', 'alho', 'manjericão', 'orégano',
        'carne', 'frango', 'bacon', 'presunto', 'calabresa',
        'camarão', 'salmão', 'atum', 'bacalhau',
        'batata', 'brócolis', 'cogumelo', 'azeitona', 'pimentão',
        'molho', 'azeite', 'vinagre', 'mostarda', 'maionese'
    ];

    const foundIngredients = [];
    const lowerText = text.toLowerCase();

    commonIngredients.forEach(ingredient => {
        if (lowerText.includes(ingredient)) {
            // Contar ocorrências
            const regex = new RegExp(ingredient, 'gi');
            const matches = lowerText.match(regex) || [];
            
            foundIngredients.push({
                ingredient,
                count: matches.length
            });
        }
    });

    // Ordenar por frequência
    return foundIngredients.sort((a, b) => b.count - a.count);
}

// Análise de concorrentes
async function analyzeCompetitors(data) {
    try {
        const { companyType, location, menuCategories } = data;
        
        // Simulação de análise de concorrentes
        const competitors = await findCompetitors(companyType, location);
        const marketAnalysis = analyzeMarketPosition(competitors, menuCategories);
        const opportunities = identifyOpportunities(competitors, menuCategories);

        return {
            competitors,
            marketAnalysis,
            opportunities,
            analyzedAt: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Erro na análise de concorrentes: ${error.message}`);
    }
}

// Busca por concorrentes
async function findCompetitors(type, location) {
    // Simulação - em produção integraria com APIs de negócios locais
    const competitorTypes = {
        'restaurante': ['Outback', 'Spoleto', 'Subway', 'Giraffas'],
        'pizzaria': ["Domino's", 'Pizza Hut', 'Habib\'s', 'Telepizza'],
        'lanchonete': ["McDonald's", 'Burger King', 'KFC', 'Bob\'s'],
        'padaria': ['Casa do Pão de Açúcar', 'Padaria Real', 'Bella Paulista']
    };

    const competitors = competitorTypes[type] || [];
    
    return competitors.map(name => ({
        name,
        type,
        location: location || 'Local',
        estimatedRevenue: Math.floor(Math.random() * 1000000) + 100000,
        marketShare: Math.floor(Math.random() * 20) + 5,
        strengths: generateRandomStrengths(),
        weaknesses: generateRandomWeaknesses()
    }));
}

function generateRandomStrengths() {
    const allStrengths = [
        'Marca forte', 'Localização privilegiada', 'Preços competitivos',
        'Qualidade superior', 'Atendimento excelente', 'Variedade de produtos',
        'Marketing eficaz', 'Fidelidade dos clientes'
    ];
    
    const count = Math.floor(Math.random() * 3) + 2;
    return shuffleArray(allStrengths).slice(0, count);
}

function generateRandomWeaknesses() {
    const allWeaknesses = [
        'Preços altos', 'Atendimento lento', 'Localização ruim',
        'Pouca variedade', 'Qualidade inconsistente', 'Marketing fraco',
        'Horário limitado', 'Estacionamento difícil'
    ];
    
    const count = Math.floor(Math.random() * 2) + 1;
    return shuffleArray(allWeaknesses).slice(0, count);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Análise da posição no mercado
function analyzeMarketPosition(competitors, categories) {
    const totalCompetitors = competitors.length;
    const avgMarketShare = competitors.reduce((sum, c) => sum + c.marketShare, 0) / totalCompetitors;
    
    return {
        competitorCount: totalCompetitors,
        avgMarketShare: Math.round(avgMarketShare * 100) / 100,
        marketSaturation: totalCompetitors > 5 ? 'Alta' : totalCompetitors > 2 ? 'Média' : 'Baixa',
        categories: categories || [],
        estimatedMarketSize: Math.floor(Math.random() * 10000000) + 1000000
    };
}

// Identificar oportunidades
function identifyOpportunities(competitors, categories) {
    const opportunities = [
        'Diferenciação por qualidade de ingredientes',
        'Foco em atendimento personalizado',
        'Estratégia de preços competitivos',
        'Marketing digital mais efetivo',
        'Parcerias com fornecedores locais',
        'Inovação no cardápio',
        'Programa de fidelidade',
        'Delivery otimizado'
    ];

    // Retornar 3-5 oportunidades aleatórias
    const count = Math.floor(Math.random() * 3) + 3;
    return shuffleArray(opportunities).slice(0, count);
}

// Limpeza de cache
async function cleanupCache() {
    try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
        
        await Promise.all(
            oldCaches.map(name => caches.delete(name))
        );

        console.log('✅ Service Worker: Cache limpo');
    } catch (error) {
        console.error('❌ Service Worker: Erro na limpeza do cache:', error);
    }
}

// Processamento de dados em lote
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(processQueuedData());
    }
});

async function processQueuedData() {
    // Processar dados em fila quando a conexão for restaurada
    console.log('🔄 Service Worker: Processando dados em fila...');
}

// Notificações push (para futuras implementações)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/assets/img/icon-192x192.png',
            badge: '/assets/img/badge-72x72.png',
            tag: 'pmg-notification',
            actions: [
                {
                    action: 'view',
                    title: 'Ver detalhes'
                },
                {
                    action: 'dismiss',
                    title: 'Dispensar'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
