class AIApi {
    constructor() {
        this.grokLimiter = new RateLimiter(RATE_LIMITS.GROK);
        this.geminiLimiter = new RateLimiter(RATE_LIMITS.GEMINI);
        this.cache = new CacheManager();
    }

   // Método com fallback aprimorado
async analyzeWithGrok(formData) {
    // Verificar se API está habilitada
    if (!API_CONFIG.GROK.enabled) {
        console.log('🔄 API Grok desabilitada, usando análise básica');
        return this.generateBasicAnalysis(formData);
    }

    if (!this.grokLimiter.canMakeRequest()) {
        console.warn('⚠️ Rate limit excedido para Grok API');
        return this.generateBasicAnalysis(formData);
    }

    const cacheKey = `grok_${this.generateCacheKey(formData)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${API_CONFIG.GROK.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.GROK.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.GROK.model,
                messages: [
                    {
                        role: "system",
                        content: "Você é um especialista em análise comercial para o atacado alimentício PMG. Seja prático e objetivo."
                    },
                    {
                        role: "user",
                        content: this.buildAnalysisPrompt(formData)
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            // Tratamento específico de erros
            if (response.status === 403) {
                console.warn('🚫 API Grok: Acesso negado (403)');
                API_CONFIG.GROK.enabled = false; // Desabilitar temporariamente
            } else if (response.status === 429) {
                console.warn('🚫 API Grok: Rate limit excedido (429)');
            }
            
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content;
        
        if (!result) {
            throw new Error('Resposta inválida da API');
        }
        
        this.cache.set(cacheKey, result, CACHE_CONFIG.ai_analysis);
        this.grokLimiter.recordRequest();
        
        return result;

    } catch (error) {
        console.warn('⚠️ Erro na API Grok, usando análise básica:', error.message);
        return this.generateBasicAnalysis(formData);
    }
}

// Análise básica como fallback
generateBasicAnalysis(formData) {
    const companyActivity = formData.company?.activity || 'Estabelecimento comercial';
    const hasMenu = !!(formData.menuText || formData.menuFile);
    const hasSocial = !!(formData.instagram || formData.facebook);

    return `
**🔍 ANÁLISE PMG - ${new Date().toLocaleDateString('pt-BR')}**

**📋 PERFIL DO CLIENTE:**
• Empresa: ${formData.company?.name || 'Prospect identificado'}
• Atividade: ${companyActivity}
• CNPJ: ${formData.cnpj || 'Não informado'}

**📊 ANÁLISE INICIAL:**
• Cardápio fornecido: ${hasMenu ? '✅ Sim' : '❌ Não'}
• Redes sociais: ${hasSocial ? '✅ Presente' : '⚠️ Ausente'}
• Tipo de negócio: ${this.identifyBusinessType(formData)}

**🎯 RECOMENDAÇÕES PMG:**
• Apresentar produtos de alta qualidade da linha PMG
• Destacar nossa experiência de 30 anos no mercado
• Propor condições comerciais competitivas
• Agendar visita técnica para avaliação detalhada

**💡 PRÓXIMOS PASSOS:**
1. Apresentar portfólio completo PMG
2. Fazer cotação personalizada
3. Propor teste de produtos
4. Definir condições de entrega

*Análise gerada automaticamente pelo sistema PMG ProspecPro*
    `.trim();
}

identifyBusinessType(formData) {
    if (!formData.company?.activity) return 'Comercial geral';
    
    const activity = formData.company.activity.toLowerCase();
    if (activity.includes('restaurante')) return 'Restaurante 🍽️';
    if (activity.includes('padaria')) return 'Padaria 🍞';
    if (activity.includes('lanchonete')) return 'Lanchonete 🍔';
    if (activity.includes('pizza')) return 'Pizzaria 🍕';
    if (activity.includes('bar')) return 'Bar/Lancheria 🍻';
    return 'Alimentício 🍴';
}


// Método de fallback
generateBasicAnalysis(formData) {
    return `
    **Análise Básica do Prospect:**
    
    **Perfil do Cliente:**
    - CNPJ: ${formData.cnpj || 'Não informado'}
    - Tipo: ${this.identifyBusinessType(formData)}
    
    **Recomendações PMG:**
    - Produtos de qualidade para estabelecimentos alimentícios
    - Atendimento personalizado e especializado
    - Condições competitivas no mercado atacadista
    
    **Estratégia Sugerida:**
    - Apresentar portfólio completo PMG
    - Destacar qualidade e tradição de 30 anos
    - Propor visita técnica para avaliação de necessidades
    `;
}

identifyBusinessType(formData) {
    if (!formData.company?.activity) return 'Estabelecimento comercial';
    
    const activity = formData.company.activity.toLowerCase();
    if (activity.includes('restaurante')) return 'Restaurante';
    if (activity.includes('padaria')) return 'Padaria';
    if (activity.includes('lanchonete')) return 'Lanchonete';
    return 'Estabelecimento alimentício';
}


    async analyzeWithGemini(formData) {
        if (!this.geminiLimiter.canMakeRequest()) {
            throw new Error('Rate limit excedido para Gemini API');
        }

        const cacheKey = `gemini_${this.generateCacheKey(formData)}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const prompt = this.buildAnalysisPrompt(formData);

        try {
            const response = await fetch(
                `${API_CONFIG.GEMINI.baseUrl}/models/${API_CONFIG.GEMINI.model}:generateContent?key=${API_CONFIG.GEMINI.key}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Você é um especialista em vendas B2B para o setor alimentício. 
                                      Analise as informações do prospect e forneça insights acionáveis 
                                      para a equipe comercial da PMG Atacadista.\n\n${prompt}`
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 1000,
                            topP: 0.8,
                            topK: 10
                        }
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Erro na API Gemini: ${response.statusText}`);
            }

            const data = await response.json();
            const result = data.candidates[0].content.parts[0].text;
            
            this.cache.set(cacheKey, result, CACHE_CONFIG.ai_analysis);
            this.geminiLimiter.recordRequest();
            
            return result;

        } catch (error) {
            console.error('Erro na análise Gemini:', error);
            throw error;
        }
    }

    async analyzeMenu(menuContent) {
        const prompt = `
            Analise o seguinte cardápio e forneça:
            1. Categorias principais de produtos
            2. Faixa de preços identificada
            3. Tipo de estabelecimento provável
            4. Ingredientes mais utilizados
            5. Sugestões de produtos PMG que fariam sentido

            CARDÁPIO:
            ${menuContent}

            Responda em formato JSON estruturado.
        `;

        try {
            // Tentar Gemini primeiro (melhor para análise estruturada)
            const result = await this.queryGemini(prompt);
            return this.parseMenuAnalysis(result);
        } catch (error) {
            // Fallback para Grok
            try {
                const result = await this.queryGrok(prompt);
                return this.parseMenuAnalysis(result);
            } catch (fallbackError) {
                console.error('Ambas as IAs falharam na análise do cardápio');
                return this.basicMenuAnalysis(menuContent);
            }
        }
    }

    async generateSalesScript(analysisData, selectedProducts) {
        const company = analysisData.company || {};
        const menu = analysisData.menu || {};
        const social = analysisData.social || {};
        
        const products = selectedProducts.map(code => {
            return window.prospector.catalog[code] || { code, name: 'Produto', price: '0,00' };
        });

        const prompt = `
            Crie um script de vendas personalizado para:
            
            EMPRESA: ${company.name || 'Empresa'}
            ATIVIDADE: ${company.activity || 'Não informado'}
            LOCALIZAÇÃO: ${company.address || 'Não informado'}
            
            ANÁLISE DO NEGÓCIO:
            - Cardápio identificado: ${menu.categories?.join(', ') || 'Não analisado'}
            - Redes sociais: ${social.platforms?.join(', ') || 'Não informado'}
            
            PRODUTOS SELECIONADOS:
            ${products.map(p => `- ${p.name} (R$ ${p.price})`).join('\n')}
            
            INSTRUÇÕES:
            1. Crie uma abordagem personalizada e consultiva
            2. Destaque os benefícios específicos para o tipo de negócio
            3. Inclua argumentos de valor baseados na análise
            4. Use um tom profissional mas próximo
            5. Inclua perguntas abertas para engajamento
            6. Forneça próximos passos claros
            
            Formato: Script direto, pronto para uso.
        `;

        try {
            const script = await this.queryGrok(prompt);
            return this.formatSalesScript(script);
        } catch (error) {
            return this.generateBasicScript(company, products);
        }
    }

    buildAnalysisPrompt(formData) {
        return `
            Analise o seguinte prospect comercial:
            
            DADOS DA EMPRESA:
            - CNPJ: ${formData.cnpj || 'Não informado'}
            - Instagram: ${formData.instagram || 'Não informado'}
            - Facebook: ${formData.facebook || 'Não informado'}
            - Website: ${formData.website || 'Não informado'}
            
            CARDÁPIO/PRODUTOS:
            ${formData.menuText || 'Não fornecido'}
            
            Forneça:
            1. Perfil do cliente (tipo de negócio, porte, público-alvo)
            2. Oportunidades de venda identificadas
            3. Produtos PMG recomendados com justificativa
            4. Estratégia de abordagem sugerida
            5. Pontos de atenção ou riscos
            
            Seja específico e prático nas recomendações.
        `;
    }

    async queryGrok(prompt) {
        const response = await fetch(`${API_CONFIG.GROK.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.GROK.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.GROK.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) throw new Error(`Grok API Error: ${response.statusText}`);
        
        const data = await response.json();
        return data.choices[0].message.content;
    }

    async queryGemini(prompt) {
        const response = await fetch(
            `${API_CONFIG.GEMINI.baseUrl}/models/${API_CONFIG.GEMINI.model}:generateContent?key=${API_CONFIG.GEMINI.key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800
                    }
                })
            }
        );

        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    parseMenuAnalysis(aiResponse) {
        try {
            // Tentar parsear como JSON
            if (aiResponse.includes('{') && aiResponse.includes('}')) {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            
            // Análise baseada em texto
            return {
                categories: this.extractCategories(aiResponse),
                priceRange: this.extractPriceRange(aiResponse),
                establishmentType: this.extractEstablishmentType(aiResponse),
                ingredients: this.extractIngredients(aiResponse)
            };
            
        } catch (error) {
            console.error('Erro ao parsear análise do menu:', error);
            return { categories: [], analysis: aiResponse };
        }
    }

    extractCategories(text) {
        const categories = [];
        const keywords = {
            'pizzas': ['pizza', 'pizzaria'],
            'hambúrgueres': ['hambúrguer', 'burger', 'lanche'],
            'massas': ['massa', 'espaguete', 'lasanha', 'macarrão'],
            'carnes': ['carne', 'bife', 'frango', 'peixe'],
            'sobremesas': ['sobremesa', 'doce', 'pudim', 'torta'],
            'bebidas': ['bebida', 'refrigerante', 'suco', 'água']
        };
        
        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => text.toLowerCase().includes(word))) {
                categories.push(category);
            }
        }
        
        return categories;
    }

    extractPriceRange(text) {
        const prices = text.match(/R\$\s*[\d,]+/g) || [];
        if (prices.length === 0) return { min: 0, max: 0 };
        
        const values = prices.map(p => 
            parseFloat(p.replace('R$', '').replace(',', '.').trim())
        );
        
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((a, b) => a + b, 0) / values.length
        };
    }

    extractEstablishmentType(text) {
        const types = {
            'pizzaria': ['pizza'],
            'lanchonete': ['lanche', 'hambúrguer'],
            'restaurante': ['restaurante', 'prato'],
            'padaria': ['pão', 'padaria'],
            'sorveteria': ['sorvete', 'açaí']
        };
        
        for (const [type, keywords] of Object.entries(types)) {
            if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
                return type;
            }
        }
        
        return 'estabelecimento alimentício';
    }

    extractIngredients(text) {
        const commonIngredients = [
            'queijo', 'tomate', 'cebola', 'alho', 'carne', 'frango',
            'massa', 'farinha', 'leite', 'ovo', 'azeite', 'tempero'
        ];
        
        return commonIngredients.filter(ingredient => 
            text.toLowerCase().includes(ingredient)
        );
    }

    formatSalesScript(script) {
        // Limpar e formatar o script
        let formatted = script
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        if (!formatted.startsWith('<p>')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        return formatted;
    }

    generateBasicScript(company, products) {
        return `
            <p><strong>🎯 SCRIPT PERSONALIZADO - ${company.name || 'PROSPECT'}</strong></p>
            
            <p>Olá! Meu nome é [SEU NOME], represento a PMG Atacadista, empresa com mais de 30 anos fornecendo ingredientes de qualidade para o setor alimentício.</p>
            
            <p><strong>📍 Localização:</strong> Vejo que vocês estão em ${company.address || 'uma excelente região'}, área que conhecemos bem e onde temos vários clientes satisfeitos.</p>
            
            <p><strong>💡 Oportunidade Identificada:</strong> Analisando o perfil do seu negócio, identifiquei alguns produtos que podem otimizar seus custos e melhorar a qualidade:</p>
            
            <ul>
                ${products.map(p => `<li><strong>${p.name}</strong> - R$ ${p.price} - Qualidade PMG garantida</li>`).join('')}
            </ul>
            
            <p><strong>🚚 Vantagens PMG:</strong></p>
            <ul>
                <li>✅ Entrega programada</li>
                <li>✅ Preços competitivos no atacado</li>
                <li>✅ 30 anos de tradição</li>
                <li>✅ Suporte técnico especializado</li>
            </ul>
            
            <p><strong>🤝 Próximo Passo:</strong> Que tal agendarmos uma visita para apresentar nossa linha completa e fazer uma cotação personalizada?</p>
            
            <p>Quando seria o melhor dia e horário para você?</p>
        `;
    }

    basicMenuAnalysis(menuContent) {
        // Análise básica sem IA
        const words = menuContent.toLowerCase().split(/\s+/);
        const categories = [];
        
        if (words.some(w => w.includes('pizza'))) categories.push('pizzas');
        if (words.some(w => w.includes('hambúrguer') || w.includes('lanche'))) categories.push('hambúrgueres');
        if (words.some(w => w.includes('massa') || w.includes('espaguete'))) categories.push('massas');
        
        return {
            categories,
            analysis: 'Análise básica realizada - IA indisponível',
            confidence: 0.5
        };
    }

    generateCacheKey(formData) {
        const keyData = {
            cnpj: formData.cnpj,
            hasMenu: !!formData.menuText,
            hasSocial: !!(formData.instagram || formData.facebook)
        };
        
        return btoa(JSON.stringify(keyData)).slice(0, 16);
    }
}

// Rate Limiter Class
class RateLimiter {
    constructor(config) {
        this.maxRequests = config.requests;
        this.windowMs = config.window;
        this.requests = [];
    }

    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return this.requests.length < this.maxRequests;
    }

    recordRequest() {
        this.requests.push(Date.now());
    }
}
