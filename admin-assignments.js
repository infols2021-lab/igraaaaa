// admin-assignments.js
import { supabase } from './supabase.js';

export class AssignmentManager {
    constructor() {
        this.currentMaterialId = null;
        this.currentEditingId = null;
        this.currentEditingQuestionId = null;
        this.assignments = [];
        this.materials = [];
        this.questions = [];
        
        this.initialize();
    }

    async initialize() {
        await this.loadMaterials();
        this.setupEventListeners();
        this.renderMaterialsDropdown();
    }

    async loadMaterials() {
        try {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            this.materials = data || [];
            
        } catch (error) {
            console.error('Ошибка загрузки материалов:', error);
            this.showNotification('Не удалось загрузить материалы', 'error');
        }
    }

    async loadAssignments(materialId) {
        try {
            const { data, error } = await supabase
                .from('assignments')
                .select('*')
                .eq('material_id', materialId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            this.assignments = data || [];
            this.renderAssignmentsList();
            
        } catch (error) {
            console.error('Ошибка загрузки заданий:', error);
            this.showNotification('Не удалось загрузить задания', 'error');
        }
    }

    setupEventListeners() {
        // Выбор материала
        document.getElementById('materialSelect').addEventListener('change', (e) => {
            this.currentMaterialId = e.target.value;
            if (this.currentMaterialId) {
                this.loadAssignments(this.currentMaterialId);
                document.getElementById('addAssignmentBtn').style.display = 'flex';
            } else {
                document.getElementById('addAssignmentBtn').style.display = 'none';
                this.clearAssignmentsList();
            }
        });

        // Кнопка добавления задания
        document.getElementById('addAssignmentBtn').addEventListener('click', () => {
            this.openAssignmentModal();
        });

        // Модальное окно
        document.getElementById('closeAssignmentModal').addEventListener('click', () => {
            this.closeAssignmentModal();
        });

        document.getElementById('cancelAssignmentBtn').addEventListener('click', () => {
            this.closeAssignmentModal();
        });

        document.getElementById('assignmentForm').addEventListener('submit', (e) => {
            this.handleAssignmentSubmit(e);
        });

        // Переключение типов вопросов
        document.getElementById('questionType').addEventListener('change', (e) => {
            this.renderQuestionForm(e.target.value);
        });

        // Добавление вопроса
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
            this.handleQuestionSubmit();
        });

        // Закрытие модального окна по клику вне его
        document.getElementById('assignmentModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('assignmentModal')) {
                this.closeAssignmentModal();
            }
        });
    }

    renderMaterialsDropdown() {
        const select = document.getElementById('materialSelect');
        select.innerHTML = `
            <option value="">Выберите материал</option>
            ${this.materials.map(material => `
                <option value="${material.id}">${material.title}</option>
            `).join('')}
        `;
    }

    renderAssignmentsList() {
        const container = document.getElementById('assignmentsContent');
        
        if (this.assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Нет заданий</h3>
                    <p>Создайте первое задание для этого материала</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="assignments-list">
                ${this.assignments.map(assignment => `
                    <div class="assignment-card" data-id="${assignment.id}">
                        <div class="assignment-header">
                            <h3>${assignment.title}</h3>
                            <span class="assignment-type-badge">${this.getQuestionTypeLabel(assignment.question_type)}</span>
                        </div>
                        <div class="assignment-content">
                            <p>${assignment.description || 'Без описания'}</p>
                            <div class="assignment-meta">
                                <span><i class="fas fa-question-circle"></i> ${assignment.questions?.length || 0} вопросов</span>
                                <span><i class="fas fa-sound"></i> ${assignment.sound_letter || 'Не указан'}</span>
                            </div>
                        </div>
                        <div class="assignment-actions">
                            <button class="btn btn-warning btn-small" onclick="assignmentManager.editAssignment('${assignment.id}')">
                                <i class="fas fa-edit"></i>
                                Редактировать
                            </button>
                            <button class="btn btn-danger btn-small" onclick="assignmentManager.deleteAssignment('${assignment.id}')">
                                <i class="fas fa-trash"></i>
                                Удалить
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    clearAssignmentsList() {
        const container = document.getElementById('assignmentsContent');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>Выберите материал</h3>
                <p>Выберите материал из списка чтобы просмотреть или создать задания</p>
            </div>
        `;
    }

    getQuestionTypeLabel(type) {
        const types = {
            'type1': 'Выбор картинок со звуком',
            'type2': 'Схема "начало-середина-конец"',
            'type3': 'Деление на слоги',
            'type4': 'Разделение по категориям'
        };
        return types[type] || type;
    }

    openAssignmentModal(assignment = null) {
        this.currentEditingId = assignment ? assignment.id : null;
        this.questions = assignment ? (assignment.questions || []) : [];
        this.currentEditingQuestionId = null;

        if (assignment) {
            document.getElementById('modalAssignmentTitle').textContent = 'Редактировать задание';
            document.getElementById('assignmentTitle').value = assignment.title;
            document.getElementById('assignmentDescription').value = assignment.description || '';
            document.getElementById('soundLetter').value = assignment.sound_letter || '';
            document.getElementById('questionType').value = assignment.question_type || 'type1';
            
            this.renderQuestionsList();
        } else {
            document.getElementById('modalAssignmentTitle').textContent = 'Добавить задание';
            document.getElementById('assignmentForm').reset();
            this.questions = [];
            this.renderQuestionsList();
        }

        this.renderQuestionForm(document.getElementById('questionType').value);
        document.getElementById('assignmentModal').classList.remove('hidden');
    }

    closeAssignmentModal() {
        document.getElementById('assignmentModal').classList.add('hidden');
        this.currentEditingId = null;
        this.currentEditingQuestionId = null;
        this.questions = [];
        document.getElementById('assignmentForm').reset();
    }

    renderQuestionForm(questionType) {
        const formContainer = document.getElementById('questionFormContainer');
        
        const forms = {
            'type1': this.getType1Form(),
            'type2': this.getType2Form(),
            'type3': this.getType3Form(),
            'type4': this.getType4Form()
        };

        formContainer.innerHTML = forms[questionType] || '<p>Неизвестный тип вопроса</p>';
        
        // Инициализируем загрузку изображений для новой формы
        this.setupImageUploads();
        this.setupDynamicElements();

        // Если редактируем вопрос - заполняем форму
        if (this.currentEditingQuestionId) {
            this.fillQuestionForm();
        }
    }

    getType1Form() {
        return `
            <div class="question-form type1">
                <h4>Тип 1: Выбор картинок со звуком</h4>
                <div class="form-group">
                    <label>Вопрос *</label>
                    <input type="text" class="input-field question-text" placeholder="Например: Выбери картинки, где есть звук А" required>
                </div>
                <div class="form-group">
                    <label>Правильные картинки (с нужным звуком) *</label>
                    <div class="images-grid correct-images">
                        <div class="image-upload-item" data-correct="true">
                            <div class="upload-area-small">
                                <i class="fas fa-plus"></i>
                                <span>Добавить картинку</span>
                                <input type="file" accept="image/*" class="hidden">
                            </div>
                            <button type="button" class="btn btn-danger btn-small remove-image">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-small add-image-btn" data-correct="true">
                        <i class="fas fa-plus"></i>
                        Добавить правильную картинку
                    </button>
                </div>
                <div class="form-group">
                    <label>Неправильные картинки (без нужного звука) *</label>
                    <div class="images-grid incorrect-images">
                        <div class="image-upload-item" data-correct="false">
                            <div class="upload-area-small">
                                <i class="fas fa-plus"></i>
                                <span>Добавить картинку</span>
                                <input type="file" accept="image/*" class="hidden">
                            </div>
                            <button type="button" class="btn btn-danger btn-small remove-image">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-small add-image-btn" data-correct="false">
                        <i class="fas fa-plus"></i>
                        Добавить неправильную картинку
                    </button>
                </div>
            </div>
        `;
    }

    getType2Form() {
        return `
            <div class="question-form type2">
                <h4>Тип 2: Схема "начало-середина-конец"</h4>
                <div class="form-group">
                    <label>Вопрос *</label>
                    <input type="text" class="input-field question-text" placeholder="Например: Отметь где находится звук А в словах" required>
                </div>
                <div class="form-group">
                    <label>Слова для анализа *</label>
                    <div class="words-list">
                        <div class="word-item">
                            <input type="text" class="input-field word-input" placeholder="Слово" required>
                            <select class="position-select">
                                <option value="start">Начало</option>
                                <option value="middle">Середина</option>
                                <option value="end">Конец</option>
                            </select>
                            <div class="upload-area-small">
                                <i class="fas fa-image"></i>
                                <input type="file" accept="image/*" class="hidden">
                            </div>
                            <button type="button" class="btn btn-danger btn-small remove-word">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-small add-word-btn">
                        <i class="fas fa-plus"></i>
                        Добавить слово
                    </button>
                </div>
            </div>
        `;
    }

    getType3Form() {
        return `
            <div class="question-form type3">
                <h4>Тип 3: Деление на слоги</h4>
                <div class="form-group">
                    <label>Вопрос *</label>
                    <input type="text" class="input-field question-text" placeholder="Например: Сопоставь слова со схемами слогов" required>
                </div>
                <div class="form-group">
                    <label>Слова и схемы *</label>
                    <div class="syllables-list">
                        <div class="syllable-item">
                            <input type="text" class="input-field word-input" placeholder="Слово" required>
                            <input type="text" class="input-field pattern-input" placeholder="Схема (например: _ _ _)" required>
                            <div class="upload-area-small">
                                <i class="fas fa-image"></i>
                                <input type="file" accept="image/*" class="hidden">
                            </div>
                            <button type="button" class="btn btn-danger btn-small remove-syllable">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-small add-syllable-btn">
                        <i class="fas fa-plus"></i>
                        Добавить слово
                    </button>
                </div>
            </div>
        `;
    }

    getType4Form() {
        return `
            <div class="question-form type4">
                <h4>Тип 4: Разделение по категориям</h4>
                <div class="form-group">
                    <label>Вопрос *</label>
                    <input type="text" class="input-field question-text" placeholder="Например: Раздели слова на твёрдый и мягкий звук К" required>
                </div>
                <div class="form-group">
                    <label>Категория 1 (например: Твёрдый звук) *</label>
                    <input type="text" class="input-field category1-input" placeholder="Название категории" required>
                    <div class="category-items" data-category="1">
                        <div class="category-item">
                            <input type="text" class="input-field item-input" placeholder="Слово или описание" required>
                            <div class="upload-area-small">
                                <i class="fas fa-image"></i>
                                <input type="file" accept="image/*" class="hidden">
                            </div>
                            <button type="button" class="btn btn-danger btn-small remove-item">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-small add-category-item" data-category="1">
                        <i class="fas fa-plus"></i>
                        Добавить элемент
                    </button>
                </div>
                <div class="form-group">
                    <label>Категория 2 (например: Мягкий звук) *</label>
                    <input type="text" class="input-field category2-input" placeholder="Название категории" required>
                    <div class="category-items" data-category="2">
                        <div class="category-item">
                            <input type="text" class="input-field item-input" placeholder="Слово или описание" required>
                            <div class="upload-area-small">
                                <i class="fas fa-image"></i>
                                <input type="file" accept="image/*" class="hidden">
                            </div>
                            <button type="button" class="btn btn-danger btn-small remove-item">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-small add-category-item" data-category="2">
                        <i class="fas fa-plus"></i>
                        Добавить элемент
                    </button>
                </div>
            </div>
        `;
    }

    setupImageUploads() {
        // Настройка загрузки изображений для всех типов вопросов
        document.querySelectorAll('.upload-area, .upload-area-small').forEach(area => {
            const input = area.querySelector('input[type="file"]');
            
            area.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-uploaded-image')) {
                    input.click();
                }
            });

            input.addEventListener('change', (e) => {
                this.handleImageUpload(e, area);
            });

            // Drag and drop
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });

            area.addEventListener('dragleave', () => {
                area.classList.remove('drag-over');
            });

            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageFile(files[0], area);
                }
            });
        });
    }

    setupDynamicElements() {
        // Тип 1: Добавление картинок
        document.querySelectorAll('.add-image-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addImageUploadItem(btn.dataset.correct === 'true');
            });
        });

        // Тип 2: Добавление слов
        const addWordBtn = document.querySelector('.add-word-btn');
        if (addWordBtn) {
            addWordBtn.addEventListener('click', () => {
                this.addWordItem();
            });
        }

        // Тип 3: Добавление слогов
        const addSyllableBtn = document.querySelector('.add-syllable-btn');
        if (addSyllableBtn) {
            addSyllableBtn.addEventListener('click', () => {
                this.addSyllableItem();
            });
        }

        // Тип 4: Добавление элементов категорий
        document.querySelectorAll('.add-category-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addCategoryItem(btn.dataset.category);
            });
        });

        // Удаление элементов
        this.setupRemoveButtons();
    }

    setupRemoveButtons() {
        // Удаление картинок
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-image')) {
                e.target.closest('.image-upload-item').remove();
            }
            
            if (e.target.closest('.remove-word')) {
                e.target.closest('.word-item').remove();
            }
            
            if (e.target.closest('.remove-syllable')) {
                e.target.closest('.syllable-item').remove();
            }
            
            if (e.target.closest('.remove-item')) {
                e.target.closest('.category-item').remove();
            }
        });
    }

    addImageUploadItem(isCorrect) {
        const container = isCorrect ? 
            document.querySelector('.correct-images') :
            document.querySelector('.incorrect-images');
        
        const newItem = document.createElement('div');
        newItem.className = 'image-upload-item';
        newItem.setAttribute('data-correct', isCorrect);
        newItem.innerHTML = `
            <div class="upload-area-small">
                <i class="fas fa-plus"></i>
                <span>Добавить картинку</span>
                <input type="file" accept="image/*" class="hidden">
            </div>
            <button type="button" class="btn btn-danger btn-small remove-image">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(newItem);
        this.setupImageUploads();
    }

    addWordItem() {
        const container = document.querySelector('.words-list');
        const newItem = document.createElement('div');
        newItem.className = 'word-item';
        newItem.innerHTML = `
            <input type="text" class="input-field word-input" placeholder="Слово" required>
            <select class="position-select">
                <option value="start">Начало</option>
                <option value="middle">Середина</option>
                <option value="end">Конец</option>
            </select>
            <div class="upload-area-small">
                <i class="fas fa-image"></i>
                <input type="file" accept="image/*" class="hidden">
            </div>
            <button type="button" class="btn btn-danger btn-small remove-word">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(newItem);
        this.setupImageUploads();
    }

    addSyllableItem() {
        const container = document.querySelector('.syllables-list');
        const newItem = document.createElement('div');
        newItem.className = 'syllable-item';
        newItem.innerHTML = `
            <input type="text" class="input-field word-input" placeholder="Слово" required>
            <input type="text" class="input-field pattern-input" placeholder="Схема (например: _ _ _)" required>
            <div class="upload-area-small">
                <i class="fas fa-image"></i>
                <input type="file" accept="image/*" class="hidden">
            </div>
            <button type="button" class="btn btn-danger btn-small remove-syllable">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(newItem);
        this.setupImageUploads();
    }

    addCategoryItem(category) {
        const container = document.querySelector(`.category-items[data-category="${category}"]`);
        const newItem = document.createElement('div');
        newItem.className = 'category-item';
        newItem.innerHTML = `
            <input type="text" class="input-field item-input" placeholder="Слово или описание" required>
            <div class="upload-area-small">
                <i class="fas fa-image"></i>
                <input type="file" accept="image/*" class="hidden">
            </div>
            <button type="button" class="btn btn-danger btn-small remove-item">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(newItem);
        this.setupImageUploads();
    }

    async handleImageUpload(event, area) {
        const file = event.target.files[0];
        if (file) {
            await this.handleImageFile(file, area);
        }
    }

    async handleImageFile(file, area) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Пожалуйста, выберите файл изображения', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Размер файла не должен превышать 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            area.innerHTML = `
                <img src="${e.target.result}" alt="Превью">
                <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            area.querySelector('.remove-uploaded-image').addEventListener('click', (e) => {
                e.stopPropagation();
                area.innerHTML = `
                    <i class="fas fa-plus"></i>
                    <span>Добавить картинку</span>
                    <input type="file" accept="image/*" class="hidden">
                `;
                this.setupImageUploads();
            });
        };
        reader.readAsDataURL(file);
    }

    handleQuestionSubmit() {
        const questionType = document.getElementById('questionType').value;
        const questionData = this.collectQuestionData(questionType);
        
        if (!questionData) {
            return;
        }

        if (this.currentEditingQuestionId) {
            // Обновление существующего вопроса
            const index = this.questions.findIndex(q => q.id === this.currentEditingQuestionId);
            if (index !== -1) {
                this.questions[index] = { ...questionData, id: this.currentEditingQuestionId };
                this.showNotification('Вопрос обновлен!', 'success');
            }
            this.currentEditingQuestionId = null;
            document.getElementById('addQuestionBtn').innerHTML = '<i class="fas fa-plus"></i> Добавить вопрос';
        } else {
            // Добавление нового вопроса
            questionData.id = Date.now();
            this.questions.push(questionData);
            this.showNotification('Вопрос добавлен!', 'success');
        }

        this.renderQuestionsList();
        this.clearQuestionForm();
    }

    collectQuestionData(type) {
        const questionText = document.querySelector('.question-text')?.value.trim();
        if (!questionText) {
            this.showNotification('Введите текст вопроса', 'error');
            return null;
        }

        const baseData = {
            type: type,
            question: questionText
        };

        try {
            switch (type) {
                case 'type1':
                    return this.collectType1Data(baseData);
                case 'type2':
                    return this.collectType2Data(baseData);
                case 'type3':
                    return this.collectType3Data(baseData);
                case 'type4':
                    return this.collectType4Data(baseData);
                default:
                    return null;
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return null;
        }
    }

    collectType1Data(baseData) {
        const correctImages = Array.from(document.querySelectorAll('[data-correct="true"] img')).map(img => img.src);
        const incorrectImages = Array.from(document.querySelectorAll('[data-correct="false"] img')).map(img => img.src);
        
        if (correctImages.length === 0) {
            throw new Error('Добавьте хотя бы одну правильную картинку');
        }
        if (incorrectImages.length === 0) {
            throw new Error('Добавьте хотя бы одну неправильную картинку');
        }

        return {
            ...baseData,
            correctImages: correctImages,
            incorrectImages: incorrectImages
        };
    }

    collectType2Data(baseData) {
        const words = Array.from(document.querySelectorAll('.word-item')).map(item => {
            const word = item.querySelector('.word-input').value.trim();
            const position = item.querySelector('.position-select').value;
            const image = item.querySelector('img')?.src;

            if (!word) {
                throw new Error('Заполните все поля слов');
            }

            return { word, position, image };
        });

        if (words.length === 0) {
            throw new Error('Добавьте хотя бы одно слово');
        }

        return {
            ...baseData,
            words: words
        };
    }

    collectType3Data(baseData) {
        const syllables = Array.from(document.querySelectorAll('.syllable-item')).map(item => {
            const word = item.querySelector('.word-input').value.trim();
            const pattern = item.querySelector('.pattern-input').value.trim();
            const image = item.querySelector('img')?.src;

            if (!word || !pattern) {
                throw new Error('Заполните все поля слов и схем');
            }

            return { word, pattern, image };
        });

        if (syllables.length === 0) {
            throw new Error('Добавьте хотя бы одно слово со схемой');
        }

        return {
            ...baseData,
            syllables: syllables
        };
    }

    collectType4Data(baseData) {
        const category1Name = document.querySelector('.category1-input').value.trim();
        const category2Name = document.querySelector('.category2-input').value.trim();

        if (!category1Name || !category2Name) {
            throw new Error('Заполните названия обеих категорий');
        }

        const category1 = {
            name: category1Name,
            items: Array.from(document.querySelectorAll('[data-category="1"] .category-item')).map(item => {
                const text = item.querySelector('.item-input').value.trim();
                const image = item.querySelector('img')?.src;

                if (!text) {
                    throw new Error('Заполните все поля элементов категорий');
                }

                return { text, image };
            })
        };

        const category2 = {
            name: category2Name,
            items: Array.from(document.querySelectorAll('[data-category="2"] .category-item')).map(item => {
                const text = item.querySelector('.item-input').value.trim();
                const image = item.querySelector('img')?.src;

                if (!text) {
                    throw new Error('Заполните все поля элементов категорий');
                }

                return { text, image };
            })
        };

        if (category1.items.length === 0 || category2.items.length === 0) {
            throw new Error('Добавьте хотя бы по одному элементу в каждую категорию');
        }

        return {
            ...baseData,
            categories: [category1, category2]
        };
    }

    fillQuestionForm() {
        const question = this.questions.find(q => q.id === this.currentEditingQuestionId);
        if (!question) return;

        // Заполняем основной текст вопроса
        document.querySelector('.question-text').value = question.question;

        switch (question.type) {
            case 'type1':
                this.fillType1Form(question);
                break;
            case 'type2':
                this.fillType2Form(question);
                break;
            case 'type3':
                this.fillType3Form(question);
                break;
            case 'type4':
                this.fillType4Form(question);
                break;
        }
    }

    fillType1Form(question) {
        // Очищаем текущие картинки
        document.querySelectorAll('.image-upload-item').forEach(item => item.remove());

        // Добавляем правильные картинки
        question.correctImages.forEach((imageSrc, index) => {
            if (index === 0) {
                // Заменяем первую картинку
                const container = document.querySelector('[data-correct="true"] .upload-area-small');
                container.innerHTML = `
                    <img src="${imageSrc}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else {
                // Добавляем дополнительные картинки
                this.addImageUploadItem(true);
                const items = document.querySelectorAll('[data-correct="true"]');
                const lastItem = items[items.length - 1];
                lastItem.querySelector('.upload-area-small').innerHTML = `
                    <img src="${imageSrc}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        });

        // Добавляем неправильные картинки
        question.incorrectImages.forEach((imageSrc, index) => {
            if (index === 0) {
                const container = document.querySelector('[data-correct="false"] .upload-area-small');
                container.innerHTML = `
                    <img src="${imageSrc}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else {
                this.addImageUploadItem(false);
                const items = document.querySelectorAll('[data-correct="false"]');
                const lastItem = items[items.length - 1];
                lastItem.querySelector('.upload-area-small').innerHTML = `
                    <img src="${imageSrc}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        });

        this.setupImageUploads();
    }

    fillType2Form(question) {
        // Очищаем текущие слова
        document.querySelectorAll('.word-item').forEach((item, index) => {
            if (index > 0) item.remove();
        });

        // Заполняем первое слово
        if (question.words.length > 0) {
            const firstWord = question.words[0];
            document.querySelector('.word-input').value = firstWord.word;
            document.querySelector('.position-select').value = firstWord.position;
            if (firstWord.image) {
                document.querySelector('.word-item .upload-area-small').innerHTML = `
                    <img src="${firstWord.image}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        }

        // Добавляем остальные слова
        question.words.slice(1).forEach(wordData => {
            this.addWordItem();
            const items = document.querySelectorAll('.word-item');
            const lastItem = items[items.length - 1];
            lastItem.querySelector('.word-input').value = wordData.word;
            lastItem.querySelector('.position-select').value = wordData.position;
            if (wordData.image) {
                lastItem.querySelector('.upload-area-small').innerHTML = `
                    <img src="${wordData.image}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        });

        this.setupImageUploads();
    }

    fillType3Form(question) {
        // Аналогично fillType2Form для типа 3
        document.querySelectorAll('.syllable-item').forEach((item, index) => {
            if (index > 0) item.remove();
        });

        if (question.syllables.length > 0) {
            const firstSyllable = question.syllables[0];
            document.querySelector('.syllable-item .word-input').value = firstSyllable.word;
            document.querySelector('.syllable-item .pattern-input').value = firstSyllable.pattern;
            if (firstSyllable.image) {
                document.querySelector('.syllable-item .upload-area-small').innerHTML = `
                    <img src="${firstSyllable.image}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        }

        question.syllables.slice(1).forEach(syllableData => {
            this.addSyllableItem();
            const items = document.querySelectorAll('.syllable-item');
            const lastItem = items[items.length - 1];
            lastItem.querySelector('.word-input').value = syllableData.word;
            lastItem.querySelector('.pattern-input').value = syllableData.pattern;
            if (syllableData.image) {
                lastItem.querySelector('.upload-area-small').innerHTML = `
                    <img src="${syllableData.image}" alt="Превью">
                    <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        });

        this.setupImageUploads();
    }

    fillType4Form(question) {
        // Заполняем категории
        document.querySelector('.category1-input').value = question.categories[0].name;
        document.querySelector('.category2-input').value = question.categories[1].name;

        // Заполняем элементы категорий
        this.fillCategoryItems(1, question.categories[0].items);
        this.fillCategoryItems(2, question.categories[1].items);

        this.setupImageUploads();
    }

    fillCategoryItems(categoryNumber, items) {
        const container = document.querySelector(`[data-category="${categoryNumber}"]`);
        container.innerHTML = '';

        items.forEach(itemData => {
            const newItem = document.createElement('div');
            newItem.className = 'category-item';
            newItem.innerHTML = `
                <input type="text" class="input-field item-input" placeholder="Слово или описание" required value="${itemData.text}">
                <div class="upload-area-small">
                    ${itemData.image ? 
                        `<img src="${itemData.image}" alt="Превью">
                         <button type="button" class="btn btn-danger btn-small remove-uploaded-image">
                             <i class="fas fa-times"></i>
                         </button>` :
                        `<i class="fas fa-image"></i>
                         <input type="file" accept="image/*" class="hidden">`
                    }
                </div>
                <button type="button" class="btn btn-danger btn-small remove-item">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(newItem);
        });
    }

    clearQuestionForm() {
        const questionType = document.getElementById('questionType').value;
        this.renderQuestionForm(questionType);
    }

    renderQuestionsList() {
        const container = document.getElementById('questionsList');
        
        if (this.questions.length === 0) {
            container.innerHTML = `
                <div class="empty-questions">
                    <i class="fas fa-question-circle"></i>
                    <p>Вопросы еще не добавлены</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="questions-list">
                <h4>Добавленные вопросы (${this.questions.length})</h4>
                ${this.questions.map((question, index) => `
                    <div class="question-item" data-id="${question.id}">
                        <div class="question-header">
                            <strong>Вопрос ${index + 1}:</strong>
                            <span class="question-type">${this.getQuestionTypeLabel(question.type)}</span>
                        </div>
                        <div class="question-text">${question.question}</div>
                        <div class="question-actions">
                            <button type="button" class="btn btn-warning btn-small" onclick="assignmentManager.editQuestion(${question.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-danger btn-small" onclick="assignmentManager.removeQuestion(${question.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    removeQuestion(questionId) {
        if (!confirm('Удалить этот вопрос?')) return;
        
        this.questions = this.questions.filter(q => q.id !== questionId);
        this.renderQuestionsList();
        this.showNotification('Вопрос удален', 'success');
    }

    editQuestion(questionId) {
        this.currentEditingQuestionId = questionId;
        document.getElementById('addQuestionBtn').innerHTML = '<i class="fas fa-save"></i> Сохранить вопрос';
        
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
            document.getElementById('questionType').value = question.type;
            this.renderQuestionForm(question.type);
        }
    }

    async editAssignment(assignmentId) {
        const assignment = this.assignments.find(a => a.id === assignmentId);
        if (assignment) {
            this.openAssignmentModal(assignment);
        }
    }

    async handleAssignmentSubmit(e) {
        e.preventDefault();

        if (this.questions.length === 0) {
            this.showNotification('Добавьте хотя бы один вопрос', 'error');
            return;
        }

        const formData = {
            material_id: this.currentMaterialId,
            title: document.getElementById('assignmentTitle').value.trim(),
            description: document.getElementById('assignmentDescription').value.trim(),
            sound_letter: document.getElementById('soundLetter').value.trim(),
            question_type: document.getElementById('questionType').value,
            questions: this.questions
        };

        if (!formData.title) {
            this.showNotification('Введите название задания', 'error');
            return;
        }

        if (!formData.sound_letter) {
            this.showNotification('Введите изучаемый звук/букву', 'error');
            return;
        }

        try {
            let result;
            if (this.currentEditingId) {
                result = await supabase
                    .from('assignments')
                    .update(formData)
                    .eq('id', this.currentEditingId);
            } else {
                result = await supabase
                    .from('assignments')
                    .insert([formData])
                    .select();
            }

            if (result.error) throw result.error;

            this.showNotification(
                this.currentEditingId ? 'Задание обновлено!' : 'Задание создано!',
                'success'
            );

            this.closeAssignmentModal();
            await this.loadAssignments(this.currentMaterialId);

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showNotification('Ошибка при сохранении задания', 'error');
        }
    }

    async deleteAssignment(assignmentId) {
        if (!confirm('Удалить это задание?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('assignments')
                .delete()
                .eq('id', assignmentId);

            if (error) throw error;

            this.showNotification('Задание удалено!', 'success');
            await this.loadAssignments(this.currentMaterialId);

        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.showNotification('Ошибка при удалении задания', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Удаляем существующие уведомления
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.assignmentManager = new AssignmentManager();
});