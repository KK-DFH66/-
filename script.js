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
let isMobile = /Mobi|Android/i.test(navigator.userAgent);

// DOM元素
const startScreen = document.getElementById('start-screen');
const examScreen = document.getElementById('exam-screen');
const answerSheetScreen = document.getElementById('answer-sheet-screen');
const resultScreen = document.getElementById('result-screen');
const wrongAnswersScreen = document.getElementById('wrong-answers-screen');

const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn');
const viewWrongBtn = document.getElementById('view-wrong-btn');
const newExamBtn = document.getElementById('new-exam-btn');
const backToResultBtn = document.getElementById('back-to-result-btn');
const answerSheetBtn = document.getElementById('answer-sheet-btn');
const backToExamBtn = document.getElementById('back-to-exam-btn');

const sectionTitleElement = document.getElementById('section-title');
const questionTypeElement = document.querySelector('.question-type');
const questionTextElement = document.querySelector('.question-text');
const optionsContainer = document.querySelector('.options-container');
const progressBar = document.querySelector('.progress');
const progressText = document.querySelector('.progress-text');
const singleChoiceSheet = document.getElementById('single-choice-sheet');
const multiChoiceSheet = document.getElementById('multi-choice-sheet');
const judgmentSheet = document.getElementById('judgment-sheet');
const answeredCountElement = document.getElementById('answered-count');

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
        submitBtn.addEventListener('click', handleSubmit);
        viewWrongBtn.addEventListener('click', showWrongAnswers);
        newExamBtn.addEventListener('click', startExam);
        backToResultBtn.addEventListener('click', () => {
            wrongAnswersScreen.classList.add('hidden');
            resultScreen.classList.remove('hidden');
        });
        answerSheetBtn.addEventListener('click', showAnswerSheet);
        backToExamBtn.addEventListener('click', () => {
            answerSheetScreen.classList.add('hidden');
            examScreen.classList.remove('hidden');
        });

        // 添加触摸/滚轮事件
        if (isMobile) {
            examScreen.addEventListener('touchstart', handleTouchStart, false);
            examScreen.addEventListener('touchend', handleTouchEnd, false);
        } else {
            examScreen.addEventListener('wheel', handleWheel, { passive: false });
        }

    } catch (error) {
        console.error('初始化错误:', error);
        startBtn.disabled = true;
        startBtn.textContent = '系统初始化失败';
        alert(`系统初始化失败：${error.message}`);
    }
}

// 触摸事件处理
function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    
    if (Math.abs(diffX) > 50) { // 滑动阈值
        if (diffX > 0) {
            showPreviousQuestion();
        } else {
            showNextQuestion();
        }
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
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    examTimeLeft = 90 * 60;
    canSubmit = false;
    generateRandomExam();
    
    clearInterval(examTimer);
    document.getElementById('timer-display')?.remove();
    
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
    updateAnswerSheet();
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
    
    // 更新答题卡当前题目标记
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
    updateAnswerSheet();
}

// 上一题
function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showCurrentQuestion();
    }
}

// 下一题
function showNextQuestion() {
    if (currentQuestionIndex < currentExam.length - 1) {
        currentQuestionIndex++;
        showCurrentQuestion();
    }
}

// 显示答题卡
function showAnswerSheet() {
    examScreen.classList.add('hidden');
    answerSheetScreen.classList.remove('hidden');
    
    // 更新已回答数量
    const answeredCount = userAnswers.filter(answer => 
        answer !== null && (Array.isArray(answer) ? answer.length > 0 : true)
        .length;
    answeredCountElement.textContent = answeredCount;
}

// 更新答题卡
function updateAnswerSheet() {
    singleChoiceSheet.innerHTML = '';
    multiChoiceSheet.innerHTML = '';
    judgmentSheet.innerHTML = '';
    
    currentExam.forEach((question, index) => {
        const sheetNumber = document.createElement('div');
        sheetNumber.classList.add('sheet-number');
        sheetNumber.textContent = index + 1;
        
        // 标记已回答的题目
        const isAnswered = question.type === 'multiple_choice' 
            ? Array.isArray(userAnswers[index]) && userAnswers[index].length > 0
            : userAnswers[index] !== null;
        
        if (isAnswered) {
            sheetNumber.classList.add('answered');
        }
        
        // 标记当前题目
        if (index === currentQuestionIndex) {
            sheetNumber.classList.add('current');
        }
        
        // 添加点击事件
        sheetNumber.addEventListener('click', () => {
            currentQuestionIndex = index;
            answerSheetScreen.classList.add('hidden');
            examScreen.classList.remove('hidden');
            showCurrentQuestion();
        });
        
        // 添加到对应的答题卡区域
        if (index < 100) {
            singleChoiceSheet.appendChild(sheetNumber);
        } else if (index < 120) {
            multiChoiceSheet.appendChild(sheetNumber);
        } else {
            judgmentSheet.appendChild(sheetNumber);
        }
    });
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
    examScreen.classList.add('hidden');
    answerSheetScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    const scoreContainer = document.querySelector('.score-container');
    scoreContainer.innerHTML = `
        <div class="result-header">
            <h2>考试成绩</h2>
            <div class="score-summary">
                <span class="total-score">${score.toFixed(1)}</span>
                <span class="pass-badge ${isPassed ? '' : 'fail-badge'}">
                    ${isPassed ? '合格' : '不合格'}
                </span>
            </div>
        </div>
        <div class="score-details">
            <div class="detail-item">
                <span class="detail-label">单选题</span>
                <div class="detail-bar">
                    <div class="detail-progress" style="width: ${singleChoiceScore / 50 * 100}%"></div>
                </div>
                <span class="detail-score">${singleChoiceScore.toFixed(1)}/50</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">多选题</span>
                <div class="detail-bar">
                    <div class="detail-progress" style="width: ${multiChoiceScore / 20 * 100}%"></div>
                </div>
                <span class="detail-score">${multiChoiceScore.toFixed(1)}/20</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">判断题</span>
                <div class="detail-bar">
                    <div class="detail-progress" style="width: ${judgmentScore / 30 * 100}%"></div>
                </div>
                <span class="detail-score">${judgmentScore.toFixed(1)}/30</span>
            </div>
        </div>
    `;
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
