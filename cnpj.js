class CNPJApi {
    constructor() {
        this.apis = API_CONFIG.CNPJ.urls;
        this.rateLimiter = new RateLimiter(RATE_LIMITS.CNPJ);
        this.cache = new CacheManager();
        this.errorHandler = new ErrorHandler();
    }

    async getCompanyData(cnpj) {
        // Validar CNPJ
        const cleanCNPJ = cnpj.replace(/\D/g, '');
        if (!this.validateCNPJ(cleanCNPJ)) {
            throw new Error('CNPJ inválido');
        }

        // Verificar cache
        const cacheKey = `cnpj_${cleanCNPJ}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log('📋 Dados do CNPJ obtidos do cache');
            return cached;
        }

        // Verificar rate limit
        if (!this.rateLimiter.canMakeRequest()) {
            throw new Error('Limite de consultas excedido. Aguarde alguns minutos.');
        }

        // Tentar múltiplas APIs
        let lastError = null;
        
        for (const apiUrl of this.apis) {
            try {
                const data = await this.queryAPI(apiUrl, cleanCNPJ);
                
                if (data && !data.erro) {
                    const processedData = this.processCompanyData(data);
                    
                    // Salvar no cache
                    this.cache.set(cacheKey, processedData, CACHE_CONFIG.company);
                    this.rateLimiter.recordRequest();
                    
                    console.log('✅ Dados do CNPJ obtidos com sucesso');
                    return processedData;
                }
            } catch (error) {
                console.warn(`⚠️ Erro na API ${apiUrl}:`, error.message);
                lastError = error;
                continue;
            }
        }

        throw new Error(`Não foi possível obter dados do CNPJ: ${lastError?.message || 'APIs indisponíveis'}`);
    }

    async queryAPI(baseUrl, cnpj) {
        const url = baseUrl + cnpj;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PMG-ProspecPro/1.0'
                },
                timeout: 10000
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Limite de requisições atingido');
                }
                if (response.status === 404) {
                    throw new Error('CNPJ não encontrado');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Verificar se há erro na resposta
            if (data.status === 'ERROR' || data.erro) {
                throw new Error(data.message || data.erro || 'Erro na consulta');
            }

            return data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Timeout na consulta do CNPJ');
            }
            throw error;
        }
    }

    processCompanyData(rawData) {
        // Processar dados de diferentes APIs
        const data = {
            cnpj: rawData.cnpj || rawData.documento || '',
            name: rawData.nome || rawData.razao_social || rawData.fantasia || '',
            fantasyName: rawData.fantasia || rawData.nome_fantasia || '',
            activity: this.extractMainActivity(rawData),
            secondaryActivities: this.extractSecondaryActivities(rawData),
            address: this.formatAddress(rawData),
            coordinates: null, // Será preenchido se disponível
            phone: this.formatPhone(rawData.telefone || rawData.ddd_telefone_1 || ''),
            email: rawData.email || '',
            situation: rawData.situacao || rawData.status || 'ATIVA',
            opening: this.formatDate(rawData.abertura || rawData.data_abertura || ''),
            lastUpdate: this.formatDate(rawData.ultima_atualizacao || ''),
            capital: this.formatCurrency(rawData.capital_social || '0'),
            size: this.getCompanySize(rawData.capital_social || rawData.porte || ''),
            legalNature: rawData.natureza_juridica || '',
            employees: this.estimateEmployees(rawData),
            federalRevenue: {
                simples: rawData.simples?.optante || false,
                simei: rawData.simei?.optante || false,
                mei: this.isMEI(rawData.porte)
            },
            partners: this.extractPartners(rawData.qsa || []),
            raw: rawData // Dados brutos para debug
        };

        // Obter coordenadas se possível
        this.getCoordinates(data.address).then(coords => {
            if (coords) {
                data.coordinates = coords;
            }
        }).catch(console.warn);

        return data;
    }

    extractMainActivity(data) {
        if (data.atividade_principal) {
            if (Array.isArray(data.atividade_principal) && data.atividade_principal.length > 0) {
                return data.atividade_principal[0].text || data.atividade_principal[0].descricao || '';
            }
            return data.atividade_principal.text || data.atividade_principal.descricao || '';
        }
        
        if (data.cnae_fiscal_descricao) {
            return data.cnae_fiscal_descricao;
        }
        
        return 'Não informado';
    }

    extractSecondaryActivities(data) {
        if (data.atividades_secundarias && Array.isArray(data.atividades_secundarias)) {
            return data.atividades_secundarias.map(activity => 
                activity.text || activity.descricao || ''
            ).filter(Boolean);
        }
        return [];
    }

    formatAddress(data) {
        const parts = [];
        
        if (data.logradouro) parts.push(data.logradouro);
        if (data.numero) parts.push(data.numero);
        if (data.complemento) parts.push(data.complemento);
        if (data.bairro) parts.push(data.bairro);
        
        let address = parts.join(', ');
        
        if (data.municipio) {
            address += `, ${data.municipio}`;
        }
        
        if (data.uf) {
            address += `/${data.uf}`;
        }
        
        if (data.cep) {
            address += ` - CEP: ${data.cep}`;
        }
        
        return address || 'Endereço não informado';
    }

    formatPhone(phone) {
        if (!phone) return '';
        
        const clean = phone.replace(/\D/g, '');
        
        if (clean.length === 10) {
            return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
        } else if (clean.length === 11) {
            return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
        }
        
        return phone;
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateStr;
        }
    }

    formatCurrency(value) {
        if (!value) return 'R$ 0,00';
        
        const num = parseFloat(value.toString().replace(',', '.'));
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(num);
    }

    getCompanySize(capital) {
        if (typeof capital === 'string' && capital.toLowerCase().includes('mei')) {
            return 'Microempreendedor Individual';
        }
        
        const value = parseFloat(capital.toString().replace(/[^\d,]/g, '').replace(',', '.'));
        
        if (isNaN(value) || value === 0) return 'Não informado';
        if (value <= 81000) return 'Microempresa';
        if (value <= 300000) return 'Empresa de Pequeno Porte';
        if (value <= 3600000) return 'Empresa de Médio Porte';
        return 'Empresa de Grande Porte';
    }

    estimateEmployees(data) {
        // Estimativa baseada no porte da empresa
        const capital = parseFloat((data.capital_social || '0').toString().replace(/[^\d,]/g, '').replace(',', '.'));
        
        if (capital <= 81000) return '1-9';
        if (capital <= 300000) return '10-49';
        if (capital <= 3600000) return '50-249';
        return '250+';
    }

    isMEI(porte) {
        return typeof porte === 'string' && porte.toLowerCase().includes('mei');
    }

    extractPartners(partners) {
        if (!Array.isArray(partners)) return [];
        
        return partners.map(partner => ({
            name: partner.nome || partner.nome_socio || '',
            qualification: partner.qual || partner.qualificacao_socio || '',
            document: partner.cpf_cnpj_socio || ''
        })).filter(p => p.name);
    }

    async getCoordinates(address) {
        if (!address || address === 'Endereço não informado') return null;
        
        try {
            // Usar API de geocoding gratuita
            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
                headers: {
                    'User-Agent': 'PMG-ProspecPro/1.0'
                }
            });
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.warn('Erro ao obter coordenadas:', error);
        }
        
        return null;
    }

    validateCNPJ(cnpj) {
        if (!cnpj || cnpj.length !== 14) return false;
        
        // Eliminar CNPJs com dígitos repetidos
        if (/^(\d)\1+$/.test(cnpj)) return false;
        
        const digits = cnpj.split('').map(Number);
        
        // Validação do primeiro dígito verificador
        let sum = 0;
        let weight = 5;
        for (let i = 0; i < 12; i++) {
            sum += digits[i] * weight;
            weight = weight === 2 ? 9 : weight - 1;
        }
        const firstCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        
        if (digits[12] !== firstCheck) return false;
        
        // Validação do segundo dígito verificador
        sum = 0;
        weight = 6;
        for (let i = 0; i < 13; i++) {
            sum += digits[i] * weight;
            weight = weight === 2 ? 9 : weight - 1;
        }
        const secondCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        
        return digits[13] === secondCheck;
    }

    // Método para obter informações adicionais da empresa
    async getAdditionalInfo(cnpj) {
        const cleanCNPJ = cnpj.replace(/\D/g, '');
        
        try {
            // Tentar APIs complementares
            const promises = [
                this.getCompanyReputation(cleanCNPJ),
                this.getCompanyNews(cleanCNPJ),
                this.getMarketSegment(cleanCNPJ)
            ];
            
            const results = await Promise.allSettled(promises);
            
            return {
                reputation: results[0].status === 'fulfilled' ? results[0].value : null,
                news: results[1].status === 'fulfilled' ? results[1].value : null,
                marketSegment: results[2].status === 'fulfilled' ? results[2].value : null
            };
            
        } catch (error) {
            console.warn('Erro ao obter informações adicionais:', error);
            return {};
        }
    }

    async getCompanyReputation(cnpj) {
        // Simulação de análise de reputação
        // Em produção, integraria com APIs de análise de crédito
        return {
            score: Math.floor(Math.random() * 1000) + 1,
            level: ['Baixo', 'Médio', 'Alto'][Math.floor(Math.random() * 3)],
            lastUpdate: new Date().toISOString()
        };
    }

    async getCompanyNews(cnpj) {
        // Simulação de busca por notícias
        // Em produção, integraria com APIs de notícias
        return [];
    }

    async getMarketSegment(cnpj) {
        // Simulação de análise de segmento
        return {
            segment: 'Alimentício',
            subsegment: 'Restaurantes',
            competitors: ['Concorrente A', 'Concorrente B']
        };
    }
}
