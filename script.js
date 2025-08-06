// script.js
class PMGProspector {
    constructor() {
        this.productImages = {}; // Será carregado do imagens.json
        this.catalog = {}; // Será carregado do PDF
        this.selectedProducts = [];
        this.prospectData = {};
        
        this.loadProductImages();
        this.loadCatalog();
        this.initEventListeners();
    }

    async loadProductImages() {
        try {
            const response = await fetch('imagens.json');
            this.productImages = await response.json();
        } catch (error) {
            console.error('Erro ao carregar imagens dos produtos:', error);
        }
    }

    async loadCatalog() {
        // Simulação do carregamento do catálogo PDF
        // Em produção, seria necessário um serviço para extrair dados do PDF
        this.catalog = {
            "5167": { name: "ACÉM BOVINO RESFRIADO PLENA 8 KG", price: "28,64", unit: "KG", category: "carnes" },
            "740": { name: "ABACAXI EM CALDA RODELAS TOZZI 400 G", price: "18,65", unit: "LT", category: "conservas" },
            // ... outros produtos do catálogo
        };
    }

    initEventListeners() {
        document.getElementById('prospectForm').addEventListener('submit', this.handleFormSubmit.bind(this));
        document.getElementById('generateOffer').addEventListener('click', this.generateOffer.bind(this));
        document.getElementById('cnpj').addEventListener('blur', this.validateCNPJ.bind(this));
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const cnpj = formData.get('cnpj');
        const instagram = formData.get('instagram');
        const facebook = formData.get('facebook');
        const website = formData.get('website');
        const menuFile = document.getElementById('menuFile').files[0];

        this.showLoading(true);

        try {
            // 1. Consultar dados da empresa via CNPJ
            const companyData = await this.getCompanyData(cnpj);
            
            // 2. Analisar redes sociais
            const socialData = await this.analyzeSocialMedia(instagram, facebook);
            
            // 3. Analisar cardápio
            const menuData = await this.analyzeMenu(website, menuFile);
            
            // 4. Gerar sugestões de produtos
            const suggestions = this.generateProductSuggestions(companyData, socialData, menuData);
            
            // 5. Gerar script de vendas
            const salesScript = this.generateSalesScript(companyData, suggestions);

            this.prospectData = {
                company: companyData,
                social: socialData,
                menu: menuData,
                suggestions,
                salesScript
            };

            this.displayResults();
            
        } catch (error) {
            console.error('Erro na análise:', error);
            alert('Erro ao analisar os dados. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    async getCompanyData(cnpj) {
        // Remove formatação do CNPJ
        const cleanCNPJ = cnpj.replace(/\D/g, '');
        
        try {
            // API pública da ReceitaWS
            const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
            const data = await response.json();
            
            if (data.status === 'ERROR') {
                throw new Error(data.message);
            }

            return {
                name: data.nome || data.fantasia,
                activity: data.atividade_principal?.[0]?.text,
                address: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`,
                phone: data.telefone,
                email: data.email,
                size: this.getCompanySize(data.capital_social),
                situation: data.situacao,
                opening: data.abertura
            };
        } catch (error) {
            console.error('Erro ao consultar CNPJ:', error);
            return { error: 'Erro ao consultar dados da empresa' };
        }
    }

    async analyzeSocialMedia(instagram, facebook) {
        // Como não há APIs públicas gratuitas robustas para análise de redes sociais,
        // vamos simular uma análise baseada em patterns da URL
        const analysis = {
            instagram: instagram ? this.analyzeInstagramProfile(instagram) : null,
            facebook: facebook ? this.analyzeFacebookProfile(facebook) : null
        };

        return analysis;
    }

    analyzeInstagramProfile(url) {
        // Análise simulada baseada no padrão da URL
        const username = url.split('/').pop();
        return {
            username,
            estimated_followers: this.estimateFollowers(username),
            content_type: this.estimateContentType(username),
            engagement_level: 'médio'
        };
    }

    async analyzeMenu(website, menuFile) {
        let menuContent = '';
        
        if (menuFile) {
            menuContent = await this.readFile(menuFile);
        } else if (website) {
            // Simulação de scraping (em produção usaria um proxy/API)
            menuContent = await this.fetchWebsiteContent(website);
        }

        return this.parseMenuContent(menuContent);
    }

    parseMenuContent(content) {
        // Análise do conteúdo do menu
        const items = this.extractMenuItems(content);
        const categories = this.extractCategories(items);
        const priceRange = this.analyzePriceRange(items);
        
        return {
            items,
            categories,
            priceRange,
            itemCount: items.length
        };
    }

    extractMenuItems(content) {
        // Regex para extrair itens do menu com preços
        const itemRegex = /([A-ZÁÉÍÓÚ][^R\$]+)R\$\s*(\d+,\d{2})/g;
        const items = [];
        let match;

        while ((match = itemRegex.exec(content)) !== null) {
            items.push({
                name: match[1].trim(),
                price: parseFloat(match[2].replace(',', '.'))
            });
        }

        return items;
    }

    extractCategories(items) {
        const categories = new Set();
        
        items.forEach(item => {
            const name = item.name.toLowerCase();
            if (name.includes('pizza')) categories.add('pizzas');
            if (name.includes('hamburguer') || name.includes('burger')) categories.add('hamburguers');
            if (name.includes('parmegiana')) categories.add('pratos');
            if (name.includes('refrigerante') || name.includes('coca')) categories.add('bebidas');
            if (name.includes('sobremesa') || name.includes('pudim')) categories.add('sobremesas');
        });

        return Array.from(categories);
    }

    generateProductSuggestions(companyData, socialData, menuData) {
        const suggestions = [];
        
        // Lógica de sugestão baseada no tipo de estabelecimento
        if (menuData.categories.includes('pizzas')) {
            suggestions.push(
                { code: '597', priority: 'high', reason: 'Farinha específica para pizza' },
                { code: '334', priority: 'high', reason: 'Queijo muzzarela para pizza' },
                { code: '277', priority: 'medium', reason: 'Molho de tomate para pizza' }
            );
        }

        if (menuData.categories.includes('hamburguers')) {
            suggestions.push(
                { code: '5167', priority: 'high', reason: 'Carne bovina para hambúrguer' },
                { code: '271', priority: 'medium', reason: 'Bacon para hambúrguer' }
            );
        }

        if (menuData.categories.includes('pratos')) {
            suggestions.push(
                { code: '334', priority: 'high', reason: 'Queijo muzzarela' },
                { code: '597', priority: 'medium', reason: 'Farinha de trigo' }
            );
        }

        // Adicionar informações do catálogo
        return suggestions.map(item => ({
            ...item,
            ...this.catalog[item.code],
            image: this.productImages[item.code]
        })).filter(item => item.name); // Remove itens sem dados
    }

    generateSalesScript(companyData, suggestions) {
        return `
        🎯 SCRIPT DE VENDAS PERSONALIZADO
        
        👋 Olá ${companyData.name}!
        
        Meu nome é [SEU NOME], sou representante comercial da PMG Atacadista, há 30 anos no mercado fornecendo ingredientes de qualidade para estabelecimentos como o seu.
        
        📍 Pelo que vi, vocês estão localizados em ${companyData.address.split(',')[2]}, uma região com grande movimento no setor alimentício.
        
        🔍 Analisando seu negócio, identifiquei algumas oportunidades para otimizar seus custos e melhorar a qualidade dos seus pratos:
        
        ${suggestions.map(product => `
        ✅ ${product.name}
        💰 Preço PMG: R$ ${product.price}/${product.unit}
        🎯 Motivo: ${product.reason}
        `).join('')}
        
        🚚 VANTAGENS PMG:
        • Entregas programadas na região
        • Preços competitivos no atacado
        • 30 anos de experiência no mercado
        • Produtos de alta qualidade
        
        💬 Que tal agendar uma visita para apresentar nosso portfólio completo e fazer uma cotação personalizada?
        
        Melhor dia e horário para você?
        `;
    }

    displayResults() {
        document.querySelector('.results-section').style.display = 'block';
        
        // Dados da empresa
        document.getElementById('companyInfo').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>${this.prospectData.company.name}</h5>
                    <p><strong>Atividade:</strong> ${this.prospectData.company.activity}</p>
                    <p><strong>Endereço:</strong> ${this.prospectData.company.address}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Telefone:</strong> ${this.prospectData.company.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${this.prospectData.company.email || 'N/A'}</p>
                    <p><strong>Porte:</strong> ${this.prospectData.company.size}</p>
                </div>
            </div>
        `;

        // Análise do cardápio
        document.getElementById('menuAnalysis').innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <h6>Total de Itens</h6>
                    <p class="fs-4 text-primary">${this.prospectData.menu.itemCount}</p>
                </div>
                <div class="col-md-4">
                    <h6>Categorias</h6>
                    <p>${this.prospectData.menu.categories.join(', ')}</p>
                </div>
                <div class="col-md-4">
                    <h6>Faixa de Preços</h6>
                    <p>R$ ${this.prospectData.menu.priceRange?.min || 0} - R$ ${this.prospectData.menu.priceRange?.max || 0}</p>
                </div>
            </div>
        `;

        // Produtos sugeridos
        const productsHTML = this.prospectData.suggestions.map(product => `
            <div class="col-md-4 mb-3">
                <div class="card product-card h-100" data-code="${product.code}">
                    ${product.image ? `<img src="${product.image}" class="card-img-top" style="height: 200px; object-fit: cover;">` : ''}
                    <div class="card-body">
                        <h6 class="card-title">${product.name}</h6>
                        <p class="card-text text-muted">${product.reason}</p>
                        <p class="card-text"><strong>R$ ${product.price}/${product.unit}</strong></p>
                        <button class="btn btn-outline-primary btn-sm select-product" data-code="${product.code}">
                            Selecionar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('productSuggestions').innerHTML = productsHTML;

        // Script de vendas
        document.getElementById('salesScript').innerHTML = `<pre class="bg-light p-3 rounded">${this.prospectData.salesScript}</pre>`;

        // Event listeners para seleção de produtos
        document.querySelectorAll('.select-product').forEach(btn => {
            btn.addEventListener('click', this.toggleProductSelection.bind(this));
        });

        // Scroll para os resultados
        document.querySelector('.results-section').scrollIntoView({ behavior: 'smooth' });
    }

    toggleProductSelection(e) {
        const code = e.target.dataset.code;
        const card = e.target.closest('.product-card');
        
        if (this.selectedProducts.includes(code)) {
            this.selectedProducts = this.selectedProducts.filter(p => p !== code);
            card.classList.remove('selected');
            e.target.textContent = 'Selecionar';
            e.target.classList.remove('btn-primary');
            e.target.classList.add('btn-outline-primary');
        } else {
            this.selectedProducts.push(code);
            card.classList.add('selected');
            e.target.textContent = 'Selecionado';
            e.target.classList.add('btn-primary');
            e.target.classList.remove('btn-outline-primary');
        }
    }

    async generateOffer() {
        if (this.selectedProducts.length === 0) {
            alert('Selecione pelo menos um produto para gerar a oferta.');
            return;
        }

        // Integração com Canva API (simulação)
        const offerData = {
            products: this.selectedProducts.map(code => ({
                code,
                ...this.catalog[code],
                image: this.productImages[code]
            })),
            company: this.prospectData.company
        };

        await this.createCanvaDesign(offerData);
    }

    async createCanvaDesign(offerData) {
        // Em produção, seria necessário usar a API do Canva
        // Por agora, vamos simular a criação
        console.log('Criando design no Canva com:', offerData);
        
        alert('Oferta personalizada sendo criada! Em produção, seria integrado com a API do Canva.');
    }

    // Métodos auxiliares
    validateCNPJ(e) {
        const cnpj = e.target.value.replace(/\D/g, '');
        if (cnpj.length === 11 && this.isValidCPF(cnpj)) {
            e.target.setCustomValidity('');
        } else if (cnpj.length === 14 && this.isValidCNPJ(cnpj)) {
            e.target.setCustomValidity('');
        } else {
            e.target.setCustomValidity('CNPJ inválido');
        }
    }

    isValidCNPJ(cnpj) {
        // Algoritmo de validação do CNPJ
        if (cnpj.length !== 14) return false;
        
        const digits = cnpj.split('').map(Number);
        
        // Validação do primeiro dígito
        let sum = 0;
        let weight = 5;
        for (let i = 0; i < 12; i++) {
            sum += digits[i] * weight;
            weight = weight === 2 ? 9 : weight - 1;
        }
        const firstCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        
        if (digits[12] !== firstCheck) return false;
        
        // Validação do segundo dígito
        sum = 0;
        weight = 6;
        for (let i = 0; i < 13; i++) {
            sum += digits[i] * weight;
            weight = weight === 2 ? 9 : weight - 1;
        }
        const secondCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        
        return digits[13] === secondCheck;
    }

    showLoading(show) {
        document.querySelector('.loading-spinner').style.display = show ? 'block' : 'none';
        document.getElementById('prospectForm').style.display = show ? 'none' : 'block';
    }

    getCompanySize(capital) {
        if (!capital) return 'Não informado';
        const value = parseFloat(capital.toString().replace(',', '.'));
        if (value <= 81000) return 'Microempresa';
        if (value <= 300000) return 'Pequeno Porte';
        return 'Médio/Grande Porte';
    }

    estimateFollowers(username) {
        // Estimativa baseada no comprimento do username (simulação)
        return Math.floor(Math.random() * 10000) + 1000;
    }

    estimateContentType(username) {
        // Análise simulada do tipo de conteúdo
        return 'Gastronômico';
    }

    analyzePriceRange(items) {
        if (items.length === 0) return null;
        
        const prices = items.map(item => item.price);
        return {
            min: Math.min(...prices).toFixed(2),
            max: Math.max(...prices).toFixed(2),
            avg: (prices.reduce((a, b) => a + b) / prices.length).toFixed(2)
        };
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async fetchWebsiteContent(url) {
        // Em produção, seria necessário um proxy para evitar CORS
        // Por agora, retorna conteúdo simulado
        return 'Conteúdo simulado do website...';
    }
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', () => {
    new PMGProspector();
});
