// public/js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // Verificar se já está logado
    const token = localStorage.getItem('userToken');
    if (token) {
        const userProfile = localStorage.getItem('userProfile');
        redirecionarPorPerfil(userProfile);
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(loginForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Credenciais inválidas');
            }

            const result = await response.json();
            
            // Salvar dados do usuário
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userName', result.username);
            localStorage.setItem('userFullName', result.nome_completo);
            localStorage.setItem('userProfile', result.perfil);

            // Redirecionar baseado no perfil
            redirecionarPorPerfil(result.perfil);

        } catch (error) {
            alert(error.message);
        }
    });

    function redirecionarPorPerfil(perfil) {
        if (perfil === 'leitor') {
            window.location.href = '/movimentacoes.html';
        } else {
            window.location.href = '/form.html';
        }
    }
});