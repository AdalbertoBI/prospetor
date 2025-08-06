// canva-integration.js
class CanvaIntegration {
    constructor() {
        this.apiKey = 'YOUR_CANVA_API_KEY'; // Em produção
        this.baseUrl = 'https://api.canva.com';
    }

    async createOfferDesign(offerData) {
        const designElements = this.prepareDesignElements(offerData);
        
        // Simulação da criação no Canva
        const design = {
            type: 'presentation',
            width: 1920,
            height: 1080,
            elements: designElements
        };

        try {
            // const response = await this.callCanvaAPI('/designs', design);
            // return response.data;
            
            // Simulação
            return {
                id: 'design_' + Date.now(),
                url: 'https://canva.com/design/simulated',
                thumbnail: 'https://via.placeholder.com/400x300/c41e3a/ffffff?text=PMG+Oferta'
            };
        } catch (error) {
            console.error('Erro ao criar design:', error);
            throw error;
        }
    }

    prepareDesignElements(offerData) {
        const elements = [
            // Header PMG
            {
                type: 'text',
                content: 'OFERTA ESPECIAL PMG',
                style: {
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#c41e3a',
                    x: 100,
                    y: 50
                }
            },
            // Company name
            {
                type: 'text',
                content: `Para: ${offerData.company.name}`,
                style: {
                    fontSize: 24,
                    color: '#2c3e50',
                    x: 100,
                    y: 120
                }
            }
        ];

        // Add product images and details
        offerData.products.forEach((product, index) => {
            const x = 100 + (index % 3) * 300;
            const y = 200 + Math.floor(index / 3) * 250;

            if (product.image) {
                elements.push({
                    type: 'image',
                    src: product.image,
                    x: x,
                    y: y,
                    width: 200,
                    height: 150
                });
            }

            elements.push({
                type: 'text',
                content: product.name,
                style: {
                    fontSize: 14,
                    fontWeight: 'bold',
                    x: x,
                    y: y + 160
                }
            });

            elements.push({
                type: 'text',
                content: `R$ ${product.price}/${product.unit}`,
                style: {
                    fontSize: 16,
                    color: '#c41e3a',
                    x: x,
                    y: y + 180
                }
            });
        });

        return elements;
    }

    async callCanvaAPI(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Erro na API do Canva: ${response.statusText}`);
        }

        return response.json();
    }
}
