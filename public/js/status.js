document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('userToken');
    const userProfile = localStorage.getItem('userProfile');
    const movimentacaoId = new URLSearchParams(window.location.search).get('id');
    
    if (!token || !movimentacaoId) {
        window.location.href = '/';
        return;
    }

    const canEdit = ['master', 'editor'].includes(userProfile);
    const statusSelect = document.getElementById('statusSelect');
    const editBtn = document.getElementById('editBtn');
    const checkboxes = document.querySelectorAll('.checklist-item input');

    if (canEdit) {
        editBtn.style.display = 'inline-block';
    }

    async function carregarMovimentacao() {
        try {
            const response = await fetch(`/api/movimentacoes/${movimentacaoId}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error(response.status === 404 ? 
                    'Movimentação não encontrada' : 
                    'Erro ao carregar movimentação');
            }
    
            const movimentacao = await response.json();
            preencherDados(movimentacao);
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar dados: ' + error.message);
        }
    }

    function preencherDados(mov) {
        // Status e informações básicas
        statusSelect.value = mov.status || 'enviado';
        document.getElementById('dataEnvioInfo').textContent = new Date(mov.data_envio).toLocaleString('pt-BR');
        document.getElementById('tipoInfo').textContent = formatarTipo(mov.tipo);
        document.getElementById('responsavelInfo').textContent = mov.usuario_responsavel;
        document.getElementById('observacoesInfo').textContent = mov.observacoes || '-';
    
        // Dados do Titular
        const titularInfo = document.getElementById('titularInfo');
        titularInfo.innerHTML = `
            <div class="info-row">
                <label>Matrícula:</label>
                <input type="text" value="${mov.matricula_titular}" disabled class="edit-input" data-field="matricula_titular">
            </div>
            <div class="info-row">
                <label>Nome:</label>
                <input type="text" value="${mov.nome_titular}" disabled class="edit-input" data-field="nome_titular">
            </div>
            <div class="info-row">
                <label>Planos:</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" ${mov.plano_unimed ? 'checked' : ''} disabled class="plano-checkbox" data-field="plano_unimed" data-plano="unimed">Unimed</label>
                    <label><input type="checkbox" ${mov.plano_uniodonto ? 'checked' : ''} disabled class="plano-checkbox" data-field="plano_uniodonto" data-plano="uniodonto">Uniodonto</label>
                    <label><input type="checkbox" ${mov.plano_bradesco_saude ? 'checked' : ''} disabled class="plano-checkbox" data-field="plano_bradesco_saude" data-plano="bradesco_saude">Bradesco Saúde</label>
                    <label><input type="checkbox" ${mov.plano_bradesco_dental ? 'checked' : ''} disabled class="plano-checkbox" data-field="plano_bradesco_dental" data-plano="bradesco_dental">Bradesco Dental</label>
                </div>
            </div>
            <div class="cartoes-group">
                <div class="info-row" style="display: ${mov.plano_unimed ? 'block' : 'none'}" id="cartao_unimed">
                    <label>Cartão Unimed:</label>
                    <input type="text" value="${mov.cartao_unimed || ''}" disabled class="edit-input" data-field="cartao_unimed">
                </div>
                <div class="info-row" style="display: ${mov.plano_uniodonto ? 'block' : 'none'}" id="cartao_uniodonto">
                    <label>Cartão Uniodonto:</label>
                    <input type="text" value="${mov.cartao_uniodonto || ''}" disabled class="edit-input" data-field="cartao_uniodonto">
                </div>
                <div class="info-row" style="display: ${mov.plano_bradesco_saude ? 'block' : 'none'}" id="cartao_bradesco_saude">
                    <label>Cartão Bradesco Saúde:</label>
                    <input type="text" value="${mov.cartao_bradesco_saude || ''}" disabled class="edit-input" data-field="cartao_bradesco_saude">
                </div>
                <div class="info-row" style="display: ${mov.plano_bradesco_dental ? 'block' : 'none'}" id="cartao_bradesco_dental">
                    <label>Cartão Bradesco Dental:</label>
                    <input type="text" value="${mov.cartao_bradesco_dental || ''}" disabled class="edit-input" data-field="cartao_bradesco_dental">
                </div>
            </div>
        `;

        // Dependentes
        const dependentesInfo = document.getElementById('dependentesInfo');
        if (mov.dependentes && mov.dependentes.length > 0) {
            dependentesInfo.innerHTML = mov.dependentes.map((dep, index) => `
                <div class="dependente-card" data-index="${index}">
                    <div class="info-row">
                        <label>Nome:</label>
                        <input type="text" value="${dep.nome}" disabled class="edit-input" data-field="nome">
                    </div>
                    <div class="info-row">
                        <label>Planos:</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" ${dep.plano_unimed ? 'checked' : ''} disabled data-field="plano_unimed">Unimed</label>
                            <label><input type="checkbox" ${dep.plano_uniodonto ? 'checked' : ''} disabled data-field="plano_uniodonto">Uniodonto</label>
                            <label><input type="checkbox" ${dep.plano_bradesco_saude ? 'checked' : ''} disabled data-field="plano_bradesco_saude">Bradesco Saúde</label>
                            <label><input type="checkbox" ${dep.plano_bradesco_dental ? 'checked' : ''} disabled data-field="plano_bradesco_dental">Bradesco Dental</label>
                        </div>
                    </div>
                    <div class="cartoes-group">
                        ${dep.cartao_unimed ? `<div class="info-row"><label>Cartão Unimed:</label><input type="text" value="${dep.cartao_unimed}" disabled class="edit-input" data-field="cartao_unimed"></div>` : ''}
                        ${dep.cartao_uniodonto ? `<div class="info-row"><label>Cartão Uniodonto:</label><input type="text" value="${dep.cartao_uniodonto}" disabled class="edit-input" data-field="cartao_uniodonto"></div>` : ''}
                        ${dep.cartao_bradesco_saude ? `<div class="info-row"><label>Cartão Bradesco Saúde:</label><input type="text" value="${dep.cartao_bradesco_saude}" disabled class="edit-input" data-field="cartao_bradesco_saude"></div>` : ''}
                        ${dep.cartao_bradesco_dental ? `<div class="info-row"><label>Cartão Bradesco Dental:</label><input type="text" value="${dep.cartao_bradesco_dental}" disabled class="edit-input" data-field="cartao_bradesco_dental"></div>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            dependentesInfo.innerHTML = '<p class="no-data">Nenhum dependente cadastrado</p>';
        }

        // Adicionar event listeners para os checkboxes
        document.querySelectorAll('.plano-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const plano = this.dataset.plano;
                const cartaoDiv = document.getElementById(`cartao_${plano}`);
                if (cartaoDiv) {
                    cartaoDiv.style.display = this.checked ? 'block' : 'none';
                    if (!this.checked) {
                        cartaoDiv.querySelector('input').value = '';
                    }
                }
            });
        });
    }
    
    editBtn.addEventListener('click', () => {
        const isEditing = editBtn.textContent === 'Salvar';
        const editInputs = document.querySelectorAll('.edit-input');
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        
        if (isEditing) {
            salvarAlteracoes();
            editBtn.textContent = 'Editar';
            editInputs.forEach(input => input.disabled = true);
            checkboxes.forEach(cb => cb.disabled = true);
        } else {
            editBtn.textContent = 'Salvar';
            editInputs.forEach(input => input.disabled = false);
            checkboxes.forEach(cb => cb.disabled = false);
        }
    });

    function formatarTipo(tipo) {
        return {
            'inclusao': 'Inclusão',
            'exclusao': 'Exclusão',
            'alteracao': 'Alteração'
        }[tipo] || tipo;
    }

    function formatarPlanos(data) {
        const planos = [];
        if (data.plano_unimed) planos.push('Unimed');
        if (data.plano_uniodonto) planos.push('Uniodonto');
        if (data.plano_bradesco_saude) planos.push('Bradesco Saúde');
        if (data.plano_bradesco_dental) planos.push('Bradesco Dental');
        return planos.join(', ') || '-';
    }

    function formatarCartoes(data) {
        const cartoes = [];
        if (data.cartao_unimed) cartoes.push(`Unimed: ${data.cartao_unimed}`);
        if (data.cartao_uniodonto) cartoes.push(`Uniodonto: ${data.cartao_uniodonto}`);
        if (data.cartao_bradesco_saude) cartoes.push(`Bradesco Saúde: ${data.cartao_bradesco_saude}`);
        if (data.cartao_bradesco_dental) cartoes.push(`Bradesco Dental: ${data.cartao_bradesco_dental}`);
        return cartoes.join(', ') || '-';
    }

    async function salvarAlteracoes() {
        try {
            const data = {
                status: statusSelect.value,
                incluido_rateio: document.getElementById('checkRateio').checked,
                incluido_fp760: document.getElementById('checkFP760').checked,
                incluido_ir: document.getElementById('checkIR').checked,
                cartao_uniodonto_gerado: document.getElementById('checkUniodonto').checked,
                matricula_titular: document.querySelector('[data-field="matricula_titular"]').value,
                nome_titular: document.querySelector('[data-field="nome_titular"]').value,
                plano_unimed: document.querySelector('[data-field="plano_unimed"]').checked,
                plano_uniodonto: document.querySelector('[data-field="plano_uniodonto"]').checked,
                plano_bradesco_saude: document.querySelector('[data-field="plano_bradesco_saude"]').checked,
                plano_bradesco_dental: document.querySelector('[data-field="plano_bradesco_dental"]').checked,
                cartao_unimed: document.querySelector('[data-field="cartao_unimed"]')?.value,
                cartao_uniodonto: document.querySelector('[data-field="cartao_uniodonto"]')?.value,
                cartao_bradesco_saude: document.querySelector('[data-field="cartao_bradesco_saude"]')?.value,
                cartao_bradesco_dental: document.querySelector('[data-field="cartao_bradesco_dental"]')?.value
            };
            
            console.log('Dados enviados: ',data);
            const response = await fetch(`/api/movimentacoes/${movimentacaoId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            
            console.log('Resposta do servidor: ', response);

            if (!response.ok) throw new Error('Erro ao atualizar movimentação');
            alert('Movimentação atualizada com sucesso!');
            carregarMovimentacao();
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    }

    carregarMovimentacao();
});