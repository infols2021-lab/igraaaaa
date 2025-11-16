// admin-materials.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Элементы интерфейса
    const materialsList = document.getElementById('materialsList');
    const addMaterialBtn = document.getElementById('addMaterialBtn');
    const materialModal = document.getElementById('materialModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const materialForm = document.getElementById('materialForm');
    const modalTitle = document.getElementById('modalTitle');
    const backToSite = document.getElementById('backToSite');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Табы
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentEditingId = null;
    let materials = [];

    // Инициализация
    checkAdminAuth();
    loadMaterials();
    setupEventListeners();

    async function checkAdminAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        // Проверяем роль пользователя
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            window.location.href = 'materials.html';
        }
    }

    function setupEventListeners() {
        // Табы
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });

        // Модальное окно
        addMaterialBtn.addEventListener('click', () => openMaterialModal());
        closeModal.addEventListener('click', () => closeMaterialModal());
        cancelBtn.addEventListener('click', () => closeMaterialModal());
        materialForm.addEventListener('submit', handleMaterialSubmit);

        // Кнопки навигации
        backToSite.addEventListener('click', () => {
            window.location.href = 'materials.html';
        });

        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });

        // Закрытие модального окна по клику вне его
        materialModal.addEventListener('click', (e) => {
            if (e.target === materialModal) {
                closeMaterialModal();
            }
        });
    }

    function switchTab(tabId) {
        // Обновляем активные кнопки табов
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        // Обновляем активные содержимое табов
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
    }

    async function loadMaterials() {
        try {
            const { data, error } = await supabase
                .from('materials')
                .select(`
                    *,
                    assignments (
                        id
                    )
                `)
                .order('display_order', { ascending: true });

            if (error) throw error;

            materials = data || [];
            renderMaterialsList();

        } catch (error) {
            console.error('Ошибка загрузки материалов:', error);
            showError('Не удалось загрузить материалы');
        }
    }

    function renderMaterialsList() {
        if (!materials || materials.length === 0) {
            materialsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>Нет материалов</h3>
                    <p>Создайте первый материал чтобы начать работу</p>
                </div>
            `;
            return;
        }

        materialsList.innerHTML = materials.map(material => `
            <div class="admin-material-card" data-id="${material.id}">
                <div class="material-preview">
                    ${material.image_url 
                        ? `<img src="${material.image_url}" alt="${material.title}" onerror="this.style.display='none'; this.parentElement.innerHTML='${getMaterialIcon(material.title)}'">`
                        : getMaterialIcon(material.title)
                    }
                </div>
                <div class="material-info">
                    <h3>${material.title}</h3>
                    <div class="material-meta">
                        <span><i class="fas fa-tasks"></i> ${material.assignments?.length || 0} заданий</span>
                        <span><i class="fas fa-sort"></i> Порядок: ${material.display_order || 0}</span>
                    </div>
                </div>
                <div class="material-actions">
                    <button class="btn-icon btn-edit" onclick="editMaterial(${material.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteMaterial(${material.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
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

    function openMaterialModal(material = null) {
        currentEditingId = material ? material.id : null;
        
        if (material) {
            // Редактирование
            modalTitle.textContent = 'Редактировать материал';
            document.getElementById('materialId').value = material.id;
            document.getElementById('materialTitle').value = material.title;
            document.getElementById('materialImage').value = material.image_url || '';
            document.getElementById('displayOrder').value = material.display_order || 0;
        } else {
            // Создание нового
            modalTitle.textContent = 'Добавить материал';
            materialForm.reset();
            document.getElementById('displayOrder').value = materials.length;
        }

        materialModal.classList.remove('hidden');
    }

    function closeMaterialModal() {
        materialModal.classList.add('hidden');
        currentEditingId = null;
        materialForm.reset();
    }

    async function handleMaterialSubmit(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveMaterialBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
            saveBtn.disabled = true;

            const formData = {
                title: document.getElementById('materialTitle').value.trim(),
                image_url: document.getElementById('materialImage').value.trim() || null,
                display_order: parseInt(document.getElementById('displayOrder').value) || 0
            };

            if (!formData.title) {
                throw new Error('Название материала обязательно');
            }

            let result;
            if (currentEditingId) {
                // Обновление
                result = await supabase
                    .from('materials')
                    .update(formData)
                    .eq('id', currentEditingId);
            } else {
                // Создание
                result = await supabase
                    .from('materials')
                    .insert([formData])
                    .select();
            }

            if (result.error) throw result.error;

            showNotification(
                currentEditingId ? 'Материал обновлен!' : 'Материал создан!',
                'success'
            );

            closeMaterialModal();
            await loadMaterials();

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showNotification(
                error.message || 'Ошибка при сохранении материала',
                'error'
            );
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // Глобальные функции для кнопок редактирования/удаления
    window.editMaterial = function(materialId) {
        const material = materials.find(m => m.id === materialId);
        if (material) {
            openMaterialModal(material);
        }
    };

    window.deleteMaterial = async function(materialId) {
        if (!confirm('Удалить этот материал? Все связанные задания также будут удалены.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', materialId);

            if (error) throw error;

            showNotification('Материал удален!', 'success');
            await loadMaterials();

        } catch (error) {
            console.error('Ошибка удаления:', error);
            showNotification('Ошибка при удалении материала', 'error');
        }
    };

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    function showError(message) {
        materialsList.innerHTML = `
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
});