// assignments.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Assignments page loaded');
    
    const materialHeader = document.getElementById('materialHeader');
    const assignmentsContainer = document.getElementById('assignmentsContainer');
    const backBtn = document.getElementById('backBtn');

    const urlParams = new URLSearchParams(window.location.search);
    const materialId = urlParams.get('material_id');

    console.log('Material ID from URL:', materialId);

    // Загружаем материал и задания
    loadMaterialAndAssignments();

    backBtn.addEventListener('click', function() {
        window.location.href = 'materials.html';
    });

    async function loadMaterialAndAssignments() {
        if (!materialId) {
            showError('Материал не найден');
            return;
        }

        try {
            // Показываем загрузку
            showLoading();

            // Загружаем материал
            const { data: material, error: materialError } = await supabase
                .from('materials')
                .select('*')
                .eq('id', materialId)
                .single();

            if (materialError) {
                console.error('Material error:', materialError);
                throw materialError;
            }

            if (!material) {
                throw new Error('Материал не найден');
            }

            // Отображаем заголовок материала
            renderMaterialHeader(material);

            // Загружаем задания для материала
            const { data: assignments, error: assignmentsError } = await supabase
                .from('assignments')
                .select('*')
                .eq('material_id', materialId)
                .order('created_at', { ascending: true });

            if (assignmentsError) {
                console.error('Assignments error:', assignmentsError);
                throw assignmentsError;
            }

            renderAssignments(assignments);

        } catch (error) {
            console.error('Error loading data:', error);
            showError('Не удалось загрузить данные. Проверьте подключение к интернету.');
        }
    }

    function renderMaterialHeader(material) {
        const materialIcon = getMaterialIcon(material.title);
        
        materialHeader.innerHTML = `
            <div class="material-play-header">
                <div class="material-preview-large">
                    ${materialIcon}
                </div>
                <div class="material-info-large">
                    <h2>${material.title}</h2>
                    <p>Выберите задание для выполнения</p>
                </div>
            </div>
        `;
    }

    function renderAssignments(assignments) {
        if (!assignments || assignments.length === 0) {
            assignmentsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Заданий пока нет</h3>
                    <p>Для этого материала еще не созданы задания</p>
                    <button class="btn btn-primary" onclick="window.location.href = 'materials.html'">
                        <i class="fas fa-arrow-left"></i>
                        Вернуться к материалам
                    </button>
                </div>
            `;
            return;
        }

        assignmentsContainer.innerHTML = `
            <div class="assignments-grid">
                ${assignments.map(assignment => `
                    <div class="assignment-card" data-id="${assignment.id}">
                        <div class="assignment-header">
                            <h3>${assignment.title}</h3>
                            <span class="assignment-type">${getAssignmentTypeLabel(assignment.question_type)}</span>
                        </div>
                        <div class="assignment-content">
                            <p>${assignment.description || 'Интересное задание для развития навыков'}</p>
                            <div class="assignment-meta">
                                <span class="questions-count">
                                    <i class="fas fa-question-circle"></i>
                                    ${getQuestionsCount(assignment)} вопросов
                                </span>
                            </div>
                        </div>
                        <div class="assignment-actions">
                            <button class="btn btn-primary start-assignment" data-id="${assignment.id}">
                                <i class="fas fa-play"></i>
                                Начать
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.start-assignment').forEach(btn => {
            btn.addEventListener('click', function() {
                const assignmentId = this.getAttribute('data-id');
                window.location.href = `assignment-play.html?assignment_id=${assignmentId}`;
            });
        });
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

    function getAssignmentTypeLabel(type) {
        const types = {
            'type1': 'Выбор картинок',
            'type2': 'Схема',
            'type3': 'Слоги',
            'type4': 'Категории'
        };
        return types[type] || 'Задание';
    }

    function getQuestionsCount(assignment) {
        // Если questions - это массив, возвращаем его длину
        if (Array.isArray(assignment.questions)) {
            return assignment.questions.length;
        }
        // Иначе возвращаем 0 или значение по умолчанию
        return assignment.questions_count || 0;
    }

    function showLoading() {
        materialHeader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Загружаем материал...</p>
            </div>
        `;
        
        assignmentsContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Загружаем задания...</p>
            </div>
        `;
    }

    function showError(message) {
        materialHeader.innerHTML = `
            <div class="material-play-header">
                <div class="material-preview-large">❓</div>
                <div class="material-info-large">
                    <h2>Материал</h2>
                    <p>Не удалось загрузить информацию</p>
                </div>
            </div>
        `;
        
        assignmentsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="window.location.href = 'materials.html'">
                        <i class="fas fa-arrow-left"></i>
                        Назад к материалам
                    </button>
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-redo"></i>
                        Обновить
                    </button>
                </div>
            </div>
        `;
    }
});