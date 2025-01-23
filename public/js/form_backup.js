// public/js/form.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('userToken');
    const userName = localStorage.getItem('userName');
    
    if (!token || !userName) {
        window.location.href = '/';
        return;
    }

    const form = document.getElementById('movimentacaoForm');
    const addDependenteBtn = document.getElementById('addDependenteBtn');
    const dependentesList = document.getElementById('dependentesList');
    const titularPlanoInputs = document.querySelectorAll('input[name^="titular_plano"]');
    let dependenteCount = 0;

    // Mapeamento de planos para campos de cartão
    const planoToCartao = {
        'unimed': 'unimed',
        'uniodonto': 'uniodonto',
        'bradesco_saude': 'bradesco_saude',
        'bradesco_dental': 'bradesco_dental'
    };

    // Configurar campos de cartão do titular
    function setupTitularCartoes() {
        const planoInputs = document.querySelectorAll('input[name^="titular_plano_"]');
        planoInputs.forEach(input => {
            const planoFull = input.name.replace('titular_plano_', '');
            const cartaoInput = document.querySelector(
                `input[name="titular_cartao_${planoFull}"]`
            );
            
            if (cartaoInput) {
                // Garantir que está escondido inicialmente
                cartaoInput.parentElement.style.display = 'none';
                
                // Adicionar evento de mudança
                input.addEventListener('change', () => {
                    cartaoInput.parentElement.style.display = input.checked ? 'block' : 'none';
                    if (!input.checked) cartaoInput.value = '';
                });
            }
        });
    }

    // Configurar campos de cartão do dependente
    function setupDependenteCartoes(dependenteId) {
        const planoInputs = document.querySelectorAll(`#dependente_${dependenteId} input[type="checkbox"]`);
        planoInputs.forEach(input => {
            const planoFull = input.name.split('plano_')[1];
            const cartaoInput = document.querySelector(
                `#dependente_${dependenteId} input[name="dependente_${dependenteId}_cartao_${planoFull}"]`
            );
            
            if (cartaoInput) {
                cartaoInput.parentElement.style.display = 'none'; // Esconder inicialmente
                input.addEventListener('change', () => {
                    cartaoInput.parentElement.style.display = input.checked ? 'block' : 'none';
                    if (!input.checked) cartaoInput.value = '';
                });
            }
        });
    }

    // Adicionar dependente
    addDependenteBtn.addEventListener('click', () => {
        const dependenteId = ++dependenteCount;
        const dependenteHtml = createDependenteHtml(dependenteId);
        dependentesList.insertAdjacentHTML('beforeend', dependenteHtml);

        // Adicionar evento para remover dependente
        const removeBtn = document.getElementById(`removeDependente_${dependenteId}`);
        removeBtn.addEventListener('click', () => {
            document.getElementById(`dependente_${dependenteId}`).remove();
        });

        // Configurar campos de cartão
        setupDependenteCartoes(dependenteId);
    });

    // Função para criar HTML do dependente
    function createDependenteHtml(id) {
        return `
            <div id="dependente_${id}" class="dependente-card">
                <div class="dependente-header">
                    <h4>Dependente ${id}</h4>
                    <button type="button" id="removeDependente_${id}" class="remove-dependente">
                        Remover Dependente
                    </button>
                </div>

                <div class="form-group">
                    <label>Nome do Dependente:</label>
                    <input type="text" name="dependente_${id}_nome" required>
                </div>

                <div class="form-group">
                    <label>Planos:</label>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="dependente_${id}_plano_unimed">
                            Unimed
                        </label>
                        <label>
                            <input type="checkbox" name="dependente_${id}_plano_uniodonto">
                            Uniodonto
                        </label>
                        <label>
                            <input type="checkbox" name="dependente_${id}_plano_bradesco_saude">
                            Bradesco Saúde
                        </label>
                        <label>
                            <input type="checkbox" name="dependente_${id}_plano_bradesco_dental">
                            Bradesco Dental
                        </label>
                    </div>
                </div>

                <div class="form-group cartoes-group">
                    <div style="display: none;">
                        <label>Cartão Unimed:</label>
                        <input type="text" name="dependente_${id}_cartao_unimed">
                    </div>
                    <div style="display: none;">
                        <label>Cartão Uniodonto:</label>
                        <input type="text" name="dependente_${id}_cartao_uniodonto">
                    </div>
                    <div style="display: none;">
                        <label>Cartão Bradesco Saúde:</label>
                        <input type="text" name="dependente_${id}_cartao_bradesco_saude">
                    </div>
                    <div style="display: none;">
                        <label>Cartão Bradesco Dental:</label>
                        <input type="text" name="dependente_${id}_cartao_bradesco_dental">
                    </div>
                </div>
            </div>
        `;
    }

    // Funções de validação
    function validateForm() {
        const formData = new FormData(form);
        const tipo = formData.get('tipo');
        const matricula_titular = formData.get('matricula_titular');
        const nome_titular = formData.get('nome_titular');
    
        // Verificar se há algum plano selecionado para o titular
        const titularTemPlano = Array.from(titularPlanoInputs).some(input => input.checked);
    
        // Verificar se há dependentes
        const dependentes = document.querySelectorAll('.dependente-card');
        const temDependentes = dependentes.length > 0;
    
        // Se não tiver nem titular com plano nem dependentes, não permite salvar
        if (!titularTemPlano && !temDependentes) {
            alert('É necessário selecionar ao menos um plano para o titular OU adicionar um dependente');
            return false;
        }
    
        // Se tiver titular com plano, valida os dados do titular
        if (titularTemPlano) {
            if (!matricula_titular.trim()) {
                alert('Matrícula do titular é obrigatória');
                return false;
            }
            if (!nome_titular.trim()) {
                alert('Nome do titular é obrigatório');
                return false;
            }
        }
    
        // Se tiver dependentes, valida cada um
        if (temDependentes) {
            for (const dep of dependentes) {
                const nome = dep.querySelector('input[name$="_nome"]');
                if (!nome.value.trim()) {
                    alert('Preencha o nome do dependente');
                    nome.focus();
                    return false;
                }
    
                const planos = dep.querySelectorAll('input[type="checkbox"]');
                const temPlano = Array.from(planos).some(input => input.checked);
                if (!temPlano) {
                    alert('Selecione ao menos um plano para o dependente');
                    return false;
                }
            }
        }
    
        return true;
    }

    // Enviar formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = new FormData(form);
        const data = {
            tipo: formData.get('tipo'),
            matricula_titular: formData.get('matricula_titular'),
            nome_titular: formData.get('nome_titular'),
            usuario_responsavel: userName,
            observacoes: formData.get('observacoes'),
            titular: {
                planos: {
                    unimed: formData.get('titular_plano_unimed') === 'on',
                    uniodonto: formData.get('titular_plano_uniodonto') === 'on',
                    bradesco_saude: formData.get('titular_plano_bradesco_saude') === 'on',
                    bradesco_dental: formData.get('titular_plano_bradesco_dental') === 'on'
                },
                cartoes: {
                    unimed: formData.get('titular_cartao_unimed'),
                    uniodonto: formData.get('titular_cartao_uniodonto'),
                    bradesco_saude: formData.get('titular_cartao_bradesco_saude'),
                    bradesco_dental: formData.get('titular_cartao_bradesco_dental')
                }
            },
            dependentes: []
        };

        // Coletar dados dos dependentes
        for (let i = 1; i <= dependenteCount; i++) {
            const dependenteElement = document.getElementById(`dependente_${i}`);
            if (!dependenteElement) continue;

            const dependente = {
                nome: formData.get(`dependente_${i}_nome`),
                planos: {
                    unimed: formData.get(`dependente_${i}_plano_unimed`) === 'on',
                    uniodonto: formData.get(`dependente_${i}_plano_uniodonto`) === 'on',
                    bradesco_saude: formData.get(`dependente_${i}_plano_bradesco_saude`) === 'on',
                    bradesco_dental: formData.get(`dependente_${i}_plano_bradesco_dental`) === 'on'
                },
                cartoes: {
                    unimed: formData.get(`dependente_${i}_cartao_unimed`),
                    uniodonto: formData.get(`dependente_${i}_cartao_uniodonto`),
                    bradesco_saude: formData.get(`dependente_${i}_cartao_bradesco_saude`),
                    bradesco_dental: formData.get(`dependente_${i}_cartao_bradesco_dental`)
                }
            };
            data.dependentes.push(dependente);
        }

        try {
            const response = await fetch('/api/movimentacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao registrar movimentação');
            }

            alert('Movimentação registrada com sucesso!');
            form.reset();
            dependentesList.innerHTML = '';
            dependenteCount = 0;

            // Esconder todos os campos de cartão após reset
            titularPlanoInputs.forEach(input => {
                const planoFull = input.name.replace('titular_plano_', '');
                const cartaoInput = document.querySelector(`input[name="titular_cartao_${planoFull}"]`);
                if (cartaoInput) {
                    cartaoInput.parentElement.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });

    // Inicializar campos do titular
    setupTitularCartoes();
});