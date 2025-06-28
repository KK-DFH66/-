// 全局变量
let examData = {};
let currentExam = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let examTimer;
let examTimeLeft = 90 * 60; // 90分钟倒计时
let canSubmit = false;
let touchStartX = 0;
let touchEndX = 0;

// DOM元素
const startScreen = document.getElementById('start-screen');
const examScreen = document.getElementById('exam-screen');
const answerSheetScreen = document.getElementById('answer-sheet-screen');
const resultScreen = document.getElementById('result-screen');
const wrongAnswersScreen = document.getElementById('wrong-answers-screen');

const startBtn = document.getElementById('start-btn');
const answerSheetBtn = document.getElementById('answer-sheet-btn');
const exitSheetBtn = document.getElementById('exit-sheet-btn');
const submitBtn = document.getElementById('submit-btn');
const viewWrongBtn = document.getElementById('view-wrong-btn');
const newExamBtn = document.getElementById('new-exam-btn');
const backToResultBtn = document.getElementById('back-to-result-btn');

const sectionTitleElement = document.getElementById('section-title');
const questionTypeElement = document.querySelector('.question-type');
const questionTextElement = document.querySelector('.question-text');
const optionsContainer = document.querySelector('.options-container');
const progressBar = document.querySelector('.progress');
const progressText = document.querySelector('.progress-text');
const singleChoiceGrid = document.getElementById('single-choice-grid');
const multiChoiceGrid = document.getElementById('multi-choice-grid');
const judgmentGrid = document.getElementById('judgment-grid');
const wrongAnswersContainer = document.querySelector('.wrong-answers-container');
const questionContainer = document.querySelector('.question-container');

// 初始化
async function init() {
    try {
        const response = await fetch('exam.json');
        if (!response.ok) throw new Error('题库加载失败');
        examData = await response.json();
        
        if (!examData.single_choice || !examData.multiple_choice || !examData.true_false) {
            throw new Error('题库格式错误：缺少必要题型');
        }

        // 验证题目数量是否足够
        if (examData.single_choice.length < 100 || 
            examData.multiple_choice.length < 20 || 
            examData.true_false.length < 30) {
            throw new Error('题库题目数量不足');
        }

        startBtn.addEventListener('click', startExam);
        answerSheetBtn.addEventListener('click', showAnswerSheet);
        exitSheetBtn.addEventListener('click', exitAnswerSheet);
        submitBtn.addEventListener('click', handleSubmit);
        viewWrongBtn.addEventListener('click', showWrongAnswers);
        newExamBtn.addEventListener('click', startExam);
        backToResultBtn.addEventListener('click', () => {
            wrongAnswersScreen.classList.add('hidden');
            resultScreen.classList.remove('hidden');
        });

        // 添加触摸事件监听
        questionContainer.addEventListener('touchstart', handleTouchStart, false);
        questionContainer.addEventListener('touchend', handleTouchEnd, false);

    } catch (error) {
        console.error('初始化错误:', error);
        startBtn.disabled = true;
        startBtn.textContent = '系统初始化失败';
        alert(`系统初始化失败：${error.message}`);
    }
}

// 触摸开始事件处理
function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

// 触摸结束事件处理
function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
}

// 处理滑动动作
function handleSwipe() {
    const threshold = 50; // 滑动阈值
    
    if (touchEndX < touchStartX - threshold) {
        // 向左滑动 - 下一题
        if (currentQuestionIndex < currentExam.length - 1) {
            currentQuestionIndex++;
            showCurrentQuestion();
        }
    } else if (touchEndX > touchStartX + threshold) {
        // 向右滑动 - 上一题
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showCurrentQuestion();
        }
    }
}

// 开始考试
function startExam() {
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    examTimeLeft = 90 * 60;
    canSubmit = false;
    generateRandomExam();
    
    clearInterval(examTimer);
    document.getElementById('timer-display')?.remove();
    document.getElementById('sheet-timer-display')?.remove();
    
    startScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');
    answerSheetScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.add('hidden');
    
    // 15分钟后允许交卷
    setTimeout(() => {
        canSubmit = true;
        submitBtn.disabled = false;
    }, 15 * 60 * 1000);
    
    startTimer();
    showCurrentQuestion();
    initAnswerSheet();
}

// 启动计时器
function startTimer() {
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    examScreen.insertBefore(timerDisplay, document.querySelector('.progress-bar'));

    const sheetTimerDisplay = document.createElement('div');
    sheetTimerDisplay.id = 'sheet-timer-display';
    answerSheetScreen.insertBefore(sheetTimerDisplay, document.querySelector('h2'));

    examTimer = setInterval(() => {
        examTimeLeft--;
        const minutes = Math.floor(examTimeLeft / 60);
        const seconds = examTimeLeft % 60;
        const timeString = `剩余时间: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        timerDisplay.textContent = timeString;
        sheetTimerDisplay.textContent = timeString;
        
        if (examTimeLeft <= 5 * 60) {
            timerDisplay.style.color = '#e74c3c';
            timerDisplay.classList.add('blink');
            sheetTimerDisplay.style.color = '#e74c3c';
            sheetTimerDisplay.classList.add('blink');
        }
        
        if (examTimeLeft <= 0) {
            clearInterval(examTimer);
            showResult();
        }
    }, 1000);
}

// 生成随机试卷（按题型分组+内部乱序）
function generateRandomExam() {
    currentExam = [];
    
    // 1. 单选题板块（100题，内部乱序）
    const singleChoices = [...examData.single_choice]
        .sort(() => Math.random() - 0.5)
        .slice(0, 100)
        .map(q => ({
            ...q,
            type: 'single_choice',
            shuffledOptions: shuffleOptions([...q.options]),
            cleanAnswer: q.answer
        }));
    
    // 2. 多选题板块（20题，内部乱序）
    const multiChoices = [...examData.multiple_choice]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(q => ({
            ...q,
            type: 'multiple_choice',
            shuffledOptions: shuffleOptions([...q.options]),
            cleanAnswer: q.answer.sort().join('、')
        }));
    
    // 3. 判断题板块（30题，内部乱序）
    const judgments = [...examData.true_false]
        .sort(() => Math.random() - 0.5)
        .slice(0, 30)
        .map(q => ({
            ...q,
            type: 'true_false',
            shuffledOptions: ['正确', '错误'],
            cleanAnswer: q.answer ? '正确' : '错误',
            explanation: q.explanation || "暂无解析"
        }));
    
    // 合并为板块化试卷
    currentExam = [...singleChoices, ...multiChoices, ...judgments];
    userAnswers = new Array(currentExam.length).fill(null);
}

// 初始化答题卡
function initAnswerSheet() {
    singleChoiceGrid.innerHTML = '';
    multiChoiceGrid.innerHTML = '';
    judgmentGrid.innerHTML = '';
    
    // 单选题答题卡
    for (let i = 0; i < 100; i++) {
        const answerItem = document.createElement('div');
        answerItem.classList.add('answer-sheet-item');
        answerItem.textContent = i + 1;
        answerItem.addEventListener('click', () => {
            currentQuestionIndex = i;
            exitAnswerSheet();
        });
        singleChoiceGrid.appendChild(answerItem);
    }
    
    // 多选题答题卡
    for (let i = 100; i < 120; i++) {
        const answerItem = document.createElement('div');
        answerItem.classList.add('answer-sheet-item');
        answerItem.textContent = i + 1;
        answerItem.addEventListener('click', () => {
            currentQuestionIndex = i;
            exitAnswerSheet();
        });
        multiChoiceGrid.appendChild(answerItem);
    }
    
    // 判断题答题卡
    for (let i = 120; i < 150; i++) {
        const answerItem = document.createElement('div');
        answerItem.classList.add('answer-sheet-item');
        answerItem.textContent = i + 1;
        answerItem.addEventListener('click', () => {
            currentQuestionIndex = i;
            exitAnswerSheet();
        });
        judgmentGrid.appendChild(answerItem);
    }
}

// 打乱选项顺序
function shuffleOptions(options) {
    return [...options].sort(() => Math.random() - 0.5);
}

// 显示当前题目
function showCurrentQuestion() {
    const question = currentExam[currentQuestionIndex];
    const totalQuestions = currentExam.length;
    
    // 更新进度条
    progressBar.style.width = `${(currentQuestionIndex + 1) / totalQuestions * 100}%`;
    progressText.textContent = `${currentQuestionIndex + 1}/${totalQuestions}`;
    
    // 设置板块标题
    let sectionTitle = '';
    if (currentQuestionIndex < 100) {
        sectionTitle = '单选题板块 (1-100)';
    } else if (currentQuestionIndex < 120) {
        sectionTitle = '多选题板块 (101-120)';
    } else {
        sectionTitle = '判断题板块 (121-150)';
    }
    sectionTitleElement.textContent = sectionTitle;
    
    // 设置题目类型和内容
    questionTypeElement.textContent = question.type === 'single_choice' ? '单选题' : 
                                    question.type === 'multiple_choice' ? '多选题' : '判断题';
    questionTextElement.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    
    // 清空并重建选项
    optionsContainer.innerHTML = '';
    question.shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        
        // 设置选中状态
        if (question.type === 'multiple_choice') {
            if (Array.isArray(userAnswers[currentQuestionIndex])) {
                optionElement.classList.toggle('selected', 
                    userAnswers[currentQuestionIndex].includes(option));
            }
        } else {
            optionElement.classList.toggle('selected', 
                userAnswers[currentQuestionIndex] === option);
        }
        
        optionElement.addEventListener('click', () => selectOption(option));
        optionsContainer.appendChild(optionElement);
    });
    
    // 更新答题卡状态
    updateAnswerSheet();
}

// 选择答案
function selectOption(selectedOption) {
    const currentQuestion = currentExam[currentQuestionIndex];
    
    if (currentQuestion.type === 'multiple_choice') {
        // 多选题处理
        if (!Array.isArray(userAnswers[currentQuestionIndex])) {
            userAnswers[currentQuestionIndex] = [];
        }
        
        const index = userAnswers[currentQuestionIndex].indexOf(selectedOption);
        if (index === -1) {
            userAnswers[currentQuestionIndex].push(selectedOption);
        } else {
            userAnswers[currentQuestionIndex].splice(index, 1);
        }
    } else {
        // 单选题和判断题处理
        userAnswers[currentQuestionIndex] = selectedOption;
    }
    
    // 刷新选项显示
    showCurrentQuestion();
}

// 显示答题卡
function showAnswerSheet() {
    examScreen.classList.add('hidden');
    answerSheetScreen.classList.remove('hidden');
    
    // 更新答题卡状态
    updateAnswerSheet();
    
    // 更新提交按钮状态
    submitBtn.disabled = !canSubmit;
    submitBtn.textContent = canSubmit ? '确认交卷' : '15分钟后可交卷';
}

// 更新答题卡状态
function updateAnswerSheet() {
    let answeredCount = 0;
    const allItems = [
        ...singleChoiceGrid.querySelectorAll('.answer-sheet-item'),
        ...multiChoiceGrid.querySelectorAll('.answer-sheet-item'),
        ...judgmentGrid.querySelectorAll('.answer-sheet-item')
    ];
    
    allItems.forEach((item, index) => {
        const userAnswer = userAnswers[index];
        let isAnswered = false;
        
        if (currentExam[index].type === 'multiple_choice') {
            isAnswered = Array.isArray(userAnswer) && userAnswer.length > 0;
        } else {
            isAnswered = userAnswer !== null && userAnswer !== undefined;
        }
        
        item.classList.toggle('answered', isAnswered);
        
        if (isAnswered) {
            answeredCount++;
        }
    });
    
    document.getElementById('answered-count').textContent = answeredCount;
}

// 退出答题卡
function exitAnswerSheet() {
    answerSheetScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');
    showCurrentQuestion();
}

// 处理交卷
function handleSubmit() {
    if (!canSubmit) {
        alert('考试开始15分钟后才能交卷！');
        return;
    }
    showResult();
}

// 显示结果
function showResult() {
    clearInterval(examTimer);
    
    // 计算各题型得分
    let singleChoiceScore = 0;
    let multiChoiceScore = 0;
    let judgmentScore = 0;
    
    currentExam.forEach((q, idx) => {
        const userAnswer = userAnswers[idx];
        
        if (q.type === 'single_choice') {
            // 单选题：每题0.5分
            singleChoiceScore += (userAnswer === q.cleanAnswer ? 0.5 : 0);
        } 
        else if (q.type === 'multiple_choice') {
            // 多选题：完全正确1分，部分正确0.5分
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
            // 判断题：每题1分
            judgmentScore += (userAnswer === q.cleanAnswer ? 1 : 0);
        }
    });
    
    // 计算总分
    score = singleChoiceScore + multiChoiceScore + judgmentScore;
    const isPassed = score >= 60;
    
    // 显示结果
    answerSheetScreen.classList.add('hidden');
    examScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    document.querySelector('.total-score').textContent = score.toFixed(1);
    document.querySelector('.pass-badge').textContent = isPassed ? '合格' : '不合格';
    document.querySelector('.pass-badge').className = isPassed ? 'pass-badge' : 'pass-badge fail-badge';
    
    // 更新各题型得分
    const singleChoiceElement = document.querySelectorAll('.detail-item')[0];
    singleChoiceElement.querySelector('.detail-progress').style.width = `${singleChoiceScore / 50 * 100}%`;
    singleChoiceElement.querySelector('.detail-score').textContent = `${singleChoiceScore.toFixed(1)}/50`;
    
    const multiChoiceElement = document.querySelectorAll('.detail-item')[1];
    multiChoiceElement.querySelector('.detail-progress').style.width = `${multiChoiceScore / 20 * 100}%`;
    multiChoiceElement.querySelector('.detail-score').textContent = `${multiChoiceScore.toFixed(1)}/20`;
    
    const judgmentElement = document.querySelectorAll('.detail-item')[2];
    judgmentElement.querySelector('.detail-progress').style.width = `${judgmentScore / 30 * 100}%`;
    judgmentElement.querySelector('.detail-score').textContent = `${judgmentScore.toFixed(1)}/30`;
}

// 比较两个数组是否相等
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// 显示错题
function showWrongAnswers() {
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.remove('hidden');
    wrongAnswersContainer.innerHTML = '<h3>错题解析</h3>';
    
    let wrongCount = 0;
    
    currentExam.forEach((q, idx) => {
        const userAnswer = userAnswers[idx];
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
            
            // 格式化答案显示
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
            wrongAnswersContainer.appendChild(wrongItem);
        }
    });
    
    document.getElementById('wrong-count').textContent = wrongCount;
}

// 获取题型文本
function getQuestionTypeText(type) {
    switch(type) {
        case 'single_choice': return '单选题';
        case 'multiple_choice': return '多选题';
        case 'true_false': return '判断题';
        default: return '';
    }
}

// 启动
document.addEventListener('DOMContentLoaded', init);
