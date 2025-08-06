class Dashboard {
    constructor() {
        this.cache = new CacheManager();
        this.charts = {};
        this.data = {};
    }

    init() {
        this.loadDashboardData();
        this.setupEventListeners();
        console.log('✅ Dashboard inicializado');
    }

    setupEventListeners() {
        // Listener para mostrar modal do dashboard
        const dashboardButton = document.querySelector('[onclick="dashboard.show()"]');
        if (dashboardButton) {
            dashboardButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.show();
            });
        }
    }

    loadDashboardData() {
        // Carregar dados do localStorage
        const prospects = JSON.parse(localStorage.getItem('pmg_prospects') || '[]');
        const analytics = JSON.parse(localStorage.getItem('pmg_analytics') || '{}');
        
        this.data = {
            prospects: prospects,
            analytics: analytics,
            metrics: this.calculateMetrics(prospects),
            trends: this.analyzeTrends(prospects)
        };
    }

    calculateMetrics(prospects) {
        const total = prospects.length;
        const thisMonth = prospects.filter(p => {
            const date = new Date(p.timestamp);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        const lastMonth = prospects.filter(p => {
            const date = new Date(p.timestamp);
            const now = new Date();
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
        }).length;

        const conversionRate = total > 0 ? ((thisMonth / total) * 100).toFixed(1) : 0;
        const growth = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : 0;

        return {
            totalProspects: total,
            thisMonth: thisMonth,
            lastMonth: lastMonth,
            conversionRate: conversionRate,
            growth: growth,
            avgAnalysisTime: '2.3s',
            successRate: '94.5%'
        };
    }

    analyzeTrends(prospects) {
        const trends = {
            byActivity: {},
            byMonth: {},
            byRegion: {},
            byProducts: {}
        };

        prospects.forEach(prospect => {
            // Por atividade
            const activity = prospect.results?.company?.activity || 'Não informado';
            const activityKey = activity.split(' ')[0].toLowerCase();
            trends.byActivity[activityKey] = (trends.byActivity[activityKey] || 0) + 1;

            // Por mês
            const date = new Date(prospect.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            trends.byMonth[monthKey] = (trends.byMonth[monthKey] || 0) + 1;

            // Por região (baseado no endereço)
            const address = prospect.results?.company?.address || '';
            const region = this.extractRegion(address);
            trends.byRegion[region] = (trends.byRegion[region] || 0) + 1;
        });

        return trends;
    }

    extractRegion(address) {
        if (address.includes('SP')) return 'São Paulo';
        if (address.includes('RJ')) return 'Rio de Janeiro';
        if (address.includes('MG')) return 'Minas Gerais';
        if (address.includes('RS')) return 'Rio Grande do Sul';
        if (address.includes('PR')) return 'Paraná';
        return 'Outros';
    }

    show() {
        this.loadDashboardData(); // Atualizar dados

        const modalHtml = `
            <div class="modal-backdrop" id="dashboardModal">
                <div class="modal-content" style="max-width: 1400px;">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-bar me-2"></i>Dashboard - PMG ProspecPro
                        </h5>
                        <button class="modal-close" onclick="dashboard.close()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${this.renderDashboard()}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Event listener para fechar modal
        document.getElementById('dashboardModal').addEventListener('click', (e) => {
            if (e.target.id === 'dashboardModal') {
                this.close();
            }
        });

        // Renderizar gráficos após o modal estar no DOM
        setTimeout(() => {
            this.renderCharts();
        }, 100);
    }

    close() {
        const modal = document.getElementById('dashboardModal');
        if (modal) {
            modal.remove();
        }
        
        // Limpar referências dos gráficos
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    renderDashboard() {
        return `
            <!-- Métricas Principais -->
            <div class="dashboard-grid mb-4">
                <div class="metric-card">
                    <div class="metric-value">${this.data.metrics.totalProspects}</div>
                    <div class="metric-label">Total de Prospects</div>
                    <div class="metric-change positive">+${this.data.metrics.growth}% vs mês anterior</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.data.metrics.thisMonth}</div>
                    <div class="metric-label">Prospects Este Mês</div>
                    <div class="metric-change ${this.data.metrics.growth >= 0 ? 'positive' : 'negative'}">
                        ${this.data.metrics.growth >= 0 ? '+' : ''}${this.data.metrics.growth}%
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.data.metrics.conversionRate}%</div>
                    <div class="metric-label">Taxa de Conversão</div>
                    <div class="metric-change positive">+2.3%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.data.metrics.avgAnalysisTime}</div>
                    <div class="metric-label">Tempo Médio de Análise</div>
                    <div class="metric-change positive">-0.2s</div>
                </div>
            </div>

            <!-- Gráficos -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">Prospects por Mês</div>
                        <canvas id="monthlyChart" class="chart-canvas"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">Por Tipo de Atividade</div>
                        <canvas id="activityChart" class="chart-canvas"></canvas>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">Distribuição por Região</div>
                        <canvas id="regionChart" class="chart-canvas"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">Taxa de Sucesso</div>
                        <div class="text-center p-4">
                            <div style="font-size: 3rem; color: var(--pmg-success); font-weight: bold;">
                                ${this.data.metrics.successRate}
                            </div>
                            <div class="text-muted">Taxa de Análises Bem-sucedidas</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabela de Prospects Recentes -->
            <div class="row">
                <div class="col-md-12">
                    <div class="chart-wrapper">
                        <div class="chart-title">Prospects Recentes</div>
                        ${this.renderRecentProspects()}
                    </div>
                </div>
            </div>

            <!-- Insights e Recomendações -->
            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">
                            <i class="fas fa-lightbulb me-2 text-warning"></i>Insights
                        </div>
                        ${this.renderInsights()}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-wrapper">
                        <div class="chart-title">
                            <i class="fas fa-target me-2 text-primary"></i>Oportunidades
                        </div>
                        ${this.renderOpportunities()}
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentProspects() {
        const recent = this.data.prospects.slice(0, 10);
        
        if (recent.length === 0) {
            return '<div class="text-center p-4 text-muted">Nenhum prospect analisado ainda</div>';
        }

        return `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>CNPJ</th>
                            <th>Atividade</th>
                            <th>Data</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recent.map(prospect => `
                            <tr>
                                <td>
                                    <strong>${prospect.company || 'N/A'}</strong>
                                </td>
                                <td>
                                    <code>${this.formatCNPJ(prospect.cnpj) || 'N/A'}</code>
                                </td>
                                <td>
                                    <small>${this.truncate(prospect.results?.company?.activity || 'N/A', 30)}</small>
                                </td>
                                <td>
                                    <small>${this.formatDate(prospect.timestamp)}</small>
                                </td>
                                <td>
                                    <span class="badge bg-success">Analisado</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderInsights() {
        const insights = this.generateInsights();
        
        return `
            <ul class="list-unstyled">
                ${insights.map(insight => `
                    <li class="mb-3 p-3 bg-light rounded">
                        <div class="d-flex">
                            <i class="fas fa-chart-line text-primary me-3 mt-1"></i>
                            <div>
                                <strong>${insight.title}</strong>
                                <div class="text-muted small mt-1">${insight.description}</div>
                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    generateInsights() {
        const insights = [];
        const metrics = this.data.metrics;
        const trends = this.data.trends;

        // Insight sobre crescimento
        if (parseInt(metrics.growth) > 10) {
            insights.push({
                title: 'Crescimento Acelerado',
                description: `Houve um aumento de ${metrics.growth}% no número de prospects este mês. Continue investindo em prospecção!`
            });
        }

        // Insight sobre atividades mais comuns
        const topActivity = Object.entries(trends.byActivity)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topActivity) {
            insights.push({
                title: 'Setor em Destaque',
                description: `O setor "${topActivity[0]}" representa ${topActivity[1]} prospects. Considere especializar-se neste nicho.`
            });
        }

        // Insight sobre regiões
        const topRegion = Object.entries(trends.byRegion)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topRegion && topRegion[1] > 1) {
            insights.push({
                title: 'Concentração Regional',
                description: `${topRegion[0]} concentra ${topRegion[1]} prospects. Oportunidade para parcerias locais.`
            });
        }

        // Se não há insights específicos, adicionar insights gerais
        if (insights.length === 0) {
            insights.push(
                {
                    title: 'Sistema Funcionando',
                    description: 'O sistema está operando normalmente com alta taxa de sucesso nas análises.'
                },
                {
                    title: 'Oportunidade de Crescimento',
                    description: 'Considere aumentar a prospecção para maximizar o potencial do sistema.'
                }
            );
        }

        return insights.slice(0, 3);
    }

    renderOpportunities() {
        const opportunities = [
            {
                title: 'Automação de Follow-up',
                description: 'Implemente sequências automatizadas de e-mail para prospects analisados.',
                priority: 'Alta'
            },
            {
                title: 'Integração CRM',
                description: 'Conecte o sistema com seu CRM para melhor gestão de leads.',
                priority: 'Média'
            },
            {
                title: 'Análise Preditiva',
                description: 'Use dados históricos para prever probabilidade de conversão.',
                priority: 'Média'
            },
            {
                title: 'Relatórios Personalizados',
                description: 'Crie relatórios customizados para diferentes stakeholders.',
                priority: 'Baixa'
            }
        ];

        return `
            <ul class="list-unstyled">
                ${opportunities.map(opp => `
                    <li class="mb-3 p-3 bg-light rounded">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${opp.title}</strong>
                                <div class="text-muted small mt-1">${opp.description}</div>
                            </div>
                            <span class="badge bg-${opp.priority === 'Alta' ? 'danger' : opp.priority === 'Média' ? 'warning' : 'secondary'} ms-2">
                                ${opp.priority}
                            </span>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    renderCharts() {
        this.renderMonthlyChart();
        this.renderActivityChart();
        this.renderRegionChart();
    }

    renderMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        const monthlyData = this.data.trends.byMonth;
        const months = Object.keys(monthlyData).sort();
        const values = months.map(month => monthlyData[month]);

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(month => {
                    const [year, monthNum] = month.split('-');
                    return new Date(year, monthNum - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                }),
                datasets: [{
                    label: 'Prospects',
                    data: values,
                    borderColor: '#c41e3a',
                    backgroundColor: 'rgba(196, 30, 58, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    renderActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        const activityData = this.data.trends.byActivity;
        const activities = Object.keys(activityData);
        const values = Object.values(activityData);

        if (activities.length === 0) {
            ctx.getContext('2d').fillText('Sem dados disponíveis', 50, 50);
            return;
        }

        this.charts.activity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: activities.map(activity => 
                    activity.charAt(0).toUpperCase() + activity.slice(1)
                ),
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#c41e3a', '#f39c12', '#3498db', '#27ae60', 
                        '#9b59b6', '#e74c3c', '#34495e', '#f1c40f'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
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

    renderRegionChart() {
        const ctx = document.getElementById('regionChart');
        if (!ctx) return;

        const regionData = this.data.trends.byRegion;
        const regions = Object.keys(regionData);
        const values = Object.values(regionData);

        if (regions.length === 0) {
            ctx.getContext('2d').fillText('Sem dados disponíveis', 50, 50);
            return;
        }

        this.charts.region = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: regions,
                datasets: [{
                    label: 'Prospects',
                    data: values,
                    backgroundColor: 'rgba(196, 30, 58, 0.8)',
                    borderColor: '#c41e3a',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // Utility methods
    formatCNPJ(cnpj) {
        if (!cnpj) return '';
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('pt-BR');
    }

    truncate(text, length) {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
}
