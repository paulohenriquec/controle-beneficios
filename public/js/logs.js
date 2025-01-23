document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se é usuário master
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile !== 'master') {
        window.location.href = '/';
        return;
    }

    const token = localStorage.getItem('userToken');
    const table = document.getElementById('logsTable').getElementsByTagName('tbody')[0];

    // Elementos de filtro
    const userFilter = document.getElementById('userFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const actionFilter = document.getElementById('actionFilter');
    const filterBtn = document.getElementById('filterBtn');

    // Configurar data inicial para 7 dias atrás
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    startDate.value = defaultStartDate.toISOString().split('T')[0];
    endDate.value = new Date().toISOString().split('T')[0];

    // Carregar usuários para o filtro
    async function loadUsers() {
        try {
            const response = await fetch('/api/usuarios', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const users = await response.json();

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = `${user.nome_completo} (${user.username})`;
                userFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    // Carregar logs
    async function loadLogs() {
        try {
            const params = new URLSearchParams({
                startDate: startDate.value,
                endDate: endDate.value,
                usuario: userFilter.value,
                acao: actionFilter.value
            });

            const response = await fetch(`/api/logs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const logs = await response.json();

            table.innerHTML = '';
            
            logs.forEach(log => {
                const row = table.insertRow();
                
                // Data/Hora
                const dataHora = new Date(log.data_hora).toLocaleString('pt-BR');
                row.insertCell().textContent = dataHora;
                
                // Usuário
                row.insertCell().textContent = log.usuario_nome || log.usuario;
                
                // Ação
                const acaoCell = row.insertCell();
                const acaoBadge = document.createElement('div');
                acaoBadge.className = `action-badge ${log.acao}`;
                acaoBadge.textContent = formatarAcao(log.acao);
                acaoCell.appendChild(acaoBadge);
                
                // Tabela
                row.insertCell().textContent = formatarTabela(log.tabela);
                
                // Detalhes
                const detalhesCell = row.insertCell();
                detalhesCell.textContent = log.detalhes;
                if (log.registro_id) {
                    detalhesCell.textContent += ` (ID: ${log.registro_id})`;
                }
            });
        } catch (error) {
            alert('Erro ao carregar logs: ' + error.message);
        }
    }

    // Formatar ação para exibição
    function formatarAcao(acao) {
        const acoes = {
            'login': 'Login',
            'criar': 'Criar',
            'atualizar': 'Atualizar',
            'excluir': 'Excluir'
        };
        return acoes[acao] || acao;
    }

    // Formatar nome da tabela para exibição
    function formatarTabela(tabela) {
        const tabelas = {
            'usuarios': 'Usuários',
            'movimentacoes': 'Movimentações'
        };
        return tabelas[tabela] || tabela;
    }

    // Evento do botão de filtro
    filterBtn.addEventListener('click', loadLogs);

    // Carregar dados iniciais
    await loadUsers();
    await loadLogs();
});