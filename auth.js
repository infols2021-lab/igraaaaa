// auth.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Элементы табов
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Элементы формы входа
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');

    // Элементы формы регистрации
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const registerBtn = document.getElementById('registerBtn');

    // Элементы формы админа
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminForm = document.getElementById('adminForm');
    const adminEmail = document.getElementById('adminEmail');
    const adminPassword = document.getElementById('adminPassword');
    const adminLogin = document.getElementById('adminLogin');

    // Инициализация
    checkAuth();
    setupEventListeners();

    function setupEventListeners() {
        // Переключение табов
        authTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Обновляем активные табы
                authTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Показываем соответствующую форму
                loginForm.classList.toggle('active', targetTab === 'login');
                registerForm.classList.toggle('active', targetTab === 'register');
                
                // Очищаем сообщения при переключении
                removeOldMessages();
            });
        });

        // Вход пользователя
        loginBtn.addEventListener('click', handleLogin);
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleLogin();
        });

        // Регистрация пользователя
        registerBtn.addEventListener('click', handleRegister);
        confirmPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleRegister();
        });

        // Форма админа
        adminLoginBtn.addEventListener('click', function() {
            adminForm.classList.toggle('hidden');
            removeOldMessages();
        });
        adminLogin.addEventListener('click', handleAdminLogin);
        adminPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleAdminLogin();
        });
    }

    async function handleLogin() {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        if (!validateEmail(email)) {
            showError('Введите корректный email');
            return;
        }

        if (!password) {
            showError('Введите пароль');
            return;
        }

        setButtonLoading(loginBtn, true, '<i class="fas fa-spinner fa-spin"></i> Вход...');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                if (error.message === 'Invalid login credentials') {
                    throw new Error('Неверный email или пароль');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Подтвердите ваш email перед входом');
                }
                throw error;
            }

            showSuccess('Вход выполнен! Перенаправляем...');
            
            // Добавляем небольшую задержку для лучшего UX
            setTimeout(() => {
                window.location.href = 'materials.html';
            }, 1500);

        } catch (error) {
            showError(error.message);
        } finally {
            setButtonLoading(loginBtn, false, '<i class="fas fa-sign-in-alt"></i> Войти');
        }
    }

    async function handleRegister() {
        const email = registerEmail.value.trim();
        const password = registerPassword.value.trim();
        const confirm = confirmPassword.value.trim();

        if (!validateEmail(email)) {
            showError('Введите корректный email');
            return;
        }

        if (!password || !confirm) {
            showError('Заполните все поля');
            return;
        }

        if (password !== confirm) {
            showError('Пароли не совпадают');
            return;
        }

        if (password.length < 6) {
            showError('Пароль должен быть не менее 6 символов');
            return;
        }

        setButtonLoading(registerBtn, true, '<i class="fas fa-spinner fa-spin"></i> Регистрация...');

        try {
            // Регистрируем пользователя
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        email: email
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    throw new Error('Пользователь с таким email уже зарегистрирован');
                } else if (error.message.includes('signup')) {
                    throw new Error('Ошибка регистрации. Попробуйте другой email');
                }
                throw error;
            }

            if (data.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error('Пользователь с таким email уже существует');
            }

            showSuccess('Регистрация успешна! Выполняется вход...');
            
            // Автоматически входим после регистрации
            setTimeout(async () => {
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (!loginError) {
                    window.location.href = 'materials.html';
                } else {
                    showError('Ошибка автоматического входа. Попробуйте войти вручную.');
                }
            }, 2000);

        } catch (error) {
            showError(error.message);
        } finally {
            setButtonLoading(registerBtn, false, '<i class="fas fa-user-plus"></i> Зарегистрироваться');
        }
    }

    async function handleAdminLogin() {
        const email = adminEmail.value.trim();
        const password = adminPassword.value.trim();

        if (!validateEmail(email)) {
            showError('Введите корректный email');
            return;
        }

        if (!password) {
            showError('Введите пароль');
            return;
        }

        setButtonLoading(adminLogin, true, 'Вход...');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                showError('Неверный email или пароль');
                return;
            }

            // Проверяем, является ли пользователь админом
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile || profile.role !== 'admin') {
                await supabase.auth.signOut();
                showError('У вас нет прав администратора');
                return;
            }

            showSuccess('Вход как учитель выполнен!');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);

        } catch (error) {
            showError('Ошибка при входе');
        } finally {
            setButtonLoading(adminLogin, false, 'Войти');
        }
    }

    async function checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Если пользователь уже авторизован, проверяем его роль
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile && profile.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'materials.html';
                }
            }
        } catch (error) {
            console.error('Ошибка проверки авторизации:', error);
        }
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function setButtonLoading(button, isLoading, text) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            button.innerHTML = text;
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            button.innerHTML = text;
        }
    }

    function showError(message) {
        removeOldMessages();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
        
        const loginCard = document.querySelector('.login-card');
        loginCard.insertBefore(errorDiv, loginCard.querySelector('.auth-tabs'));

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    function showSuccess(message) {
        removeOldMessages();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        const loginCard = document.querySelector('.login-card');
        loginCard.insertBefore(successDiv, loginCard.querySelector('.auth-tabs'));

        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }

    function removeOldMessages() {
        const oldError = document.querySelector('.error-message');
        const oldSuccess = document.querySelector('.success-message');
        
        if (oldError) oldError.remove();
        if (oldSuccess) oldSuccess.remove();
    }

    // Очистка полей при переключении табов
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            loginEmail.value = '';
            loginPassword.value = '';
            registerEmail.value = '';
            registerPassword.value = '';
            confirmPassword.value = '';
        });
    });
});