class MLCategorization {
    constructor() {
        this.models = {
            menuClassifier: null,
            productMatcher: null,
            pricePredictor: null
        };
        
        this.trainingData = {
            menuPatterns: [],
            productAssociations: [],
            priceHistories: []
        };
        
        this.categories = {
            business_type: [
                'pizzaria', 'lanchonete', 'restaurante', 'padaria', 
                'sorveteria', 'cafeteria', 'bar', 'hotel', 'escola'
            ],
            menu_categories: [
                'pizzas', 'hambúrgueres', 'massas', 'carnes', 'frutos_do_mar',
                'sobremesas', 'bebidas', 'entradas', 'pratos_executivos'
            ],
            product_groups: [
                'farinhas', 'queijos', 'carnes', 'temperos', 'conservas',
                'laticínios', 'bebidas', 'congelados', 'doces'
            ]
        };
    }

    init() {
        this.loadTrainingData();
        this.initializeSimpleModels();
    }

    loadTrainingData() {
        // Carregar dados de treinamento do localStorage ou criar dataset inicial
        const stored = localStorage.getItem('pmg_ml_training');
        if (stored) {
            this.trainingData = JSON.parse(stored);
        } else {
            this.createInitialTrainingData();
        }
    }

    createInitialTrainingData() {
        // Dataset inicial baseado em padrões conhecidos
        this.trainingData.menuPatterns = [
            { keywords: ['pizza', 'mozzarella', 'calabresa'], category: 'pizzaria', confidence: 0.9 },
            { keywords: ['hambúrguer', 'batata', 'refrigerante'], category: 'lanchonete', confidence: 0.85 },
            { keywords: ['espaguete', 'lasanha', 'massa'], category: 'restaurante', confidence: 0.8 },
            { keywords: ['pão', 'croissant', 'bolo'], category: 'padaria', confidence: 0.9 },
            { keywords: ['açaí', 'sorvete', 'milkshake'], category: 'sorveteria', confidence: 0.9 }
        ];
        
        this.trainingData.productAssociations = [
            { input: 'pizzaria', products: ['597', '334', '277'], strength: 0.9 },
            { input: 'lanchonete', products: ['5167', '271', '597'], strength: 0.85 },
            { input: 'padaria', products: ['597', '318', '319'], strength: 0.9 },
            { input: 'restaurante', products: ['334', '5167', '506'], strength: 0.8 }
        ];
        
        this.saveTrainingData();
    }

    initializeSimpleModels() {
        // Modelo simples baseado em pontuação TF-IDF
        this.models.menuClassifier = new SimpleTextClassifier(this.trainingData.menuPatterns);
        this.models.productMatcher = new ProductMatcher(this.trainingData.productAssociations);
        this.models.pricePredictor = new SimplePricePredictor();
    }

    async categorizeMenu(menuText) {
        if (!menuText) return [];
        
        const words = this.preprocessText(menuText);
        const predictions = this.models.menuClassifier.predict(words);
        
        // Combinar com análise de frequência
        const categories = this.extractCategoriesByFrequency(menuText);
        
        return this.combineResults(predictions, categories);
    }

    async getSuggestions(analysisResults) {
        const suggestions = [];
        
        // Baseado no tipo de negócio identificado
        if (analysisResults.company?.activity) {
            const businessSuggestions = this.getBusinessTypeSuggestions(
                analysisResults.company.activity
            );
            suggestions.push(...businessSuggestions);
        }
        
        // Baseado na análise do menu
        if (analysisResults.menu?.categories) {
            const menuSuggestions = this.getMenuBasedSuggestions(
                analysisResults.menu.categories
            );
            suggestions.push(...menuSuggestions);
        }
        
        // ML - Predição de produtos mais prováveis
        const mlSuggestions = await this.predictProducts(analysisResults);
        suggestions.push(...mlSuggestions);
        
        return this.rankSuggestions(suggestions);
    }

    preprocessText(text) {
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    extractCategoriesByFrequency(text) {
        const words = this.preprocessText(text);
        const categories = {};
        
        // Definir palavras-chave para cada categoria
        const categoryKeywords = {
            'pizzas': ['pizza', 'mozzarella', 'calabresa', 'margherita', 'napolitana'],
            'hambúrgueres': ['hamburguer', 'burger', 'lanche', 'batata', 'maionese'],
            'massas': ['massa', 'espaguete', 'lasanha', 'macarrao', 'molho'],
            'carnes': ['carne', 'bife', 'picanha', 'frango', 'peixe'],
            'sobremesas': ['sobremesa', 'doce', 'pudim', 'torta', 'sorvete'],
            'bebidas': ['bebida', 'refrigerante', 'suco', 'agua', 'cerveja']
        };
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            const matches = words.filter(word => 
                keywords.some(keyword => word.includes(keyword))
            ).length;
            
            if (matches > 0) {
                categories[category] = matches / words.length;
            }
        }
        
        return Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .map(([category]) => category);
    }

    getBusinessTypeSuggestions(activity) {
        const activityLower = activity.toLowerCase();
        const suggestions = [];
        
        const businessRules = {
            'restaurante': [
                { code: '334', priority: 9, reason: 'Queijo para pratos principais' },
                { code: '5167', priority: 8, reason: 'Carne bovina de qualidade' },
                { code: '597', priority: 7, reason: 'Farinha multiuso' }
            ],
            'lanchonete': [
                { code: '5167', priority: 9, reason: 'Carne para hambúrgueres' },
                { code: '271', priority: 8, reason: 'Bacon para lanches' },
                { code: '597', priority: 7, reason: 'Farinha para pães' }
            ],
            'pizzaria': [
                { code: '597', priority: 10, reason: 'Farinha específica para pizza' },
                { code: '334', priority: 9, reason: 'Queijo mozzarella' },
                { code: '277', priority: 8, reason: 'Molho de tomate' }
            ],
            'padaria': [
                { code: '597', priority: 10, reason: 'Farinha para panificação' },
                { code: '318', priority: 9, reason: 'Fermento biológico' },
                { code: '48', priority: 7, reason: 'Banha para massa' }
            ]
        };
        
        for (const [type, products] of Object.entries(businessRules)) {
            if (activityLower.includes(type)) {
                suggestions.push(...products.map(p => ({
                    ...p,
                    confidence: 0.8,
                    source: 'business_type'
                })));
                break;
            }
        }
        
        return suggestions;
    }

    getMenuBasedSuggestions(categories) {
        const suggestions = [];
        
        const menuRules = {
            'pizzas': [
                { code: '597', priority: 10, reason: 'Farinha para pizza', confidence: 0.95 },
                { code: '334', priority: 9, reason: 'Queijo mozzarella', confidence: 0.90 },
                { code: '277', priority: 8, reason: 'Molho de tomate', confidence: 0.85 }
            ],
            'hambúrgueres': [
                { code: '5167', priority: 9, reason: 'Carne bovina', confidence: 0.90 },
                { code: '271', priority: 8, reason: 'Bacon', confidence: 0.85 },
                { code: '334', priority: 7, reason: 'Queijo', confidence: 0.80 }
            ],
            'massas': [
                { code: '8563', priority: 8, reason: 'Massa fresca', confidence: 0.85 },
                { code: '334', priority: 7, reason: 'Queijo para massas', confidence: 0.80 },
                { code: '277', priority: 6, reason: 'Molho de tomate', confidence: 0.75 }
            ]
        };
        
        categories.forEach(category => {
            if (menuRules[category]) {
                suggestions.push(...menuRules[category].map(p => ({
                    ...p,
                    source: 'menu_analysis'
                })));
            }
        });
        
        return suggestions;
    }

    async predictProducts(analysisResults) {
        // Simulação de ML - Em produção seria um modelo real
        const features = this.extractFeatures(analysisResults);
        const predictions = this.models.productMatcher.predict(features);
        
        return predictions.map(p => ({
            ...p,
            source: 'ml_prediction',
            confidence: Math.min(p.confidence * 0.9, 0.95) // Reduzir confiança para simular incerteza
        }));
    }

    extractFeatures(analysisResults) {
        const features = {
            hasMenu: !!(analysisResults.menu?.content),
            menuCategories: analysisResults.menu?.categories || [],
            businessActivity: analysisResults.company?.activity || '',
            hasSocialMedia: !!(analysisResults.social?.platforms),
            estimatedSize: this.estimateBusinessSize(analysisResults),
            priceRange: analysisResults.menu?.priceRange || { min: 0, max: 0 }
        };
        
        return features;
    }

    estimateBusinessSize(analysisResults) {
        let size = 'pequeno';
        
        if (analysisResults.company?.employees > 50) size = 'grande';
        else if (analysisResults.company?.employees > 10) size = 'médio';
        
        if (analysisResults.menu?.items?.length > 50) size = 'médio';
        if (analysisResults.menu?.items?.length > 100) size = 'grande';
        
        return size;
    }

    rankSuggestions(suggestions) {
        // Algoritmo de ranking que combina prioridade, confiança e fonte
        return suggestions
            .map(s => ({
                ...s,
                score: this.calculateScore(s)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 12); // Limitar a 12 sugestões
    }

    calculateScore(suggestion) {
        let score = suggestion.priority || 5;
        
        // Boost por confiança
        score *= (suggestion.confidence || 0.5);
        
        // Boost por fonte
        const sourceBoosts = {
            'ml_prediction': 1.2,
            'menu_analysis': 1.1,
            'business_type': 1.0,
            'ai_suggestion': 1.3
        };
        
        score *= (sourceBoosts[suggestion.source] || 1.0);
        
        return score;
    }

    combineResults(predictions, categories) {
        // Combinar resultados de diferentes fontes
        const combined = [...predictions];
        
        categories.forEach(category => {
            if (!combined.includes(category)) {
                combined.push(category);
            }
        });
        
        return combined;
    }

    // Método para treinar com novos dados (feedback loop)
    learn(input, expectedOutput, actualResult) {
        // Adicionar novo exemplo aos dados de treinamento
        this.trainingData.menuPatterns.push({
            keywords: this.preprocessText(input),
            category: expectedOutput,
            confidence: actualResult ? 0.9 : 0.1
        });
        
        // Re-treinar modelos simples
        this.models.menuClassifier.addTrainingData({
            keywords: this.preprocessText(input),
            category: expectedOutput,
            confidence: actualResult ? 0.9 : 0.1
        });
        
        this.saveTrainingData();
    }

    saveTrainingData() {
        try {
            localStorage.setItem('pmg_ml_training', JSON.stringify(this.trainingData));
        } catch (error) {
            console.warn('Erro ao salvar dados de treinamento:', error);
        }
    }

    // Método para obter estatísticas do modelo
    getModelStats() {
        return {
            trainingExamples: this.trainingData.menuPatterns.length,
            categories: Object.keys(this.categories).length,
            lastUpdated: new Date().toISOString()
        };
    }
}

// Classificador de texto simples
class SimpleTextClassifier {
    constructor(trainingData) {
        this.patterns = trainingData || [];
    }

    predict(words) {
        const scores = {};
        
        this.patterns.forEach(pattern => {
            const matches = words.filter(word => 
                pattern.keywords.some(keyword => 
                    word.includes(keyword) || keyword.includes(word)
                )
            ).length;
            
            if (matches > 0) {
                const score = (matches / words.length) * pattern.confidence;
                scores[pattern.category] = (scores[pattern.category] || 0) + score;
            }
        });
        
        return Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .map(([category, score]) => ({ category, confidence: Math.min(score, 1) }));
    }

    addTrainingData(data) {
        this.patterns.push(data);
    }
}

// Matcher de produtos simples
class ProductMatcher {
    constructor(associations) {
        this.associations = associations || [];
    }

    predict(features) {
        const suggestions = [];
        
        // Baseado no tipo de negócio
        const businessType = this.inferBusinessType(features);
        const association = this.associations.find(a => a.input === businessType);
        
        if (association) {
            suggestions.push(...association.products.map(code => ({
                code,
                priority: 8,
                reason: `Produto recomendado para ${businessType}`,
                confidence: association.strength
            })));
        }
        
        return suggestions;
    }

    inferBusinessType(features) {
        if (features.menuCategories.includes('pizzas')) return 'pizzaria';
        if (features.menuCategories.includes('hambúrgueres')) return 'lanchonete';
        if (features.businessActivity.toLowerCase().includes('padaria')) return 'padaria';
        return 'restaurante';
    }
}

// Preditor de preços simples
class SimplePricePredictor {
    predict(productCode, businessFeatures) {
        // Simulação simples - em produção usaria dados históricos reais
        const basePrice = Math.random() * 100;
        const adjustedPrice = basePrice * this.getBusinessSizeMultiplier(businessFeatures.estimatedSize);
        
        return {
            predicted: adjustedPrice,
            confidence: 0.7,
            range: {
                min: adjustedPrice * 0.8,
                max: adjustedPrice * 1.2
            }
        };
    }

    getBusinessSizeMultiplier(size) {
        const multipliers = {
            'pequeno': 1.0,
            'médio': 0.95,
            'grande': 0.90
        };
        
        return multipliers[size] || 1.0;
    }
}
