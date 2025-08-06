class CompetitorAnalysis {
    constructor() {
        this.cache = new CacheManager();
        this.errorHandler = new ErrorHandler();
        this.competitors = [];
        this.marketData = {};
    }

    async init() {
        try {
            await this.loadCompetitorsData();
            this.setupEventListeners();
            console.log('✅ Análise de Concorrentes inicializada');
        } catch (error) {
            this.errorHandler.handle(error, 'Erro ao inicializar análise de concorrentes');
        }
    }

    async loadCompetitorsData() {
        try {
            const response = await fetch('./assets/data/competitors-data.json');
            if (!response.ok) {
                throw new Error('Erro ao carregar dados dos concorrentes');
            }
            
            const data = await response.json();
            this.competitors = data.competitors || [];
            this.marketData = data.market_analysis || {};
            this.positioning = data.positioning || {};
            
        } catch (error) {
            console.warn('⚠️ Erro ao carregar dados dos concorrentes:', error);
            this.competitors = this.getDefaultCompetitors();
            this.marketData = this.getDefaultMarketData();
        }
    }

    setupEventListeners() {
        // Listener para mostrar modal de concorrentes
        const competitorButton = document.querySelector('[onclick="competitors.show()"]');
        if (competitorButton) {
            competitorButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.show();
            });
        }
    }

    async analyze(formData) {
        try {
            const analysis = {
                timestamp: new Date().toISOString(),
                competitors: await this.analyzeCompetitors(formData),
                market_position: this.analyzeMarketPosition(formData),
                opportunities: this.identifyOpportunities(formData),
                threats: this.identifyThreats(formData),
                recommendations: this.generateRecommendations(formData)
            };

            return analysis;
        } catch (error) {
            console.error('Erro na análise de concorrentes:', error);
            return {
                error: 'Erro na análise de concorrentes',
                competitors: [],
                recommendations: []
            };
        }
    }

    async analyzeCompetitors(formData) {
        const results = [];
        
        for (const competitor of this.competitors) {
            const score = this.calculateCompetitiveScore(competitor, formData);
            const threats = this.identifyCompetitorThreats(competitor, formData);
            const opportunities = this.identifyCompetitorOpportunities(competitor, formData);
            
            results.push({
                ...competitor,
                competitive_score: score,
                threats: threats,
                opportunities: opportunities,
                relevance: this.calculateRelevance(competitor, formData)
            });
        }

        // Ordenar por relevância
        return results.sort((a, b) => b.relevance - a.relevance);
    }

    calculateCompetitiveScore(competitor, formData) {
        let score = competitor.competitive_score || 5.0;
        
        // Ajustar score baseado no tipo de negócio do prospect
        if (formData.company?.activity) {
            const activity = formData.company.activity.toLowerCase();
            
            if (activity.includes('restaurante') && competitor.target_audience.includes('restaurantes')) {
                score += 0.5;
            }
            if (activity.includes('padaria') && competitor.target_audience.includes('padarias')) {
                score += 0.5;
            }
            if (activity.includes('lanchonete') && competitor.target_audience.includes('lanchonetes')) {
                score += 0.5;
            }
        }

        // Ajustar baseado na localização
        if (formData.company?.address && competitor.geographical_presence === 'nacional') {
            score += 0.3;
        }

        return Math.min(score, 10.0);
    }

    identifyCompetitorThreats(competitor, formData) {
        const threats = [];
        
        if (competitor.market_share > 20) {
            threats.push('Grande participação de mercado');
        }
        
        if (competitor.pricing_strategy === 'competitivo') {
            threats.push('Preços muito competitivos');
        }
        
        if (competitor.strengths.includes('variedade')) {
            threats.push('Amplo portfólio de produtos');
        }
        
        if (competitor.strengths.includes('localização')) {
            threats.push('Melhor localização geográfica');
        }

        return threats;
    }

    identifyCompetitorOpportunities(competitor, formData) {
        const opportunities = [];
        
        if (competitor.weaknesses.includes('atendimento')) {
            opportunities.push('Diferenciação por qualidade no atendimento');
        }
        
        if (competitor.weaknesses.includes('qualidade variável')) {
            opportunities.push('Foco na qualidade consistente dos produtos');
        }
        
        if (competitor.weaknesses.includes('localização limitada')) {
            opportunities.push('Cobertura geográfica superior');
        }

        return opportunities;
    }

    calculateRelevance(competitor, formData) {
        let relevance = 5.0;
        
        // Relevância baseada na sobreposição de produtos
        relevance += (competitor.products_overlap / 100) * 3;
        
        // Relevância baseada na participação de mercado
        relevance += (competitor.market_share / 100) * 2;
        
        // Relevância baseada na presença geográfica
        if (competitor.geographical_presence === 'nacional') {
            relevance += 1.0;
        } else if (competitor.geographical_presence === 'regional') {
            relevance += 0.5;
        }

        return Math.min(relevance, 10.0);
    }

    analyzeMarketPosition(formData) {
        return {
            segment: this.identifyMarketSegment(formData),
            size_estimate: this.estimateMarketSize(formData),
            growth_potential: this.assessGrowthPotential(formData),
            competitive_intensity: this.assessCompetitiveIntensity(formData),
            entry_barriers: this.identifyEntryBarriers(formData)
        };
    }

    identifyMarketSegment(formData) {
        if (!formData.company?.activity) return 'Geral';
        
        const activity = formData.company.activity.toLowerCase();
        
        if (activity.includes('restaurante')) return 'Food Service - Restaurantes';
        if (activity.includes('padaria')) return 'Food Service - Padarias';
        if (activity.includes('lanchonete')) return 'Food Service - Lanchonetes';
        if (activity.includes('hotel')) return 'Food Service - Hotéis';
        if (activity.includes('escola')) return 'Food Service - Instituições';
        
        return 'Varejo Alimentar';
    }

    estimateMarketSize(formData) {
        const baseMarket = {
            'Food Service - Restaurantes': 'R$ 45 bilhões',
            'Food Service - Padarias': 'R$ 25 bilhões', 
            'Food Service - Lanchonetes': 'R$ 15 bilhões',
            'Food Service - Hotéis': 'R$ 8 bilhões',
            'Varejo Alimentar': 'R$ 120 bilhões'
        };
        
        const segment = this.identifyMarketSegment(formData);
        return baseMarket[segment] || 'R$ 10 bilhões';
    }

    assessGrowthPotential(formData) {
        // Análise baseada em tendências do setor
        const trends = {
            'Food Service - Restaurantes': 'Alto - crescimento de delivery',
            'Food Service - Padarias': 'Médio - mercado consolidado',
            'Food Service - Lanchonetes': 'Alto - fast food em crescimento',
            'Food Service - Hotéis': 'Médio - recuperação pós-pandemia',
            'Varejo Alimentar': 'Médio - mercado maduro'
        };
        
        const segment = this.identifyMarketSegment(formData);
        return trends[segment] || 'Médio';
    }

   // Método corrigido
assessCompetitiveIntensity(formData) {
    const segment = this.identifyMarketSegment(formData);
    const competitorsInSegment = this.competitors.filter(c => {
        // Correção: verificar se target_audience existe e é string ou array
        if (!c.target_audience) return false;
        
        const targetAudience = Array.isArray(c.target_audience) ? 
            c.target_audience : [c.target_audience];
        
        return targetAudience.some(audience => 
            audience && typeof audience === 'string' && 
            audience.toLowerCase().includes(segment.toLowerCase())
        ) || (c.segment && c.segment === 'alimenticio');
    }).length;
    
    if (competitorsInSegment >= 4) return 'Alta';
    if (competitorsInSegment >= 2) return 'Média';
    return 'Baixa';
}



    identifyEntryBarriers(formData) {
        return [
            'Necessidade de capital inicial alto',
            'Relacionamento estabelecido com fornecedores',
            'Logística e distribuição complexa',
            'Regulamentações sanitárias',
            'Economia de escala dos grandes players'
        ];
    }

    identifyOpportunities(formData) {
        const opportunities = [];
        
        // Oportunidades baseadas na análise do prospect
        if (formData.company?.size === 'Microempresa') {
            opportunities.push('Atendimento personalizado para pequenos negócios');
        }
        
        if (formData.menu?.categories?.includes('pizzas')) {
            opportunities.push('Especialização em produtos para pizzarias');
        }
        
        if (formData.social?.platforms?.length > 0) {
            opportunities.push('Cliente ativo em redes sociais - potencial para parceria digital');
        }

        // Oportunidades gerais do mercado
        opportunities.push(...(this.positioning.pmg_opportunities || []));
        
        return opportunities;
    }

    identifyThreats(formData) {
        const threats = [];
        
        // Ameaças específicas baseadas nos concorrentes
        const strongCompetitors = this.competitors.filter(c => c.competitive_score > 7.5);
        
        if (strongCompetitors.length > 2) {
            threats.push('Múltiplos concorrentes fortes na região');
        }
        
        const priceCompetitors = this.competitors.filter(c => c.pricing_strategy === 'competitivo');
        if (priceCompetitors.length > 1) {
            threats.push('Pressão competitiva nos preços');
        }

        // Ameaças gerais do mercado
        threats.push(...(this.marketData.threats || []));
        
        return threats;
    }

    generateRecommendations(formData) {
        const recommendations = [];
        
        // Recomendações baseadas nos pontos fortes da PMG
        recommendations.push(...(this.positioning.recommended_strategy || []));
        
        // Recomendações específicas baseadas no prospect
        const segment = this.identifyMarketSegment(formData);
        
        if (segment.includes('Restaurantes')) {
            recommendations.push('Desenvolver linha específica para restaurantes');
            recommendations.push('Oferecer consultoria em gestão de custos');
        }
        
        if (segment.includes('Padarias')) {
            recommendations.push('Foco em produtos de panificação de alta qualidade');
            recommendations.push('Treinamentos técnicos para padeiros');
        }
        
        if (formData.company?.size === 'Microempresa') {
            recommendations.push('Programa especial para micro empresas');
            recommendations.push('Condições de pagamento flexíveis');
        }

        return recommendations;
    }

    show() {
        const modalHtml = `
            <div class="modal-backdrop" id="competitorModal">
                <div class="modal-content" style="max-width: 1200px;">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-users me-2"></i>Análise de Concorrentes
                        </h5>
                        <button class="modal-close" onclick="this.close()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${this.renderDashboard()}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Event listener para fechar modal
        document.getElementById('competitorModal').addEventListener('click', (e) => {
            if (e.target.id === 'competitorModal') {
                this.close();
            }
        });

        this.renderCharts();
    }

    close() {
        const modal = document.getElementById('competitorModal');
        if (modal) {
            modal.remove();
        }
    }

    renderDashboard() {
        return `
            <div class="row mb-4">
                <div class="col-md-12">
                    <h6 class="text-primary mb-3">Visão Geral do Mercado</h6>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="metric-card">
                                <div class="metric-value">${this.marketData.total_market_size || 'R$ 850B'}</div>
                                <div class="metric-label">Tamanho do Mercado</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="metric-card">
                                <div class="metric-value">${this.marketData.growth_rate || '8.5%'}</div>
                                <div class="metric-label">Taxa de Crescimento</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="metric-card">
                                <div class="metric-value">${this.competitors.length}</div>
                                <div class="metric-label">Concorrentes Principais</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="metric-card">
                                <div class="metric-value">30%</div>
                                <div class="metric-label">Market Share PMG</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">Participação de Mercado</div>
                        <canvas id="marketShareChart" class="chart-canvas"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">Score Competitivo</div>
                        <canvas id="competitiveScoreChart" class="chart-canvas"></canvas>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-12">
                    <h6 class="text-primary mb-3">Principais Concorrentes</h6>
                    <div class="competitor-grid">
                        ${this.renderCompetitorCards()}
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-success mb-3">Oportunidades</h6>
                    <ul class="list-unstyled">
                        ${(this.marketData.opportunities || []).map(opp => `
                            <li class="mb-2">
                                <i class="fas fa-plus-circle text-success me-2"></i>${opp}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6 class="text-warning mb-3">Ameaças</h6>
                    <ul class="list-unstyled">
                        ${(this.marketData.threats || []).map(threat => `
                            <li class="mb-2">
                                <i class="fas fa-exclamation-triangle text-warning me-2"></i>${threat}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    renderCompetitorCards() {
        return this.competitors.map(competitor => `
            <div class="competitor-card">
                <div class="competitor-name">${competitor.name}</div>
                <div class="competitor-score">${competitor.competitive_score.toFixed(1)}</div>
                <div class="mt-2">
                    <small class="text-muted">Market Share: ${competitor.market_share}%</small>
                </div>
                <div class="competitor-tags">
                    ${competitor.strengths.slice(0, 3).map(strength => `
                        <span class="competitor-tag">${strength}</span>
                    `).join('')}
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        <i class="fas fa-map-marker-alt me-1"></i>${competitor.geographical_presence}
                    </small>
                </div>
            </div>
        `).join('');
    }

    renderCharts() {
        // Market Share Chart
        const marketShareCtx = document.getElementById('marketShareChart');
        if (marketShareCtx) {
            new Chart(marketShareCtx, {
                type: 'doughnut',
                data: {
                    labels: this.competitors.map(c => c.name),
                    datasets: [{
                        data: this.competitors.map(c => c.market_share),
                        backgroundColor: [
                            '#c41e3a', '#f39c12', '#3498db', '#27ae60', '#9b59b6', '#e74c3c'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Competitive Score Chart
        const competitiveScoreCtx = document.getElementById('competitiveScoreChart');
        if (competitiveScoreCtx) {
            new Chart(competitiveScoreCtx, {
                type: 'bar',
                data: {
                    labels: this.competitors.map(c => c.name),
                    datasets: [{
                        label: 'Score Competitivo',
                        data: this.competitors.map(c => c.competitive_score),
                        backgroundColor: '#c41e3a',
                        borderColor: '#a01729',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 10
                        }
                    }
                }
            });
        }
    }

    getDefaultCompetitors() {
        return [
            {
                id: 'atacadao',
                name: 'Atacadão',
                type: 'atacadista',
                market_share: 25,
                competitive_score: 8.2,
                strengths: ['preços baixos', 'variedade'],
                weaknesses: ['atendimento'],
                geographical_presence: 'nacional'
            },
            {
                id: 'assai',
                name: 'Assaí',
                type: 'atacadista',
                market_share: 20,
                competitive_score: 7.9,
                strengths: ['tecnologia', 'logística'],
                weaknesses: ['marca nova'],
                geographical_presence: 'nacional'
            }
        ];
    }

    getDefaultMarketData() {
        return {
            total_market_size: 'R$ 850 bilhões',
            growth_rate: '8.5%',
            opportunities: ['digitalização', 'sustentabilidade'],
            threats: ['concorrência', 'inflação']
        };
    }
}
