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
    
    // Элементы загрузки изображений
    const uploadArea = document.getElementById('uploadArea');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const removeImage = document.getElementById('removeImage');
    const currentImageUrl = document.getElementById('currentImageUrl');
    
    // Табы
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentEditingId = null;
    let materials = [];
    let selectedFile = null;
    let uploadInProgress = false;

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

        // Загрузка изображений
        setupImageUpload();

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

    function setupImageUpload() {
        // Клик по области загрузки
        uploadArea.addEventListener('click', () => {
            imageUpload.click();
        });

        // Выбор файла через input
        imageUpload.addEventListener('change', handleFileSelect);

        // Drag and drop события
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        // Удаление изображения
        removeImage.addEventListener('click', (e) => {
            e.preventDefault();
            resetImageSelection();
        });
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    }

    function handleFile(file) {
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showNotification('Пожалуйста, выберите файл изображения', 'error');
            return;
        }

        // Проверка размера файла (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Размер файла не должен превышать 2MB', 'error');
            return;
        }

        selectedFile = file;
        showImagePreview(file);
    }

    function showImagePreview(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            imagePreview.classList.remove('hidden');
            uploadArea.classList.add('hidden');
        };
        
        reader.readAsDataURL(file);
    }

    function resetImageSelection() {
        selectedFile = null;
        currentImageUrl.value = '';
        imageUpload.value = '';
        imagePreview.classList.add('hidden');
        uploadArea.classList.remove('hidden');
    }

    async function uploadImageToStorage(materialId = null) {
        if (!selectedFile) {
            return currentImageUrl.value || null;
        }

        uploadInProgress = true;
        setSaveButtonLoading(true);

        try {
            // Генерируем уникальное имя файла
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = materialId ? `${materialId}/${fileName}` : `temp/${fileName}`;

            // Загружаем файл в Supabase Storage
            const { data, error } = await supabase.storage
                .from('materials')
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Ошибка загрузки:', error);
                throw new Error('Не удалось загрузить изображение');
            }

            // Получаем публичный URL
            const { data: { publicUrl } } = supabase.storage
                .from('materials')
                .getPublicUrl(filePath);

            uploadInProgress = false;
            setSaveButtonLoading(false);
            
            return publicUrl;

        } catch (error) {
            uploadInProgress = false;
            setSaveButtonLoading(false);
            throw error;
        }
    }

    async function deleteImageFromStorage(imageUrl) {
        if (!imageUrl) return;

        try {
            // Извлекаем путь к файлу из URL
            const urlParts = imageUrl.split('/');
            const filePath = urlParts.slice(urlParts.indexOf('materials') + 1).join('/');

            const { error } = await supabase.storage
                .from('materials')
                .remove([filePath]);

            if (error) {
                console.error('Ошибка удаления изображения:', error);
            }
        } catch (error) {
            console.error('Ошибка удаления изображения:', error);
        }
    }

    function setSaveButtonLoading(isLoading, text = 'Сохранение...') {
        const saveBtn = document.getElementById('saveMaterialBtn');
        if (isLoading) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> Сохранить материал`;
        }
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
                        ? `<img src="${material.image_url}" alt="${material.title}" onerror="this.style.display='none'">`
                        : getMaterialIcon(material.title)
                    }
                </div>
                <div class="material-info">
                    <h3>${material.title}</h3>
                    <div class="material-meta">
                        <span><i class="fas fa-tasks"></i> ${material.assignments?.length || 0} заданий</span>
                        <span><i class="fas fa-sort"></i> Порядок: ${material.display_order || 0}</span>
                        ${material.image_url ? '<span><i class="fas fa-image"></i> Есть изображение</span>' : ''}
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
            document.getElementById('displayOrder').value = material.display_order || 0;
            
            // Обработка изображения
            if (material.image_url) {
                currentImageUrl.value = material.image_url;
                previewImage.src = material.image_url;
                imagePreview.classList.remove('hidden');
                uploadArea.classList.add('hidden');
            } else {
                resetImageSelection();
            }
        } else {
            // Создание нового
            modalTitle.textContent = 'Добавить материал';
            materialForm.reset();
            document.getElementById('displayOrder').value = materials.length;
            resetImageSelection();
        }

        materialModal.classList.remove('hidden');
    }

    function closeMaterialModal() {
        materialModal.classList.add('hidden');
        currentEditingId = null;
        selectedFile = null;
        materialForm.reset();
        resetImageSelection();
    }

    async function handleMaterialSubmit(e) {
        e.preventDefault();
        
        if (uploadInProgress) {
            showNotification('Дождитесь завершения загрузки изображения', 'warning');
            return;
        }

        const saveBtn = document.getElementById('saveMaterialBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            setSaveButtonLoading(true, 'Загрузка изображения...');

            const formData = {
                title: document.getElementById('materialTitle').value.trim(),
                display_order: parseInt(document.getElementById('displayOrder').value) || 0
            };

            if (!formData.title) {
                throw new Error('Название материала обязательно');
            }

            // Загружаем изображение если есть
            let imageUrl = currentImageUrl.value;
            if (selectedFile) {
                imageUrl = await uploadImageToStorage(currentEditingId);
            }

            formData.image_url = imageUrl || null;

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
            setSaveButtonLoading(false);
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
            // Сначала удаляем все задания, связанные с этим материалом
            const { error: assignmentsError } = await supabase
                .from('assignments')
                .delete()
                .eq('material_id', materialId);

            if (assignmentsError) {
                console.error('Ошибка удаления заданий:', assignmentsError);
                throw new Error('Не удалось удалить связанные задания');
            }

            // Находим материал для удаления изображения
            const material = materials.find(m => m.id === materialId);
            if (material && material.image_url) {
                await deleteImageFromStorage(material.image_url);
            }

            // Удаляем сам материал
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', materialId);

            if (error) throw error;

            showNotification('Материал удален!', 'success');
            await loadMaterials();

        } catch (error) {
            console.error('Ошибка удаления:', error);
            showNotification(
                error.message || 'Ошибка при удалении материала', 
                'error'
            );
        }
    };

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : type === 'warning' ? 'var(--warning)' : 'var(--info)'};
            color: white;
            padding: 16px 20px;
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation' : 'info'}"></i>
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