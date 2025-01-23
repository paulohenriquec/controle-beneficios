// public/js/movimentacoes.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('userToken');
    const userProfile = localStorage.getItem('userProfile');
    
    if (!token) {
        window.location.href = '/';
        return;
    }

    const table = document.getElementById('movimentacoesTable').getElementsByTagName('tbody')[0];
    const searchInput = document.getElementById('searchInput');
    const filterTipo = document.getElementById('filterTipo');
    const filterPlano = document.getElementById('filterPlano');
    
    const canEdit = ['master', 'editor'].includes(userProfile);
    const canDelete = userProfile === 'master';

    let allMovimentacoes = []; // Armazenar todas as movimentações

    // Carregar dados
    async function loadMovimentacoes() {
        try {
            const response = await fetch('/api/movimentacoes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Erro ao carregar movimentações');
            
            allMovimentacoes = await response.json();
            filterAndDisplayMovimentacoes();
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar movimentações: ' + error.message);
        }
    }

    // Filtrar e exibir movimentações
    function filterAndDisplayMovimentacoes() {
        const searchTerm = searchInput.value.toLowerCase();
        const tipoSelecionado = filterTipo.value.toLowerCase();
        const planoSelecionado = filterPlano.value.toLowerCase();

        const movimentacoesFiltradas = allMovimentacoes.filter(mov => {
            // Filtro de busca
            const searchMatch = !searchTerm || 
                mov.matricula_titular?.toString().toLowerCase().includes(searchTerm) ||
                mov.nome_titular?.toLowerCase().includes(searchTerm) ||
                mov.nome_dependente?.toLowerCase().includes(searchTerm) ||
                mov.observacoes?.toLowerCase().includes(searchTerm);

            // Filtro de tipo
            const tipoMatch = !tipoSelecionado || mov.tipo.toLowerCase() === tipoSelecionado;

            // Filtro de plano
            let planoMatch = !planoSelecionado;
            if (planoSelecionado) {
                switch (planoSelecionado) {
                    case 'unimed':
                        planoMatch = mov.plano_unimed;
                        break;
                    case 'uniodonto':
                        planoMatch = mov.plano_uniodonto;
                        break;
                    case 'bradesco_saude':
                        planoMatch = mov.plano_bradesco_saude;
                        break;
                    case 'bradesco_dental':
                        planoMatch = mov.plano_bradesco_dental;
                        break;
                }
            }

            return searchMatch && tipoMatch && planoMatch;
        });

        displayMovimentacoes(movimentacoesFiltradas);
    }

    // Exibir movimentações na tabela
    function displayMovimentacoes(movimentacoes) {
        table.innerHTML = '';
        
        movimentacoes.forEach(mov => {
            const row = table.insertRow();
            
            // Data
            row.insertCell().textContent = new Date(mov.data_envio).toLocaleDateString('pt-BR');
            
            // Tipo
            row.insertCell().textContent = formatarTipo(mov.tipo);
            
            // Matrícula e nomes
            row.insertCell().textContent = mov.matricula_titular;
            row.insertCell().textContent = mov.nome_titular;
            row.insertCell().textContent = mov.nome_dependente || '-';

            // Planos
            const planos = [];
            if (mov.plano_unimed) planos.push('Unimed');
            if (mov.plano_uniodonto) planos.push('Uniodonto');
            if (mov.plano_bradesco_saude) planos.push('Bradesco Saúde');
            if (mov.plano_bradesco_dental) planos.push('Bradesco Dental');
            row.insertCell().textContent = planos.join(', ') || '-';

            // Cartões
            const cartoes = [];
            if (mov.cartao_unimed) cartoes.push(`Unimed: ${mov.cartao_unimed}`);
            if (mov.cartao_uniodonto) cartoes.push(`Uniodonto: ${mov.cartao_uniodonto}`);
            if (mov.cartao_bradesco_saude) cartoes.push(`Bradesco Saúde: ${mov.cartao_bradesco_saude}`);
            if (mov.cartao_bradesco_dental) cartoes.push(`Bradesco Dental: ${mov.cartao_bradesco_dental}`);
            row.insertCell().textContent = cartoes.join(', ') || '-';

            // Responsável e Observações
            row.insertCell().textContent = mov.usuario_responsavel;
            row.insertCell().textContent = mov.observacoes || '-';

            // Status
            const statusCell = row.insertCell();
            const statusGroup = document.createElement('div');
            statusGroup.className = 'status-group';

            const statusChecks = [
                { label: 'Rateio', field: 'incluido_rateio' },
                { label: 'FP760', field: 'incluido_fp760' },
                { label: 'IR', field: 'incluido_ir' },
                { label: 'Cartão Uniodonto', field: 'cartao_uniodonto_gerado' }
            ];

            statusChecks.forEach((status, idx) => {
                const statusCheck = document.createElement('div');
                statusCheck.className = 'status-check';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `${status.field}_${mov.id}`;
                checkbox.checked = mov[status.field];
                checkbox.disabled = !canEdit || (!mov.plano_uniodonto && status.field === 'cartao_uniodonto_gerado');
                
                if (canEdit) {
                    checkbox.addEventListener('change', () => updateStatus(mov.id, status.field, checkbox));
                }

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = status.label;

                statusCheck.append(checkbox, label);
                statusGroup.appendChild(statusCheck);
            });

            statusCell.appendChild(statusGroup);

            // Ações
            const acoesCell = row.insertCell();
            if (canDelete) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.className = 'btn-excluir';
                deleteButton.onclick = () => deleteMovimentacao(mov.id);
                acoesCell.appendChild(deleteButton);
            }
        });
    }

    // Atualizar status
    async function updateStatus(id, field, checkbox) {
        try {
            const response = await fetch(`/api/movimentacoes/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: checkbox.checked })
            });

            if (!response.ok) throw new Error('Erro ao atualizar status');
            
            // Atualizar a movimentação na lista em memória
            const movIndex = allMovimentacoes.findIndex(m => m.id === id);
            if (movIndex >= 0) {
                allMovimentacoes[movIndex][field] = checkbox.checked;
            }
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
            checkbox.checked = !checkbox.checked;
        }
    }

    // Excluir movimentação
    async function deleteMovimentacao(id) {
        if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return;

        try {
            const response = await fetch(`/api/movimentacoes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao excluir movimentação');
            
            await loadMovimentacoes();
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    }

    function formatarTipo(tipo) {
        return {
            'inclusao': 'Inclusão',
            'exclusao': 'Exclusão',
            'alteracao': 'Alteração'
        }[tipo] || tipo;
    }

    // Event listeners para filtros
    searchInput.addEventListener('input', filterAndDisplayMovimentacoes);
    filterTipo.addEventListener('change', filterAndDisplayMovimentacoes);
    filterPlano.addEventListener('change', filterAndDisplayMovimentacoes);

    // Carregar dados iniciais
    loadMovimentacoes();
});