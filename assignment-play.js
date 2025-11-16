// assignment-play.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    const assignmentTitle = document.getElementById('assignmentTitle');
    const assignmentDescription = document.getElementById('assignmentDescription');
    const questionContainer = document.getElementById('questionContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const checkBtn = document.getElementById('checkBtn');
    const finishBtn = document.getElementById('finishBtn');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const backBtn = document.getElementById('backBtn');
    const resultModal = document.getElementById('resultModal');
    const resultContent = document.getElementById('resultContent');
    const closeResult = document.getElementById('closeResult');
    const tryAgain = document.getElementById('tryAgain');
    const backToAssignments = document.getElementById('backToAssignments');

    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignment_id');

    let assignment = null;
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let questions = [];
    let results = [];

    // Загружаем задание
    loadAssignment();

    backBtn.addEventListener('click', function() {
        if (assignment && assignment.material_id) {
            window.location.href = `assignments.html?material_id=${assignment.material_id}`;
        } else {
            window.history.back();
        }
    });

    prevBtn.addEventListener('click', goToPreviousQuestion);
    nextBtn.addEventListener('click', goToNextQuestion);
    checkBtn.addEventListener('click', checkAnswers);
    finishBtn.addEventListener('click', showResults);
    closeResult.addEventListener('click', () => resultModal.classList.add('hidden'));
    tryAgain.addEventListener('click', tryAgainAssignment);
    backToAssignments.addEventListener('click', () => {
        if (assignment && assignment.material_id) {
            window.location.href = `assignments.html?material_id=${assignment.material_id}`;
        } else {
            window.history.back();
        }
    });

    async function loadAssignment() {
        if (!assignmentId) {
            showError('Задание не найдено');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('assignments')
                .select('*')
                .eq('id', assignmentId)
                .single();

            if (error) throw error;

            assignment = data;
            questions = data.questions || [];

            if (questions.length === 0) {
                showError('В этом задании нет вопросов');
                return;
            }

            // Инициализируем массив ответов и результатов
            userAnswers = new Array(questions.length).fill(null);
            results = new Array(questions.length).fill(false);

            assignmentTitle.textContent = assignment.title;
            assignmentDescription.textContent = assignment.description || 'Интересное задание для развития навыков';
            totalQuestionsSpan.textContent = questions.length;

            renderQuestion();

        } catch (error) {
            console.error('Ошибка загрузки задания:', error);
            showError('Не удалось загрузить задание');
        }
    }

    function renderQuestion() {
        const question = questions[currentQuestionIndex];
        if (!question) return;

        currentQuestionSpan.textContent = currentQuestionIndex + 1;

        let questionHTML = '';
        switch (question.type) {
            case 'type1':
                questionHTML = renderType1Question(question);
                break;
            case 'type2':
                questionHTML = renderType2Question(question);
                break;
            case 'type3':
                questionHTML = renderType3Question(question);
                break;
            case 'type4':
                questionHTML = renderType4Question(question);
                break;
            default:
                questionHTML = `<p>Неизвестный тип вопроса</p>`;
        }

        questionContainer.innerHTML = `
            <div class="question" data-index="${currentQuestionIndex}">
                <h3>${question.question}</h3>
                ${questionHTML}
            </div>
        `;

        // Восстанавливаем предыдущий ответ если есть
        if (userAnswers[currentQuestionIndex] !== null) {
            restoreUserAnswer(question.type, userAnswers[currentQuestionIndex]);
        }

        updateNavigation();
        setupQuestionInteractions(question.type);
    }

    function renderType1Question(question) {
        // Тип 1: Выбор картинок со звуком
        const allImages = [...(question.correctImages || []), ...(question.incorrectImages || [])];
        const shuffledImages = allImages.sort(() => Math.random() - 0.5);

        return `
            <div class="type1-question">
                <p class="question-instruction">Выбери картинки, где есть звук <strong>${assignment.sound_letter}</strong></p>
                <div class="images-selection">
                    ${shuffledImages.map((img, index) => `
                        <div class="image-option" data-image="${img}" data-correct="${(question.correctImages || []).includes(img)}">
                            <img src="${img}" alt="Вариант ${index + 1}">
                            <div class="image-checkbox">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderType2Question(question) {
        // Тип 2: Схема "начало-середина-конец"
        return `
            <div class="type2-question">
                <p class="question-instruction">Отметь, где находится звук <strong>${assignment.sound_letter}</strong> в этих словах:</p>
                <div class="words-positioning">
                    ${(question.words || []).map((wordObj, index) => `
                        <div class="word-position-item">
                            <span class="word">${wordObj.word}</span>
                            <div class="position-options">
                                <label class="position-option">
                                    <input type="radio" name="word-${index}" value="start">
                                    <span class="position-label">Начало</span>
                                </label>
                                <label class="position-option">
                                    <input type="radio" name="word-${index}" value="middle">
                                    <span class="position-label">Середина</span>
                                </label>
                                <label class="position-option">
                                    <input type="radio" name="word-${index}" value="end">
                                    <span class="position-label">Конец</span>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderType3Question(question) {
        // Тип 3: Деление на слоги
        const shuffledWords = (question.syllables || []).sort(() => Math.random() - 0.5);
        const patterns = [...new Set((question.syllables || []).map(s => s.pattern))].sort(() => Math.random() - 0.5);

        return `
            <div class="type3-question">
                <p class="question-instruction">Сопоставь слова с правильными схемами слогов:</p>
                <div class="syllables-matching">
                    ${shuffledWords.map((item, index) => `
                        <div class="syllable-match-item" data-word="${item.word}">
                            <div class="word-item">
                                ${item.image ? `<img src="${item.image}" alt="${item.word}">` : ''}
                                <span class="word-text">${item.word}</span>
                            </div>
                            <div class="pattern-options">
                                <select class="pattern-select">
                                    <option value="">Выбери схему</option>
                                    ${patterns.map(pattern => `
                                        <option value="${pattern}">${pattern}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderType4Question(question) {
        // Тип 4: Разделение по категориям
        const allItems = [...(question.categories?.[0]?.items || []), ...(question.categories?.[1]?.items || [])];
        const shuffledItems = allItems.sort(() => Math.random() - 0.5);

        return `
            <div class="type4-question">
                <p class="question-instruction">Раздели слова по категориям:</p>
                <div class="categories-container">
                    <div class="category-box" data-category="1">
                        <h4>${question.categories?.[0]?.name || 'Категория 1'}</h4>
                        <div class="category-items" id="category1"></div>
                    </div>
                    <div class="category-box" data-category="2">
                        <h4>${question.categories?.[1]?.name || 'Категория 2'}</h4>
                        <div class="category-items" id="category2"></div>
                    </div>
                </div>
                <div class="words-to-categorize">
                    ${shuffledItems.map((item, index) => `
                        <div class="word-to-categorize" data-text="${item.text}" data-correct="${getCorrectCategory(item.text, question)}">
                            ${item.image ? `<img src="${item.image}" alt="${item.text}">` : ''}
                            <span>${item.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function getCorrectCategory(itemText, question) {
        if ((question.categories?.[0]?.items || []).find(item => item.text === itemText)) {
            return '1';
        }
        return '2';
    }

    function setupQuestionInteractions(questionType) {
        switch (questionType) {
            case 'type1':
                setupType1Interactions();
                break;
            case 'type2':
                setupType2Interactions();
                break;
            case 'type3':
                setupType3Interactions();
                break;
            case 'type4':
                setupType4Interactions();
                break;
        }
    }

    function setupType1Interactions() {
        document.querySelectorAll('.image-option').forEach(option => {
            option.addEventListener('click', function() {
                this.classList.toggle('selected');
                saveUserAnswer();
            });
        });
    }

    function setupType2Interactions() {
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', saveUserAnswer);
        });
    }

    function setupType3Interactions() {
        document.querySelectorAll('.pattern-select').forEach(select => {
            select.addEventListener('change', saveUserAnswer);
        });
    }

    function setupType4Interactions() {
        const wordElements = document.querySelectorAll('.word-to-categorize');
        const category1 = document.getElementById('category1');
        const category2 = document.getElementById('category2');

        wordElements.forEach(word => {
            word.setAttribute('draggable', 'true');
            
            word.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', this.dataset.text);
            });
        });

        [category1, category2].forEach(category => {
            category.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drag-over');
            });

            category.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
            });

            category.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                
                const wordText = e.dataTransfer.getData('text/plain');
                const wordElement = document.querySelector(`[data-text="${wordText}"]`);
                
                if (wordElement) {
                    this.appendChild(wordElement);
                    saveUserAnswer();
                }
            });
        });
    }

    function saveUserAnswer() {
        const question = questions[currentQuestionIndex];
        let answer = null;

        switch (question.type) {
            case 'type1':
                const selectedImages = Array.from(document.querySelectorAll('.image-option.selected'))
                    .map(option => ({
                        image: option.dataset.image,
                        correct: option.dataset.correct === 'true'
                    }));
                answer = selectedImages;
                break;

            case 'type2':
                const wordAnswers = {};
                document.querySelectorAll('.word-position-item').forEach((item, index) => {
                    const selected = item.querySelector('input[type="radio"]:checked');
                    wordAnswers[index] = selected ? selected.value : null;
                });
                answer = wordAnswers;
                break;

            case 'type3':
                const patternAnswers = {};
                document.querySelectorAll('.syllable-match-item').forEach(item => {
                    const word = item.dataset.word;
                    const selected = item.querySelector('.pattern-select').value;
                    patternAnswers[word] = selected;
                });
                answer = patternAnswers;
                break;

            case 'type4':
                const categoryAnswers = {};
                document.querySelectorAll('.word-to-categorize').forEach(word => {
                    const category = word.parentElement.id === 'category1' ? '1' : 
                                   word.parentElement.id === 'category2' ? '2' : null;
                    categoryAnswers[word.dataset.text] = category;
                });
                answer = categoryAnswers;
                break;
        }

        userAnswers[currentQuestionIndex] = answer;
    }

    function restoreUserAnswer(questionType, answer) {
        if (!answer) return;

        switch (questionType) {
            case 'type1':
                answer.forEach(item => {
                    const option = document.querySelector(`[data-image="${item.image}"]`);
                    if (option && item.correct) {
                        option.classList.add('selected');
                    }
                });
                break;

            case 'type2':
                Object.entries(answer).forEach(([index, value]) => {
                    if (value) {
                        const radio = document.querySelector(`input[name="word-${index}"][value="${value}"]`);
                        if (radio) radio.checked = true;
                    }
                });
                break;

            case 'type3':
                Object.entries(answer).forEach(([word, pattern]) => {
                    if (pattern) {
                        const select = document.querySelector(`[data-word="${word}"] .pattern-select`);
                        if (select) select.value = pattern;
                    }
                });
                break;

            case 'type4':
                Object.entries(answer).forEach(([text, category]) => {
                    if (category) {
                        const wordElement = document.querySelector(`[data-text="${text}"]`);
                        const categoryElement = document.getElementById(`category${category}`);
                        if (wordElement && categoryElement) {
                            categoryElement.appendChild(wordElement);
                        }
                    }
                });
                break;
        }
    }

    function updateNavigation() {
        prevBtn.disabled = currentQuestionIndex === 0;
        
        if (currentQuestionIndex === questions.length - 1) {
            nextBtn.classList.add('hidden');
            checkBtn.classList.remove('hidden');
            finishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            checkBtn.classList.add('hidden');
            finishBtn.classList.add('hidden');
        }
    }

    function goToPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion();
        }
    }

    function goToNextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            renderQuestion();
        }
    }

    function checkAnswers() {
        saveUserAnswer();
        const question = questions[currentQuestionIndex];
        const userAnswer = userAnswers[currentQuestionIndex];
        const isCorrect = checkUserAnswer(question, userAnswer);
        
        results[currentQuestionIndex] = isCorrect;

        // Показываем результат
        if (isCorrect) {
            showNotification('Правильно! 🎉', 'success');
        } else {
            showNotification('Попробуй еще раз! 💪', 'error');
            // Сбрасываем неправильный ответ
            userAnswers[currentQuestionIndex] = null;
            results[currentQuestionIndex] = false;
            renderQuestion();
        }
    }

    function checkUserAnswer(question, userAnswer) {
        if (!userAnswer) return false;

        switch (question.type) {
            case 'type1':
                // Должны быть выбраны все правильные и ни одной неправильной
                const correctSelected = userAnswer.filter(item => item.correct).length;
                const incorrectSelected = userAnswer.filter(item => !item.correct).length;
                return correctSelected === (question.correctImages || []).length && incorrectSelected === 0;

            case 'type2':
                return (question.words || []).every((wordObj, index) => 
                    userAnswer[index] === wordObj.position
                );

            case 'type3':
                return (question.syllables || []).every(syllable => 
                    userAnswer[syllable.word] === syllable.pattern
                );

            case 'type4':
                return Object.entries(userAnswer).every(([text, category]) => 
                    category === getCorrectCategory(text, question)
                );

            default:
                return false;
        }
    }

    function showResults() {
        saveUserAnswer();
        
        // Проверяем все вопросы
        questions.forEach((question, index) => {
            results[index] = checkUserAnswer(question, userAnswers[index]);
        });

        const correctCount = results.filter(r => r).length;
        const score = Math.round((correctCount / questions.length) * 100);

        resultContent.innerHTML = `
            <div class="result-summary">
                <div class="result-icon">
                    ${score === 100 ? '🏆' : score >= 80 ? '⭐' : score >= 60 ? '👍' : '💪'}
                </div>
                <h3>Задание завершено!</h3>
                <p>Ты ответил правильно на <strong>${correctCount}</strong> из <strong>${questions.length}</strong> вопросов</p>
                <div class="score-display">
                    <span class="score">${score}%</span>
                </div>
                ${score === 100 ? 
                    '<p class="success-text">Отлично! Ты справился идеально! 🎉</p>' :
                    score >= 80 ?
                    '<p class="success-text">Очень хороший результат! 👍</p>' :
                    score >= 60 ?
                    '<p class="warning-text">Неплохо, но можно лучше! 💪</p>' :
                    '<p class="error-text">Попробуй еще раз, у тебя все получится! 🌟</p>'
                }
            </div>
        `;

        resultModal.classList.remove('hidden');
    }

    function tryAgainAssignment() {
        resultModal.classList.add('hidden');
        currentQuestionIndex = 0;
        userAnswers = new Array(questions.length).fill(null);
        results = new Array(questions.length).fill(false);
        renderQuestion();
    }

    function showError(message) {
        questionContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.history.back()">
                    <i class="fas fa-arrow-left"></i>
                    Вернуться назад
                </button>
            </div>
        `;
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--error)'};
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
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});