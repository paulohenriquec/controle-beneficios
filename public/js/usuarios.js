// public/js/usuarios.js
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se é usuário master
    if (localStorage.getItem('userProfile') !== 'master') {
        window.location.href = '/';
        return;
    }

    const token = localStorage.getItem('userToken');
    const table = document.getElementById('usuariosTable').getElementsByTagName('tbody')[0];
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');

    async function loadUsers() {
        try {
            const response = await fetch('/api/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await response.json();

            table.innerHTML = '';
            
            users.forEach(user => {
                const row = table.insertRow();
                
                // Informações básicas
                row.insertCell().textContent = user.nome_completo;
                row.insertCell().textContent = user.username;
                row.insertCell().textContent = user.perfil.charAt(0).toUpperCase() + user.perfil.slice(1);
                
                // Status
                const statusCell = row.insertCell();
                const statusBadge = document.createElement('div');
                statusBadge.className = `status-badge ${user.ativo ? 'active' : 'inactive'}`;
                statusBadge.textContent = user.ativo ? 'Ativo' : 'Inativo';
                statusCell.appendChild(statusBadge);

                // Último acesso
                row.insertCell().textContent = user.last_login ? 
                    new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca';

                // Ações
                const actionsCell = row.insertCell();
                if (user.perfil !== 'master') {
                    // Botão ativar/desativar
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'btn btn-small';
                    toggleBtn.textContent = user.ativo ? 'Desativar' : 'Ativar';
                    toggleBtn.onclick = () => toggleUserStatus(user.id, !user.ativo);

                    // Botão resetar senha
                    const resetBtn = document.createElement('button');
                    resetBtn.className = 'btn btn-small btn-secondary';
                    resetBtn.textContent = 'Resetar Senha';
                    resetBtn.onclick = () => resetPassword(user.id);

                    actionsCell.append(toggleBtn, resetBtn);
                }
            });
        } catch (error) {
            alert('Erro ao carregar usuários: ' + error.message);
        }
    }

    // Criar usuário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome_completo: formData.get('nome_completo'),
                    username: formData.get('username'),
                    password: formData.get('password'),
                    perfil: formData.get('perfil')
                })
            });

            if (!response.ok) throw new Error('Erro ao criar usuário');

            closeModal();
            loadUsers();
            alert('Usuário criado com sucesso!');
        } catch (error) {
            alert(error.message);
        }
    });

    // Atualizar status
    async function toggleUserStatus(userId, status) {
        try {
            const response = await fetch(`/api/usuarios/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ativo: status })
            });

            if (!response.ok) throw new Error('Erro ao atualizar status');

            loadUsers();
            alert('Status atualizado com sucesso!');
        } catch (error) {
            alert(error.message);
        }
    }

    // Resetar senha
    async function resetPassword(userId) {
        const newPassword = prompt('Digite a nova senha:');
        if (!newPassword) return;

        try {
            const response = await fetch(`/api/usuarios/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: newPassword })
            });

            if (!response.ok) throw new Error('Erro ao resetar senha');

            alert('Senha alterada com sucesso!');
        } catch (error) {
            alert(error.message);
        }
    }

    // Controles do modal
    document.getElementById('newUserBtn').onclick = () => {
        form.reset();
        document.getElementById('modalTitle').textContent = 'Novo Usuário';
        modal.style.display = 'block';
    };

    window.closeModal = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === modal) closeModal();
    };

    // Carregar dados iniciais
    loadUsers();
});