// 全局状态管理
const AppState = {
    initialized: false,
    examData: null,
    currentExam: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: 0,
    examTimeLeft: 90 * 60,
    canSubmit: false,
    examTimer: null
};

// DOM 元素引用
const DOM = {
    startScreen: document.getElementById('start-screen'),
    examScreen: document.getElementById('exam-screen'),
    answerSheetScreen: document.getElementById('answer-sheet-screen'),
    resultScreen: document.getElementById('result-screen'),
    wrongAnswersScreen: document.getElementById('wrong-answers-screen'),
    singleChoiceSheet: document.getElementById('single-choice-sheet'),
    multiChoiceSheet: document.getElementById('multi-choice-sheet'),
    judgmentSheet: document.getElementById('judgment-sheet'),
    progressText: document.querySelector('.progress-text'),
    sectionTitle: document.getElementById('section-title'),
    questionText: document.querySelector('.question-text'),
    optionsContainer: document.querySelector('.options-container'),
    answerSheetBtn: document.getElementById('answer-sheet-btn'),
    submitBtn: document.getElementById('submit-btn'),
    backToExamBtn: document.getElementById('back-to-exam-btn'),
    viewWrongBtn: document.getElementById('view-wrong-btn'),
    newExamBtn: document.getElementById('new-exam-btn'),
    backToResultBtn: document.getElementById('back-to-result-btn'),
    totalScore: document.querySelector('.total-score'),
    passBadge: document.querySelector('.pass-badge'),
    scoreDetails: document.querySelector('.score-details'),
    wrongCount: document.getElementById('wrong-count')
};

// 题库验证
function validateExamData(data) {
    const requiredTypes = ['single_choice', 'multiple_choice', 'true_false'];
    const minCounts = { single_choice: 100, multiple_choice: 20, true_false: 30 };
    
    return requiredTypes.every(type => {
        if (!data[type] || !Array.isArray(data[type])) {
            throw new Error(`无效的题型格式: ${type}`);
        }
        return data[type].length >= minCounts[type];
    });
}

// 打乱数组顺序
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 打乱选项顺序并重新编号
function shuffleOptions(options) {
    const shuffled = shuffleArray(options);
    return shuffled.map((o, index) => {
        const letter = String.fromCharCode(65 + index);
        return {
            letter,
            text: `${letter}、${o.text.split('、')[1]}`
        };
    });
}

// 生成随机试卷（核心函数）
function generateRandomExam() {
    AppState.currentExam = [];
    
    // 处理单选题
    const singleChoices = [...AppState.examData.single_choice]
        .sort(() => Math.random() - 0.5)
        .slice(0, 100)
        .map(q => {
            const optionsWithKeys = q.options.map(o => ({
                letter: o.split("、")[0],
                text: o
            }));
            const shuffled = shuffleOptions(optionsWithKeys);
            const correctAnswer = shuffled.find(o => o.letter === q.answer).text;

            return {
                ...q,
                type: 'single_choice',
                shuffledOptions: shuffled.map(o => o.text),
                correctAnswer,
                displayAnswer: correctAnswer
            };
        });

    // 处理多选题
    const multiChoices = [...AppState.examData.multiple_choice]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(q => {
            const optionsWithKeys = q.options.map(o => ({
                letter: o.split("、")[0],
                text: o
            }));
            const shuffled = shuffleOptions(optionsWithKeys);
            const correctAnswers = q.answer.map(a => 
                shuffled.find(o => o.letter === a).text
            );

            return {
                ...q,
                type: 'multiple_choice',
                shuffledOptions: shuffled.map(o => o.text),
                correctAnswer: correctAnswers,
                displayAnswer: correctAnswers.join('、')
            };
        });

    // 处理判断题
    const judgments = [...AppState.examData.true_false]
        .sort(() => Math.random() - 0.5)
        .slice(0, 30)
        .map(q => ({
            ...q,
            type: 'true_false',
            shuffledOptions: ['正确', '错误'],
            correctAnswer: q.answer ? '正确' : '错误',
            displayAnswer: q.answer ? '正确' : '错误'
        }));

    AppState.currentExam = [...singleChoices, ...multiChoices, ...judgments];
    AppState.userAnswers = new Array(AppState.currentExam.length).fill(null);
}

// 重置考试状态
function resetExamState() {
    AppState.currentQuestionIndex = 0;
    AppState.userAnswers = new Array(150).fill(null);
    AppState.score = 0;
    AppState.examTimeLeft = 90 * 60;
    AppState.canSubmit = false;
    updateUIState();
}

// 开始考试
function startExam() {
    if (!AppState.initialized) return;
    
    resetExamState();
    generateRandomExam();
    
    clearInterval(AppState.examTimer);
    document.getElementById('timer-display')?.remove();
    
    DOM.startScreen.classList.add('hidden');
    DOM.examScreen.classList.remove('hidden');
    DOM.answerSheetScreen.classList.add('hidden');
    DOM.resultScreen.classList.add('hidden');
    DOM.wrongAnswersScreen.classList.add('hidden');
    
    // 2分钟后允许交卷
    setTimeout(() => {
        AppState.canSubmit = true;
        updateUIState();
    }, 2 * 60 * 1000);
    
    startTimer();
    showCurrentQuestion();
    updateAnswerSheet();
}

// 显示当前题目
function showCurrentQuestion() {
    const question = AppState.currentExam[AppState.currentQuestionIndex];
    DOM.questionText.textContent = question.question;
    DOM.optionsContainer.innerHTML = '';

    question.shuffledOptions.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;

        if (question.type === 'single_choice') {
            optionDiv.addEventListener('click', () => {
                AppState.userAnswers[AppState.currentQuestionIndex] = option;
                updateAnswerSheet();
                showNextQuestion();
            });
        } else if (question.type === 'multiple_choice') {
            optionDiv.addEventListener('click', () => {
                if (!AppState.userAnswers[AppState.currentQuestionIndex]) {
                    AppState.userAnswers[AppState.currentQuestionIndex] = [];
                }
                const index = AppState.userAnswers[AppState.currentQuestionIndex].indexOf(option);
                if (index === -1) {
                    AppState.userAnswers[AppState.currentQuestionIndex].push(option);
                    optionDiv.classList.add('selected');
                } else {
                    AppState.userAnswers[AppState.currentQuestionIndex].splice(index, 1);
                    optionDiv.classList.remove('selected');
                }
                updateAnswerSheet();
            });
        } else if (question.type === 'true_false') {
            optionDiv.addEventListener('click', () => {
                AppState.userAnswers[AppState.currentQuestionIndex] = option;
                updateAnswerSheet();
                showNextQuestion();
            });
        }

        if (Array.isArray(AppState.userAnswers[AppState.currentQuestionIndex]) &&
            AppState.userAnswers[AppState.currentQuestionIndex].includes(option)) {
            optionDiv.classList.add('selected');
        }

        DOM.optionsContainer.appendChild(optionDiv);
    });

    DOM.progressText.textContent = `${AppState.currentQuestionIndex + 1}/150`;
    updateSectionTitle();
}

// 更新题目类型标题
function updateSectionTitle() {
    const index = AppState.currentQuestionIndex;
    if (index < 100) {
        DOM.sectionTitle.textContent = '单选题';
    } else if (index < 120) {
        DOM.sectionTitle.textContent = '多选题';
    } else {
        DOM.sectionTitle.textContent = '判断题';
    }
}

// 显示下一题
function showNextQuestion() {
    if (AppState.currentQuestionIndex < AppState.currentExam.length - 1) {
        AppState.currentQuestionIndex++;
        showCurrentQuestion();
        updateAnswerSheet();
    }
}

// 更新答题卡
function updateAnswerSheet() {
    DOM.singleChoiceSheet.innerHTML = '';
    DOM.multiChoiceSheet.innerHTML = '';
    DOM.judgmentSheet.innerHTML = '';
    
    AppState.currentExam.forEach((question, index) => {
        const sheetNumber = document.createElement('div');
        sheetNumber.classList.add('sheet-number');
        sheetNumber.textContent = index + 1;
        
        // 设置答题状态
        const isAnswered = question.type === 'multiple_choice' 
            ? Array.isArray(AppState.userAnswers[index]) && AppState.userAnswers[index].length > 0
            : AppState.userAnswers[index] !== null;
        
        if (isAnswered) sheetNumber.classList.add('answered');
        if (index === AppState.currentQuestionIndex) sheetNumber.classList.add('current');
        
        // 添加点击事件
        sheetNumber.addEventListener('click', () => {
            AppState.currentQuestionIndex = index;
            DOM.answerSheetScreen.classList.add('hidden');
            DOM.examScreen.classList.remove('hidden');
            showCurrentQuestion();
        });
        
        // 添加到对应区域
        if (index < 100) {
            DOM.singleChoiceSheet.appendChild(sheetNumber);
        } else if (index < 120) {
            DOM.multiChoiceSheet.appendChild(sheetNumber);
        } else {
            DOM.judgmentSheet.appendChild(sheetNumber);
        }
    });

    const answeredCount = AppState.userAnswers.filter(ans => ans !== null).length;
    document.getElementById('answered-count').textContent = answeredCount;
}

// 处理交卷
function handleSubmit() {
    if (!AppState.canSubmit) {
        alert('考试开始2分钟后才能交卷！');
        return;
    }
    showResult();
}

// 计算分数
function calculateScore() {
    let singleChoiceScore = 0;
    let multiChoiceScore = 0;
    let judgmentScore = 0;

    AppState.currentExam.forEach((q, idx) => {
        const userAnswer = AppState.userAnswers[idx];
        if (!userAnswer) return;

        if (q.type === 'single_choice') {
            singleChoiceScore += (userAnswer === q.correctAnswer ? 0.5 : 0);
        } 
        else if (q.type === 'multiple_choice') {
            if (!Array.isArray(userAnswer)) return;
            
            const userSelected = [...userAnswer].sort();
            const correctAnswers = [...q.correctAnswer].sort();
            
            if (arraysEqual(correctAnswers, userSelected)) {
                multiChoiceScore += 1.5;
            }
        } 
        else if (q.type === 'true_false') {
            judgmentScore += (userAnswer === q.correctAnswer ? 1 : 0);
        }
    });

    AppState.score = singleChoiceScore + multiChoiceScore + judgmentScore;
}

// 判断两个数组是否相等
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// 更新分数详情
function updateScoreDetails() {
    const details = {
        'single_choice': { score: 0, max: 50 },
        'multiple_choice': { score: 0, max: 30 },
        'true_false': { score: 0, max: 30 }
    };

    AppState.currentExam.forEach((q, idx) => {
        const userAnswer = AppState.userAnswers[idx];
        if (!userAnswer) return;

        if (q.type === 'single_choice') {
            details.single_choice.score += (userAnswer === q.correctAnswer ? 0.5 : 0);
        }
        else if (q.type === 'multiple_choice') {
            if (!Array.isArray(userAnswer)) return;
            
            const userSelected = [...userAnswer].sort();
            const correctAnswers = [...q.correctAnswer].sort();
            
            if (arraysEqual(correctAnswers, userSelected)) {
                details.multiple_choice.score += 1.5;
            }
        }
        else if (q.type === 'true_false') {
            details.true_false.score += (userAnswer === q.correctAnswer ? 1 : 0);
        }
    });

    // 更新UI
    Object.keys(details).forEach(type => {
        const typeKey = type.replace('_', '-');
        const progress = details[type].score / details[type].max * 100;
        document.querySelector(`.${typeKey} .detail-progress`).style.width = `${progress}%`;
        document.querySelector(`.${typeKey} .detail-score`).textContent = 
            `${details[type].score.toFixed(1)}/${details[type].max}`;
    });
}

// 显示结果
function showResult() {
    clearInterval(AppState.examTimer);
    document.getElementById('timer-display')?.remove();

    calculateScore();
    updateScoreDetails();

    DOM.examScreen.classList.add('hidden');
    DOM.answerSheetScreen.classList.add('hidden');
    DOM.resultScreen.classList.remove('hidden');
    DOM.wrongAnswersScreen.classList.add('hidden');

    DOM.totalScore.textContent = AppState.score;
    const passBadge = DOM.passBadge;
    passBadge.textContent = AppState.score >= 60 ? '合格' : '不合格';
    passBadge.className = AppState.score >= 60 ? 'pass-badge' : 'fail-badge';
}

// 显示错题解析
function showWrongAnswers() {
    DOM.resultScreen.classList.add('hidden');
    DOM.wrongAnswersScreen.classList.remove('hidden');
    
    const container = document.querySelector('.wrong-answers-container');
    container.innerHTML = '<h3>错题解析</h3>';
    let wrongCount = 0;

    AppState.currentExam.forEach((q, idx) => {
        const userAnswer = AppState.userAnswers[idx];
        let isWrong = false;

        // 判断是否答错
        if (q.type === 'single_choice') {
            isWrong = userAnswer !== q.correctAnswer;
        } else if (q.type === 'multiple_choice') {
            isWrong = !Array.isArray(userAnswer) || 
                !arraysEqual([...userAnswer].sort(), [...q.correctAnswer].sort());
        } else {
            isWrong = userAnswer !== q.correctAnswer;
        }

        if (!isWrong) return;
        
        wrongCount++;
        const wrongItem = document.createElement('div');
        wrongItem.className = 'wrong-item';
        
        // 格式化用户答案
        const formattedUserAnswer = Array.isArray(userAnswer) ? userAnswer.join('、') : userAnswer;
        
        // 构建错题项HTML
        wrongItem.innerHTML = `
            <div class="wrong-question">
                <strong>第${idx + 1}题 (${getQuestionTypeText(q.type)})</strong>
                <p>${q.question}</p>
            </div>
            <div class="wrong-answer">
                <p>你的答案: <span class="user-wrong">${formattedUserAnswer}</span></p>
                <p>正确答案: <span class="correct-answer">${q.displayAnswer}</span></p>
            </div>
            ${q.explanation ? `<div class="explanation">解析: ${q.explanation}</div>` : ''}
        `;
        container.appendChild(wrongItem);
    });

    DOM.wrongCount.textContent = wrongCount;
}

// 获取题目类型文本
function getQuestionTypeText(type) {
    switch (type) {
        case 'single_choice':
            return '单选题';
        case 'multiple_choice':
            return '多选题';
        case 'true_false':
            return '判断题';
        default:
            return '';
    }
}

// 开始计时
function startTimer() {
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    document.body.appendChild(timerDisplay);

    AppState.examTimer = setInterval(() => {
        AppState.examTimeLeft--;
        if (AppState.examTimeLeft <= 0) {
            clearInterval(AppState.examTimer);
            handleSubmit();
        }

        const minutes = Math.floor(AppState.examTimeLeft / 60);
        const seconds = AppState.examTimeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (AppState.examTimeLeft <= 60) {
            timerDisplay.classList.add('blink');
        }
    }, 1000);
}

// 更新UI状态
function updateUIState() {
    DOM.submitBtn.disabled = !AppState.canSubmit;
}

// 初始化
function init() {
    fetch('exam.json')
      .then(response => response.json())
      .then(data => {
            try {
                if (validateExamData(data)) {
                    AppState.examData = data;
                    AppState.initialized = true;
                }
            } catch (error) {
                document.getElementById('error-message').classList.remove('hidden');
                document.getElementById('error-message').textContent = error.message;
            }
        })
      .catch(error => {
            document.getElementById('error-message').classList.remove('hidden');
            document.getElementById('error-message').textContent = '加载题库失败: ' + error.message;
        });

    document.getElementById('start-btn').addEventListener('click', startExam);
    DOM.answerSheetBtn.addEventListener('click', () => {
        DOM.examScreen.classList.add('hidden');
        DOM.answerSheetScreen.classList.remove('hidden');
    });
    DOM.backToExamBtn.addEventListener('click', () => {
        DOM.answerSheetScreen.classList.add('hidden');
        DOM.examScreen.classList.remove('hidden');
        showCurrentQuestion();
    });
    DOM.submitBtn.addEventListener('click', handleSubmit);
    DOM.viewWrongBtn.addEventListener('click', showWrongAnswers);
    DOM.newExamBtn.addEventListener('click', startExam);
    DOM.backToResultBtn.addEventListener('click', () => {
        DOM.wrongAnswersScreen.classList.add('hidden');
        DOM.resultScreen.classList.remove('hidden');
    });
}

init();
