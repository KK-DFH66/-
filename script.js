// 全局状态管理
const AppState = {
    examData: null,
    currentExam: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: 0,
    examTimer: null,
    examTimeLeft: 90 * 60,
    canSubmit: false,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    initialized: false,
    loading: false,
    error: null
};

// DOM元素缓存
const DOM = {
    startScreen: document.getElementById('start-screen'),
    examScreen: document.getElementById('exam-screen'),
    answerSheetScreen: document.getElementById('answer-sheet-screen'),
    resultScreen: document.getElementById('result-screen'),
    wrongAnswersScreen: document.getElementById('wrong-answers-screen'),
    startBtn: document.getElementById('start-btn'),
    submitBtn: document.getElementById('submit-btn'),
    viewWrongBtn: document.getElementById('view-wrong-btn'),
    newExamBtn: document.getElementById('new-exam-btn'),
    backToResultBtn: document.getElementById('back-to-result-btn'),
    answerSheetBtn: document.getElementById('answer-sheet-btn'),
    backToExamBtn: document.getElementById('back-to-exam-btn'),
    sectionTitle: document.getElementById('section-title'),
    questionType: document.querySelector('.question-type'),
    questionText: document.querySelector('.question-text'),
    optionsContainer: document.querySelector('.options-container'),
    progressBar: document.querySelector('.progress'),
    progressText: document.querySelector('.progress-text'),
    singleChoiceSheet: document.getElementById('single-choice-sheet'),
    multiChoiceSheet: document.getElementById('multi-choice-sheet'),
    judgmentSheet: document.getElementById('judgment-sheet'),
    answeredCount: document.getElementById('answered-count'),
    errorMessage: document.getElementById('error-message'),
    wrongCount: document.getElementById('wrong-count'),
    singleChoiceDetail: document.querySelector('.single-choice .detail-progress'),
    multiChoiceDetail: document.querySelector('.multiple-choice .detail-progress'),
    judgmentDetail: document.querySelector('.true-false .detail-progress')
};

// 初始化应用
async function initApp() {
    if (AppState.initialized || AppState.loading) return;
    
    AppState.loading = true;
    AppState.error = null;
    updateUIState();
    
    try {
        // 1. 加载题库
        const response = await fetch('exam.json');
        if (!response.ok) throw new Error(`题库加载失败 (HTTP ${response.status})`);
        
        const data = await response.json();
        
        // 2. 验证题库
        validateExamData(data);
        
        // 3. 初始化成功
        AppState.examData = data;
        AppState.initialized = true;
        bindEventListeners();
        
    } catch (error) {
        AppState.error = error;
        showError(error.message);
    } finally {
        AppState.loading = false;
        updateUIState();
    }
}

// 题库验证
function validateExamData(data) {
    const requiredTypes = ['single_choice', 'multiple_choice', 'true_false'];
    const minCounts = {
        single_choice: 100,
        multiple_choice: 20,
        true_false: 30
    };
    
    // 检查题型
    requiredTypes.forEach(type => {
        if (!data[type]) throw new Error(`缺少必要题型: ${type}`);
        if (!Array.isArray(data[type])) throw new Error(`${type} 题型必须为数组`);
    });
    
    // 检查题目数量
    Object.entries(minCounts).forEach(([type, min]) => {
        if (data[type].length < min) {
            throw new Error(`${type} 题目数量不足 (需要至少 ${min} 题)`);
        }
    });
}

// 更新UI状态
function updateUIState() {
    // 开始按钮状态
    if (AppState.loading) {
        DOM.startBtn.disabled = true;
        DOM.startBtn.classList.add('loading');
        DOM.startBtn.innerHTML = '<span class="loading-spinner"></span> 加载中...';
    } else if (AppState.error) {
        DOM.startBtn.disabled = false;
        DOM.startBtn.classList.remove('loading');
        DOM.startBtn.textContent = '重试';
    } else if (AppState.initialized) {
        DOM.startBtn.disabled = false;
        DOM.startBtn.classList.remove('loading');
        DOM.startBtn.textContent = '开始考试';
    }
    
    // 错误消息
    if (AppState.error) {
        DOM.errorMessage.textContent = `错误: ${AppState.error.message}`;
        DOM.errorMessage.classList.remove('hidden');
    } else {
        DOM.errorMessage.classList.add('hidden');
    }
    
    // 交卷按钮状态
    if (AppState.canSubmit) {
        DOM.submitBtn.disabled = false;
    } else {
        DOM.submitBtn.disabled = true;
    }
}

// 显示错误
function showError(message) {
    console.error('系统错误:', message);
    DOM.errorMessage.textContent = `错误: ${message}`;
    DOM.errorMessage.classList.remove('hidden');
}

// 绑定事件监听器
function bindEventListeners() {
    // 开始考试按钮
    DOM.startBtn.addEventListener('click', startExam);
    
    // 交卷按钮
    DOM.submitBtn.addEventListener('click', handleSubmit);
    
    // 答题卡按钮
    DOM.answerSheetBtn.addEventListener('click', showAnswerSheet);
    DOM.backToExamBtn.addEventListener('click', () => {
        DOM.answerSheetScreen.classList.add('hidden');
        DOM.examScreen.classList.remove('hidden');
    });
    
    // 错题回顾按钮
    DOM.viewWrongBtn.addEventListener('click', showWrongAnswers);
    DOM.backToResultBtn.addEventListener('click', () => {
        DOM.wrongAnswersScreen.classList.add('hidden');
        DOM.resultScreen.classList.remove('hidden');
    });
    
    // 重新考试按钮
    DOM.newExamBtn.addEventListener('click', startExam);
    
    // 交互效果
    DOM.startBtn.addEventListener('mousedown', () => {
        DOM.startBtn.style.transform = 'scale(0.98)';
    });
    DOM.startBtn.addEventListener('mouseup', () => {
        DOM.startBtn.style.transform = '';
    });
    DOM.startBtn.addEventListener('mouseleave', () => {
        DOM.startBtn.style.transform = '';
    });
    
    // 滑动/滚轮事件
    if (AppState.isMobile) {
        DOM.examScreen.addEventListener('touchstart', handleTouchStart, false);
        DOM.examScreen.addEventListener('touchend', handleTouchEnd, false);
    } else {
        DOM.examScreen.addEventListener('wheel', handleWheel, { passive: false });
    }
}

// 触摸事件处理
function handleTouchStart(e) {
    AppState.touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - AppState.touchStartX;
    
    if (Math.abs(diffX) > 50) {
        diffX > 0 ? showPreviousQuestion() : showNextQuestion();
    }
}

// 滚轮事件处理
function handleWheel(e) {
    e.preventDefault();
    if (e.deltaY > 0) {
        showNextQuestion();
    } else if (e.deltaY < 0) {
        showPreviousQuestion();
    }
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
    
    // 15分钟后允许交卷
    setTimeout(() => {
        AppState.canSubmit = true;
        updateUIState();
    }, 15 * 60 * 1000);
    
    startTimer();
    showCurrentQuestion();
    updateAnswerSheet();
}

// 重置考试状态
function resetExamState() {
    AppState.currentQuestionIndex = 0;
    AppState.userAnswers = [];
    AppState.score = 0;
    AppState.examTimeLeft = 90 * 60;
    AppState.canSubmit = false;
    updateUIState();
}

// 生成随机试卷
function generateRandomExam() {
    AppState.currentExam = [];
    
    // 单选题
    const singleChoices = [...AppState.examData.single_choice]
        .sort(() => Math.random() - 0.5)
        .slice(0, 100)
        .map(q => ({
            ...q,
            type: 'single_choice',
            shuffledOptions: shuffleOptions([...q.options]),
            cleanAnswer: q.answer
        }));
    
    // 多选题
    const multiChoices = [...AppState.examData.multiple_choice]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(q => ({
            ...q,
            type: 'multiple_choice',
            shuffledOptions: shuffleOptions([...q.options]),
            cleanAnswer: q.answer.sort().join('、')
        }));
    
    // 判断题
    const judgments = [...AppState.examData.true_false]
        .sort(() => Math.random() - 0.5)
        .slice(0, 30)
        .map(q => ({
            ...q,
            type: 'true_false',
            shuffledOptions: ['正确', '错误'],
            cleanAnswer: q.answer ? '正确' : '错误',
            explanation: q.explanation || "暂无解析"
        }));
    
    AppState.currentExam = [...singleChoices, ...multiChoices, ...judgments];
    AppState.userAnswers = new Array(AppState.currentExam.length).fill(null);
}

// 打乱选项顺序
function shuffleOptions(options) {
    return [...options].sort(() => Math.random() - 0.5);
}

// 显示当前题目
function showCurrentQuestion() {
    const question = AppState.currentExam[AppState.currentQuestionIndex];
    const totalQuestions = AppState.currentExam.length;
    
    // 更新进度条
    DOM.progressBar.style.width = `${(AppState.currentQuestionIndex + 1) / totalQuestions * 100}%`;
    DOM.progressText.textContent = `${AppState.currentQuestionIndex + 1}/${totalQuestions}`;
    
    // 设置板块标题
    let sectionTitle = '';
    if (AppState.currentQuestionIndex < 100) {
        sectionTitle = '单选题板块 (1-100)';
    } else if (AppState.currentQuestionIndex < 120) {
        sectionTitle = '多选题板块 (101-120)';
    } else {
        sectionTitle = '判断题板块 (121-150)';
    }
    DOM.sectionTitle.textContent = sectionTitle;
    
    // 设置题目类型和内容
    DOM.questionType.textContent = question.type === 'single_choice' ? '单选题' : 
                                 question.type === 'multiple_choice' ? '多选题' : '判断题';
    DOM.questionText.textContent = `${AppState.currentQuestionIndex + 1}. ${question.question}`;
    
    // 清空并重建选项
    DOM.optionsContainer.innerHTML = '';
    question.shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        
        // 设置选中状态
        if (question.type === 'multiple_choice') {
            if (Array.isArray(AppState.userAnswers[AppState.currentQuestionIndex])) {
                optionElement.classList.toggle('selected', 
                    AppState.userAnswers[AppState.currentQuestionIndex].includes(option));
            }
        } else {
            optionElement.classList.toggle('selected', 
                AppState.userAnswers[AppState.currentQuestionIndex] === option);
        }
        
        optionElement.addEventListener('click', () => selectOption(option));
        DOM.optionsContainer.appendChild(optionElement);
    });
    
    updateAnswerSheet();
}

// 选择答案
function selectOption(selectedOption) {
    const currentQuestion = AppState.currentExam[AppState.currentQuestionIndex];
    
    if (currentQuestion.type === 'multiple_choice') {
        if (!Array.isArray(AppState.userAnswers[AppState.currentQuestionIndex])) {
            AppState.userAnswers[AppState.currentQuestionIndex] = [];
        }
        
        const index = AppState.userAnswers[AppState.currentQuestionIndex].indexOf(selectedOption);
        if (index === -1) {
            AppState.userAnswers[AppState.currentQuestionIndex].push(selectedOption);
        } else {
            AppState.userAnswers[AppState.currentQuestionIndex].splice(index, 1);
        }
    } else {
        AppState.userAnswers[AppState.currentQuestionIndex] = selectedOption;
    }
    
    showCurrentQuestion();
    updateAnswerSheet();
}

// 上一题
function showPreviousQuestion() {
    if (AppState.currentQuestionIndex > 0) {
        AppState.currentQuestionIndex--;
        showCurrentQuestion();
    }
}

// 下一题
function showNextQuestion() {
    if (AppState.currentQuestionIndex < AppState.currentExam.length - 1) {
        AppState.currentQuestionIndex++;
        showCurrentQuestion();
    }
}

// 显示答题卡
function showAnswerSheet() {
    DOM.examScreen.classList.add('hidden');
    DOM.answerSheetScreen.classList.remove('hidden');
    
    // 更新已回答数量
    const answeredCount = AppState.userAnswers.filter(answer => 
        answer !== null && (Array.isArray(answer) ? answer.length > 0 : true)
    ).length;
    DOM.answeredCount.textContent = answeredCount;
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
        
        // 标记已回答的题目
        const isAnswered = question.type === 'multiple_choice' 
            ? Array.isArray(AppState.userAnswers[index]) && AppState.userAnswers[index].length > 0
            : AppState.userAnswers[index] !== null;
        
        if (isAnswered) {
            sheetNumber.classList.add('answered');
        }
        
        // 标记当前题目
        if (index === AppState.currentQuestionIndex) {
            sheetNumber.classList.add('current');
        }
        
        // 添加点击事件
        sheetNumber.addEventListener('click', () => {
            AppState.currentQuestionIndex = index;
            DOM.answerSheetScreen.classList.add('hidden');
            DOM.examScreen.classList.remove('hidden');
            showCurrentQuestion();
        });
        
        // 添加到对应的答题卡区域
        if (index < 100) {
            DOM.singleChoiceSheet.appendChild(sheetNumber);
        } else if (index < 120) {
            DOM.multiChoiceSheet.appendChild(sheetNumber);
        } else {
            DOM.judgmentSheet.appendChild(sheetNumber);
        }
    });
}

// 启动计时器
function startTimer() {
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    DOM.examScreen.insertBefore(timerDisplay, document.querySelector('.progress-bar'));

    const sheetTimerDisplay = document.createElement('div');
    sheetTimerDisplay.id = 'sheet-timer-display';
    DOM.answerSheetScreen.insertBefore(sheetTimerDisplay, document.querySelector('h2'));

    AppState.examTimer = setInterval(() => {
        AppState.examTimeLeft--;
        const minutes = Math.floor(AppState.examTimeLeft / 60);
        const seconds = AppState.examTimeLeft % 60;
        const timeString = `剩余时间: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        timerDisplay.textContent = timeString;
        sheetTimerDisplay.textContent = timeString;
        
        if (AppState.examTimeLeft <= 5 * 60) {
            timerDisplay.style.color = '#e74c3c';
            timerDisplay.classList.add('blink');
            sheetTimerDisplay.style.color = '#e74c3c';
            sheetTimerDisplay.classList.add('blink');
        }
        
        if (AppState.examTimeLeft <= 0) {
            clearInterval(AppState.examTimer);
            showResult();
        }
    }, 1000);
}

// 处理交卷
function handleSubmit() {
    if (!AppState.canSubmit) {
        alert('考试开始15分钟后才能交卷！');
        return;
    }
    showResult();
}

// 显示结果
function showResult() {
    clearInterval(AppState.examTimer);
    
    // 计算分数
    calculateScore();
    
    // 显示结果界面
    DOM.examScreen.classList.add('hidden');
    DOM.answerSheetScreen.classList.add('hidden');
    DOM.resultScreen.classList.remove('hidden');
    
    const isPassed = AppState.score >= 60;
    document.querySelector('.total-score').textContent = AppState.score.toFixed(1);
    document.querySelector('.pass-badge').className = isPassed ? 'pass-badge' : 'pass-badge fail-badge';
    document.querySelector('.pass-badge').textContent = isPassed ? '合格' : '不合格';
    
    // 更新各题型得分
    updateScoreDetails();
}

// 计算分数
function calculateScore() {
    let singleChoiceScore = 0;
    let multiChoiceScore = 0;
    let judgmentScore = 0;
    
    AppState.currentExam.forEach((q, idx) => {
        const userAnswer = AppState.userAnswers[idx];
        
        if (q.type === 'single_choice') {
            singleChoiceScore += (userAnswer === q.cleanAnswer ? 0.5 : 0);
        } 
        else if (q.type === 'multiple_choice') {
            if (!Array.isArray(userAnswer)) return;
            
            const correctAnswers = q.answer.sort();
            const userSelected = [...userAnswer].sort();
            
            if (arraysEqual(correctAnswers, userSelected)) {
                multiChoiceScore += 1;
            } else if (userSelected.some(ans => correctAnswers.includes(ans))) {
                multiChoiceScore += 0.5;
            }
        } 
        else if (q.type === 'true_false') {
            judgmentScore += (userAnswer === q.cleanAnswer ? 1 : 0);
        }
    });
    
    AppState.score = singleChoiceScore + multiChoiceScore + judgmentScore;
}

// 更新分数详情
function updateScoreDetails() {
    const details = {
        'single_choice': { score: 0, max: 50 },
        'multiple_choice': { score: 0, max: 20 },
        'true_false': { score: 0, max: 30 }
    };
    
    AppState.currentExam.forEach((q, idx) => {
        const userAnswer = AppState.userAnswers[idx];
        
        if (q.type === 'single_choice') {
            details.single_choice.score += (userAnswer === q.cleanAnswer ? 0.5 : 0);
        }
        else if (q.type === 'multiple_choice') {
            if (!Array.isArray(userAnswer)) return;
            
            const correctAnswers = q.answer.sort();
            const userSelected = [...userAnswer].sort();
            
            if (arraysEqual(correctAnswers, userSelected)) {
                details.multiple_choice.score += 1;
            } else if (userSelected.some(ans => correctAnswers.includes(ans))) {
                details.multiple_choice.score += 0.5;
            }
        }
        else if (q.type === 'true_false') {
            details.true_false.score += (userAnswer === q.cleanAnswer ? 1 : 0);
        }
    });
    
    // 更新DOM
    Object.keys(details).forEach(type => {
        const typeKey = type.replace('_', '-');
        const progress = details[type].score / details[type].max * 100;
        document.querySelector(`.${typeKey} .detail-progress`).style.width = `${progress}%`;
        document.querySelector(`.${typeKey} .detail-score`).textContent = 
            `${details[type].score.toFixed(1)}/${details[type].max}`;
    });
}

// 显示错题
function showWrongAnswers() {
    DOM.resultScreen.classList.add('hidden');
    DOM.wrongAnswersScreen.classList.remove('hidden');
    document.querySelector('.wrong-answers-container').innerHTML = '<h3>错题解析</h3>';
    
    let wrongCount = 0;
    
    AppState.currentExam.forEach((q, idx) => {
        const userAnswer = AppState.userAnswers[idx];
        let isWrong = false;
        
        if (q.type === 'multiple_choice') {
            const correctAnswers = q.answer.sort();
            const userSelected = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
            isWrong = !arraysEqual(correctAnswers, userSelected);
        } else {
            isWrong = userAnswer !== q.cleanAnswer;
        }
        
        if (isWrong) {
            wrongCount++;
            const wrongItem = document.createElement('div');
            wrongItem.classList.add('wrong-item');
            
            let formattedUserAnswer = '';
            let formattedCorrectAnswer = '';
            
            if (q.type === 'multiple_choice') {
                formattedUserAnswer = Array.isArray(userAnswer) 
                    ? userAnswer.join('、') 
                    : '未作答';
                formattedCorrectAnswer = q.answer.join('、');
            } else {
                formattedUserAnswer = userAnswer || '未作答';
                formattedCorrectAnswer = q.cleanAnswer;
            }
            
            wrongItem.innerHTML = `
                <div class="wrong-question">
                    <strong>第${idx + 1}题 (${getQuestionTypeText(q.type)})</strong>
                    <p>${q.question}</p>
                </div>
                <div class="wrong-answer">
                    <p>你的答案: <span class="user-wrong">${formattedUserAnswer}</span></p>
                    <p>正确答案: <span class="correct-answer">${formattedCorrectAnswer}</span></p>
                </div>
                ${q.explanation ? `<div class="explanation">解析: ${q.explanation}</div>` : ''}
            `;
            document.querySelector('.wrong-answers-container').appendChild(wrongItem);
        }
    });
    
    document.getElementById('wrong-count').textContent = wrongCount;
}

// 辅助函数
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function getQuestionTypeText(type) {
    const typeMap = {
        'single_choice': '单选题',
        'multiple_choice': '多选题',
        'true_false': '判断题'
    };
    return typeMap[type] || '';
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);
