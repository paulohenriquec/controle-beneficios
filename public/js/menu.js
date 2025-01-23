// public/js/menu.js
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    const token = localStorage.getItem('userToken');
    const userName = localStorage.getItem('userName');
    const userFullName = localStorage.getItem('userFullName');
    const userProfile = localStorage.getItem('userProfile');
    
    if (!token || !userName) {
        window.location.href = '/';
        return;
    }

    // Atualizar informações do usuário no menu
    document.getElementById('userFullName').textContent = userFullName || userName;
    document.getElementById('userProfile').textContent = formatarPerfil(userProfile);

    // Configurar menu baseado no perfil
    const menuNav = document.getElementById('menuNav');
    const currentPage = window.location.pathname;
    
    // Lista de links com permissões
    const menuItems = [
        {
            href: '/form.html',
            text: 'Nova Movimentação',
            icon: '📝',
            profiles: ['master', 'editor']
        },
        {
            href: '/movimentacoes.html',
            text: 'Movimentações',
            icon: '📋',
            profiles: ['master', 'editor', 'leitor']
        },
        {
            href: '/usuarios.html',
            text: 'Gerenciar Usuários',
            icon: '👥',
            profiles: ['master']
        },
        {
            href: '/logs.html',
            text: 'Logs do Sistema',
            icon: '📊',
            profiles: ['master']
        }
    ];

    // Criar links do menu
    menuItems.forEach(item => {
        if (item.profiles.includes(userProfile)) {
            const link = document.createElement('a');
            link.href = item.href;
            link.innerHTML = `${item.icon} ${item.text}`;
            
            if (currentPage === item.href) {
                link.classList.add('active');
            }
            
            menuNav.appendChild(link);
        }
    });

    // Configurar logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Limpar todo o localStorage
            localStorage.clear();
            // Redirecionar para a página de login
            window.location.href = '/';
        });
    }

    // Função para formatar o texto do perfil
    function formatarPerfil(perfil) {
        const perfis = {
            'master': 'Administrador',
            'editor': 'Editor',
            'leitor': 'Leitor'
        };
        return perfis[perfil] || perfil;
    }
});