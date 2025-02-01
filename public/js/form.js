// public/js/form.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('userToken');
    const userName = localStorage.getItem('userName');
    const tipoCadastro = document.getElementById('tipoCadastro');
    const dadosTitularSection = document.querySelector('.form-section');
    const selecaoTitularSection = document.getElementById('selecaoTitular');
    const titularExistente = document.getElementById('titularExistente');
    const infoTitular = document.getElementById('infoTitular');
    const form = document.getElementById('movimentacaoForm');
    const addDependenteBtn = document.getElementById('addDependenteBtn');
    const dependentesList = document.getElementById('dependentesList');
    const titularPlanoInputs = document.querySelectorAll('input[name^="titular_plano"]');
    let dependenteCount = 0;
    let titularesCache = [];

    if (!token || !userName) {
        window.location.href = '/';
        return;
    }

    console.log('Token:', token);
    console.log('UserName:', userName);

    // Mapeamento de planos para campos de cartão
    const planoToCartao = {
        'unimed': 'unimed',
        'uniodonto': 'uniodonto',
        'bradesco_saude': 'bradesco_saude',
        'bradesco_dental': 'bradesco_dental'
    };

    // Adicionar função para carregar titulares
    async function carregarTitulares() {
        try {
            const response = await fetch('/api/titulares', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Erro ao carregar titulares');
            }
    
            titularesCache = await response.json();
            titularExistente.innerHTML = '<option value="">Selecione um titular...</option>';
            
            titularesCache.forEach(titular => {
                const option = document.createElement('option');
                option.value = titular.matricula;
                option.textContent = `${titular.nome_titular} (${titular.matricula})`;
                titularExistente.appendChild(option);
            });
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar lista de titulares');
        }
    }

    // Adicionar listener para mudança no tipo de cadastro
    tipoCadastro.addEventListener('change', () => {
        const isCadastroCompleto = tipoCadastro.value === 'completo';
        
        dadosTitularSection.style.display = isCadastroCompleto ? 'block' : 'none';
        selecaoTitularSection.style.display = isCadastroCompleto ? 'none' : 'block';
        
        if (!isCadastroCompleto) {
            carregarTitulares();
        }
        
        // Resetar campos relevantes
        if (isCadastroCompleto) {
            titularExistente.value = '';
            infoTitular.style.display = 'none';
            resetTitularPlanos();
        } else {
            form.querySelector('input[name="matricula_titular"]').value = '';
            form.querySelector('input[name="nome_titular"]').value = '';
            resetTitularPlanos();
        }
    });

    // Adicionar listener para seleção de titular
    titularExistente.addEventListener('change', () => {
        const titular = titularesCache.find(t => t.matricula === titularExistente.value);
        
        if (titular) {
            // Preencher os campos ocultos do formulário
            form.querySelector('input[name="matricula_titular"]').value = titular.matricula;
            form.querySelector('input[name="nome_titular"]').value = titular.nome_titular;
    
            // Atualizar a exibição das informações
            document.getElementById('infoMatricula').textContent = titular.matricula;
            document.getElementById('infoNome').textContent = titular.nome_titular;
            infoTitular.style.display = 'block';
        } else {
            infoTitular.style.display = 'none';
        }
    });

    // Função auxiliar para resetar planos do titular
    function resetTitularPlanos() {
        const planoInputs = document.querySelectorAll('input[name^="titular_plano_"]');
        planoInputs.forEach(input => {
            input.checked = false;
            const planoName = input.name.replace('titular_plano_', '');
            const cartaoInput = document.querySelector(`input[name="titular_cartao_${planoName}"]`);
            if (cartaoInput) {
                cartaoInput.parentElement.style.display = 'none';
                cartaoInput.value = '';
            }
        });
    }

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
                    <label>Grau de Parentesco:</label>
                    <select name="dependente_${id}_grau_parentesco" required>
                        <option value="">Selecione...</option>
                        <option value="Cônjuge">Cônjuge</option>
                        <option value="Filho(a)">Filho(a)</option>
                        <option value="Pai/Mãe">Pai/Mãe</option>
                        <option value="Outro">Outro</option>
                    </select>
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

    async function carregarInformacoesTitular(matricula) {
        try {
            const response = await fetch(`/api/titulares/${matricula}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error('Erro ao carregar informações do titular');
            }
    
            const titular = await response.json();
            
            // Preencher campos do titular
            form.querySelector('input[name="matricula_titular"]').value = titular.matricula;
            form.querySelector('input[name="nome_titular"]').value = titular.nome_titular;
    
            // Atualizar checkboxes dos planos
            form.querySelector('input[name="titular_plano_unimed"]').checked = titular.plano_unimed;
            form.querySelector('input[name="titular_plano_uniodonto"]').checked = titular.plano_uniodonto;
            form.querySelector('input[name="titular_plano_bradesco_saude"]').checked = titular.plano_bradesco_saude;
            form.querySelector('input[name="titular_plano_bradesco_dental"]').checked = titular.plano_bradesco_dental;
    
            // Desabilitar campos do titular
            form.querySelector('input[name="matricula_titular"]').disabled = true;
            form.querySelector('input[name="nome_titular"]').disabled = true;
            form.querySelectorAll('input[name^="titular_plano_"]').forEach(input => {
                input.disabled = true;
            });
    
            // Atualizar cartões se necessário
            if (titular.plano_unimed) {
                const cartaoInput = form.querySelector('input[name="titular_cartao_unimed"]');
                cartaoInput.value = titular.cartao_unimed || '';
                cartaoInput.parentElement.style.display = 'block';
                cartaoInput.disabled = true;
            }
            // Repetir para outros planos...
    
            // Atualizar exibição das informações
            document.getElementById('infoMatricula').textContent = titular.matricula;
            document.getElementById('infoNome').textContent = titular.nome_titular;
            const planos = [];
            if (titular.plano_unimed) planos.push('Unimed');
            if (titular.plano_uniodonto) planos.push('Uniodonto');
            if (titular.plano_bradesco_saude) planos.push('Bradesco Saúde');
            if (titular.plano_bradesco_dental) planos.push('Bradesco Dental');
            document.getElementById('infoPlanos').textContent = planos.join(', ') || 'Nenhum';
            
            infoTitular.style.display = 'block';
    
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar informações do titular');
        }
    }
    
    // Atualizar o listener de mudança do titular
    titularExistente.addEventListener('change', () => {
        const titular = titularesCache.find(t => t.matricula === titularExistente.value);
        
        if (titular) {
            // Preencher os campos do formulário
            form.querySelector('input[name="matricula_titular"]').value = titular.matricula;
            form.querySelector('input[name="nome_titular"]').value = titular.nome_titular;
    
            // Atualizar checkboxes dos planos e campos de cartão
            const planos = [
                'unimed',
                'uniodonto',
                'bradesco_saude',
                'bradesco_dental'
            ];
    
            planos.forEach(plano => {
                const checkbox = form.querySelector(`input[name="titular_plano_${plano}"]`);
                const cartaoInput = form.querySelector(`input[name="titular_cartao_${plano}"]`);
                const planoAtivo = titular[`plano_${plano}`];
                const numeroCartao = titular[`cartao_${plano}`];
    
                if (checkbox) {
                    checkbox.checked = planoAtivo;
                    checkbox.disabled = true;
                }
    
                if (cartaoInput) {
                    cartaoInput.value = numeroCartao || '';
                    cartaoInput.disabled = true;
                    cartaoInput.parentElement.style.display = planoAtivo ? 'block' : 'none';
                }
            });
    
            // Atualizar informações exibidas
            document.getElementById('infoMatricula').textContent = titular.matricula;
            document.getElementById('infoNome').textContent = titular.nome_titular;
            
            const planosAtivos = planos
                .filter(plano => titular[`plano_${plano}`])
                .map(plano => plano.replace('_', ' ').replace(/(^\w|\s\w)/g, l => l.toUpperCase()));
            
            document.getElementById('infoPlanos').textContent = planosAtivos.join(', ') || 'Nenhum';
            infoTitular.style.display = 'block';
        } else {
            infoTitular.style.display = 'none';
            resetTitularPlanos();
        }
    });

    // Funções de validação
    function validateForm() {
        const formData = new FormData(form);
        const isCadastroCompleto = tipoCadastro.value === 'completo';
        
        // Validação específica para cadastro apenas de dependentes
        if (!isCadastroCompleto) {
            if (!titularExistente.value) {
                alert('Selecione um titular');
                return false;
            }
        } else {
            // Validação original para cadastro completo
            const matricula_titular = formData.get('matricula_titular');
            const nome_titular = formData.get('nome_titular');
            const titularTemPlano = Array.from(titularPlanoInputs).some(input => input.checked);
            
            if (titularTemPlano) {
                if (!matricula_titular.trim()) {
                    alert('Matrícula do titular é obrigatória');
                    return false;
                }
                if (!nome_titular.trim()) {
                    alert('Nome do titular é obrigatório');
                    return false;
                }
            }else{
                alert('Selecione ao menos um plano para o titular');
                return false;
            }
        }
    
        // Validação de dependentes
        const dependentes = document.querySelectorAll('.dependente-card');
        if (dependentes.length > 0) {
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
        const isCadastroCompleto = tipoCadastro.value === 'completo';
    
        const data = {
            tipo: formData.get('tipo'),
            matricula_titular: formData.get('matricula_titular'),
            nome_titular: formData.get('nome_titular'),
            usuario_responsavel: userName,
            observacoes: formData.get('observacoes'),
            dependentes: []
        };
    
        // Adicionar dados do titular apenas se for cadastro completo
        if (isCadastroCompleto) {
            data.titular = {
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
            };
        }
    
        // Coletar dados dos dependentes
        for (let i = 1; i <= dependenteCount; i++) {
            const dependenteElement = document.getElementById(`dependente_${i}`);
            if (!dependenteElement) continue;
    
            const dependente = {
                nome: formData.get(`dependente_${i}_nome`),
                grau_parentesco: formData.get(`dependente_${i}_grau_parentesco`),
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
    
            // Limpar campos de cartão
            document.querySelectorAll('.cartoes-group div').forEach(div => {
                div.style.display = 'none';
            });
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });

    // Inicializar campos do titular
    setupTitularCartoes();
});