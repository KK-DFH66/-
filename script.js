// 全局变量
let examData = {};
let currentExam = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let examTimer;
let examTimeLeft = 60 * 60; // 60分钟倒计时（单位：秒）
let canSubmit = false; // 是否允许交卷

// DOM元素
const startScreen = document.getElementById('start-screen');
const examScreen = document.getElementById('exam-screen');
const reviewScreen = document.getElementById('review-screen');
const resultScreen = document.getElementById('result-screen');
const wrongAnswersScreen = document.getElementById('wrong-answers-screen');

const startBtn = document.getElementById('start-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const viewWrongBtn = document.getElementById('view-wrong-btn');
const newExamBtn = document.getElementById('new-exam-btn');
const backToResultBtn = document.getElementById('back-to-result-btn');

const questionTypeElement = document.querySelector('.question-type');
const questionTextElement = document.querySelector('.question-text');
const optionsContainer = document.querySelector('.options-container');
const progressBar = document.querySelector('.progress');
const previewContainer = document.querySelector('.preview-container');
const scoreContainer = document.querySelector('.score-container');
const wrongAnswersContainer = document.querySelector('.wrong-answers-container');

// 初始化
async function init() {
    try {
        const response = await fetch('exam.json');
        if (!response.ok) throw new Error('题库加载失败');
        examData = await response.json();
        
        if (!examData.single_choice || !examData.true_false) {
            throw new Error('题库格式错误');
        }

        startBtn.addEventListener('click', startExam);
        prevBtn.addEventListener('click', showPreviousQuestion);
        nextBtn.addEventListener('click', showNextQuestion);
        submitBtn.addEventListener('click', handleSubmit);
        viewWrongBtn.addEventListener('click', showWrongAnswers);
        newExamBtn.addEventListener('click', startExam);
        backToResultBtn.addEventListener('click', () => {
            wrongAnswersScreen.classList.add('hidden');
            resultScreen.classList.remove('hidden');
        });

    } catch (error) {
        console.error('初始化错误:', error);
        startBtn.disabled = true;
        startBtn.textContent = '系统初始化失败';
    }
}

// 开始考试
function startExam() {
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    examTimeLeft = 60 * 60; // 重置倒计时
    canSubmit = false; // 重置交卷权限
    generateRandomExam();
    
    // 清除旧计时器
    clearInterval(examTimer);
    document.getElementById('timer-display')?.remove();
    document.getElementById('review-timer-display')?.remove();
    
    startScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');
    reviewScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.add('hidden');
    
    // 5分钟后允许交卷
    setTimeout(() => {
        canSubmit = true;
        submitBtn.disabled = false;
    }, 5 * 60 * 1000);
    
    startTimer();
    showCurrentQuestion();
}

// 启动计时器
function startTimer() {
    // 考试界面计时器
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    examScreen.insertBefore(timerDisplay, document.querySelector('.question-container'));

    // 预览界面计时器
    const reviewTimerDisplay = document.createElement('div');
    reviewTimerDisplay.id = 'review-timer-display';
    reviewScreen.insertBefore(reviewTimerDisplay, document.querySelector('.preview-container'));

    examTimer = setInterval(() => {
        examTimeLeft--;
        const minutes = Math.floor(examTimeLeft / 60);
        const seconds = examTimeLeft % 60;
        const timeString = `剩余时间: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        timerDisplay.innerHTML = timeString;
        reviewTimerDisplay.innerHTML = timeString;
        
        // 最后5分钟红色警示
        if (examTimeLeft <= 5 * 60) {
            timerDisplay.style.color = '#e74c3c';
            timerDisplay.classList.add('blink');
            reviewTimerDisplay.style.color = '#e74c3c';
            reviewTimerDisplay.classList.add('blink');
        }
        
        // 时间结束自动交卷
        if (examTimeLeft <= 0) {
            clearInterval(examTimer);
            showResult();
        }
    }, 1000);
}

// 生成随机试卷
function generateRandomExam() {
    currentExam = [];
    
    // 随机选择40道选择题
    const shuffledChoices = [...examData.single_choice].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledChoices.slice(0, 40).map(q => ({
        ...q,
        type: 'choice',
        shuffledOptions: shuffleOptions([...q.options]),
        cleanAnswer: q.answer.includes('、') ? q.answer : `${q.answer.split('、')[0]}、${q.answer}`
    })));
    
    // 随机选择10道判断题
    const shuffledJudgments = [...examData.true_false].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledJudgments.slice(0, 10).map(q => ({
        ...q,
        type: 'judgment',
        shuffledOptions: ['正确', '错误'],
        cleanAnswer: q.answer ? '正确' : '错误',
        explanation: q.explanation || "暂无解析"
    })));
    
    userAnswers = new Array(currentExam.length).fill(null);
}

// 打乱选项
function shuffleOptions(options) {
    return [...options].sort(() => 0.5 - Math.random());
}

// 显示当前题目
function showCurrentQuestion() {
    const question = currentExam[currentQuestionIndex];
    
    progressBar.style.width = `${(currentQuestionIndex + 1) / currentExam.length * 100}%`;
    questionTypeElement.textContent = question.type === 'choice' ? '选择题' : '判断题';
    questionTextElement.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    
    optionsContainer.innerHTML = '';
    question.shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        
        if (userAnswers[currentQuestionIndex] === option) {
            optionElement.classList.add('selected');
        }
        
        optionElement.addEventListener('click', () => selectOption(option));
        optionsContainer.appendChild(optionElement);
    });
    
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === currentExam.length - 1 ? '预览' : '下一题';
}

// 选择答案
function selectOption(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.toggle('selected', opt.textContent === selectedOption);
    });
}

// 上一题
function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showCurrentQuestion();
    }
}

// 下一题/预览
function showNextQuestion() {
    if (currentQuestionIndex < currentExam.length - 1) {
        currentQuestionIndex++;
        showCurrentQuestion();
    } else {
        showPreview();
    }
}

// 显示预览（含退出按钮和未作答标记）
function showPreview() {
    examScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    previewContainer.innerHTML = '';
    
    // 添加退出预览按钮
    const exitPreviewBtn = document.createElement('button');
    exitPreviewBtn.textContent = '退出预览';
    exitPreviewBtn.id = 'exit-preview-btn';
    exitPreviewBtn.addEventListener('click', () => {
        reviewScreen.classList.add('hidden');
        examScreen.classList.remove('hidden');
    });
    previewContainer.appendChild(exitPreviewBtn);
    
    // 生成预览内容
    currentExam.forEach((question, index) => {
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        const userAnswer = userAnswers[index];
        const isAnswered = userAnswer !== null;

        // 添加未作答高亮样式
        if (!isAnswered) {
            previewItem.classList.add('unanswered');
            previewItem.style.backgroundColor = '#fff8e1'; // 浅黄色背景
            previewItem.style.borderLeft = '4px solid #ffc107'; // 橙色左侧边框
        } else {
            previewItem.style.backgroundColor = '#ffffff'; // 白色背景
            previewItem.style.borderLeft = '4px solid #4CAF50'; // 绿色左侧边框
        }

        previewItem.innerHTML = `
            <div class="question-header">
                <strong>第${index + 1}题 (${question.type === 'choice' ? '选择题' : '判断题'})</strong>
                ${!isAnswered ? '<span class="unanswered-tag">未作答</span>' : ''}
            </div>
            <p class="question-text">${question.question}</p>
            <p class="user-answer">${isAnswered ? `你的答案: ${userAnswer}` : '未选择答案'}</p>
        `;
        previewContainer.appendChild(previewItem);
    });
}

// 处理交卷
function handleSubmit() {
    if (!canSubmit) {
        alert('考试开始5分钟后才能交卷！');
        return;
    }
    showResult();
}

// 显示结果
function showResult() {
    clearInterval(examTimer);
    score = currentExam.reduce((total, q, idx) => {
        return total + (userAnswers[idx] === q.cleanAnswer ? 2 : 0);
    }, 0);
    
    reviewScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    scoreContainer.innerHTML = `
        <h3>考试结果</h3>
        <p class="total-score">总分: <span>${score}</span> / 100</p>
        <div class="score-detail">
            <p>选择题: ${Math.floor(score/2)} / 40</p>
            <p>判断题: ${score%2} / 10</p>
        </div>
    `;
}

// 显示错题
function showWrongAnswers() {
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.remove('hidden');
    wrongAnswersContainer.innerHTML = '<h3>错题回顾</h3>';
    
    currentExam.forEach((q, idx) => {
        if (userAnswers[idx] !== q.cleanAnswer) {
            const wrongItem = document.createElement('div');
            wrongItem.classList.add('wrong-item');
            wrongItem.innerHTML = `
                <div class="wrong-question">
                    <strong>第${idx + 1}题 (${q.type === 'choice' ? '选择题' : '判断题'})</strong>
                    <p>${q.question}</p>
                </div>
                <div class="wrong-answer">
                    <p>你的答案: <span class="user-wrong">${userAnswers[idx] || '未作答'}</span></p>
                    <p>正确答案: <span class="correct-answer">${q.cleanAnswer}</span></p>
                </div>
                ${q.explanation ? `<div class="explanation">解析: ${q.explanation}</div>` : ''}
            `;
            wrongAnswersContainer.appendChild(wrongItem);
        }
    });
}

// 启动
document.addEventListener('DOMContentLoaded', init);
