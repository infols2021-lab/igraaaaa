// materials.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    const materialsContainer = document.getElementById('materialsContainer');
    const logoutBtn = document.getElementById('logoutBtn');

    // Проверяем авторизацию
    checkAuth();
    
    // Загружаем материалы
    loadMaterials();

    // Обработчик выхода
    logoutBtn.addEventListener('click', async function() {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            // Если пользователь не авторизован, перенаправляем на страницу входа
            window.location.href = 'index.html';
            return;
        }
    }

    async function loadMaterials() {
        try {
            // Получаем материалы из Supabase
            const { data: materials, error } = await supabase
                .from('materials')
                .select(`
                    *,
                    assignments (
                        id,
                        title
                    )
                `)
                .order('display_order', { ascending: true });

            if (error) {
                throw error;
            }

            // Очищаем контейнер
            materialsContainer.innerHTML = '';

            if (!materials || materials.length === 0) {
                showNoMaterials();
                return;
            }

            // Создаем карточки материалов
            materials.forEach((material, index) => {
                const materialCard = createMaterialCard(material, index);
                materialsContainer.appendChild(materialCard);
            });

        } catch (error) {
            console.error('Ошибка загрузки материалов:', error);
            showError('Не удалось загрузить материалы');
        }
    }

    function createMaterialCard(material, index) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Определяем иконку по умолчанию на основе названия
    const defaultIcon = getMaterialIcon(material.title);
    
    card.innerHTML = `
        <div class="material-image">
            ${material.image_url 
                ? `<img src="${material.image_url}" alt="${material.title}" onerror="this.style.display='none'; this.parentElement.innerHTML='${defaultIcon}'">`
                : defaultIcon
            }
        </div>
        <div class="material-content">
            <h3 class="material-title">${material.title}</h3>
            <div class="material-assignments">
                <i class="fas fa-tasks"></i>
                <span>${material.assignments?.length || 0} заданий</span>
            </div>
        </div>
    `;

    // Добавляем обработчик клика - переход к заданиям материала
    card.addEventListener('click', function() {
        window.location.href = `assignments.html?material_id=${material.id}`;
    });

    return card;
}

    function getMaterialIcon(title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('математи') || lowerTitle.includes('счет')) return '🔢';
        if (lowerTitle.includes('букв') || lowerTitle.includes('алфавит') || lowerTitle.includes('слов')) return '📚';
        if (lowerTitle.includes('загад') || lowerTitle.includes('головолом')) return '🎯';
        if (lowerTitle.includes('рисован') || lowerTitle.includes('творчеств')) return '🎨';
        if (lowerTitle.includes('природ') || lowerTitle.includes('животн')) return '🐾';
        return '📖';
    }

    function showNoMaterials() {
        materialsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-inbox"></i>
                <h3>Пока нет материалов</h3>
                <p>Скоро здесь появятся интересные задания!</p>
            </div>
        `;
    }

    function showError(message) {
        materialsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Попробовать снова
                </button>
            </div>
        `;
    }

    function showComingSoon(materialTitle) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;
        
        notification.innerHTML = `
            <strong>${materialTitle}</strong>
            <p>Задания для этой темы скоро появятся! 🚀</p>
        `;

        document.body.appendChild(notification);

        // Автоматически скрываем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        // Добавляем CSS анимации для уведомления
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
});