// 全局变量
let examData = {};
let currentExam = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;

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
        // 加载考试数据
        const response = await fetch('exam.json');
        if (!response.ok) throw new Error('题库加载失败');
        examData = await response.json();
        
        // 验证数据格式
        if (!examData.single_choice || !examData.true_false) {
            throw new Error('题库格式错误，缺少题目类型');
        }

        // 绑定事件监听器
        startBtn.addEventListener('click', startExam);
        prevBtn.addEventListener('click', showPreviousQuestion);
        nextBtn.addEventListener('click', showNextQuestion);
        submitBtn.addEventListener('click', showResult);
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
        alert(`系统初始化失败: ${error.message}`);
    }
}

// 开始考试
function startExam() {
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    generateRandomExam();
    
    // 重置界面状态
    startScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');
    reviewScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.add('hidden');
    
    showCurrentQuestion();
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
        cleanAnswer: q.answer.startsWith('A、') ? q.answer : `A、${q.answer}` // 统一答案格式
    })));
    
    // 随机选择10道判断题
    const shuffledJudgments = [...examData.true_false].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledJudgments.slice(0, 10).map(q => ({
        ...q,
        type: 'judgment',
        shuffledOptions: ['正确', '错误'],
        cleanAnswer: q.answer ? '正确' : '错误',
        explanation: q.explanation || "暂无详细解析"
    })));
    
    userAnswers = new Array(currentExam.length).fill(null);
}

// 打乱选项顺序
function shuffleOptions(options) {
    return [...options].sort(() => 0.5 - Math.random());
}

// 显示当前题目
function showCurrentQuestion() {
    const question = currentExam[currentQuestionIndex];
    
    // 更新进度条
    progressBar.style.width = `${(currentQuestionIndex + 1) / currentExam.length * 100}%`;
    
    // 显示题目信息
    questionTypeElement.textContent = question.type === 'choice' ? '选择题' : '判断题';
    questionTextElement.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    
    // 显示选项
    optionsContainer.innerHTML = '';
    question.shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        
        // 标记已选答案
        if (userAnswers[currentQuestionIndex] === option) {
            optionElement.classList.add('selected');
        }
        
        optionElement.addEventListener('click', () => selectOption(option));
        optionsContainer.appendChild(optionElement);
    });
    
    // 更新导航按钮状态
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === currentExam.length - 1 ? '预览' : '下一题';
}

// 选择选项
function selectOption(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    
    // 更新选项样式
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.textContent === selectedOption) {
            option.classList.add('selected');
        }
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
        // 确保是最后一题时触发预览
        showPreview();
    }
}

// 显示预览
function showPreview() {
    // 切换界面
    examScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    
    // 生成预览内容
    previewContainer.innerHTML = '';
    currentExam.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.type === 'choice' 
            ? question.cleanAnswer 
            : question.cleanAnswer;
        const isCorrect = userAnswer === correctAnswer;
        
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        if (userAnswer !== null) {
            previewItem.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        
        previewItem.innerHTML = `
            <div class="question-header">
                <strong>第${index + 1}题 (${question.type === 'choice' ? '选择题' : '判断题'})</strong>
                <span class="result-tag">${isCorrect ? '✓ 正确' : '✗ 错误'}</span>
            </div>
            <p class="question-text">${question.question}</p>
            <p class="user-answer">你的答案: ${userAnswer || '未作答'}</p>
            <p class="correct-answer">正确答案: ${correctAnswer}</p>
            ${question.explanation ? `<div class="explanation">解析: ${question.explanation}</div>` : ''}
        `;
        
        previewContainer.appendChild(previewItem);
    });
    
    // 滚动到顶部
    window.scrollTo(0, 0);
}

// 显示结果
function showResult() {
    // 计算分数
    score = currentExam.reduce((total, question, index) => {
        const correctAnswer = question.type === 'choice' 
            ? question.cleanAnswer 
            : question.cleanAnswer;
        return total + (userAnswers[index] === correctAnswer ? 2 : 0);
    }, 0);
    
    // 切换界面
    reviewScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    // 显示分数
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
    
    currentExam.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.type === 'choice' 
            ? question.cleanAnswer 
            : question.cleanAnswer;
        
        if (userAnswer !== correctAnswer) {
            const wrongItem = document.createElement('div');
            wrongItem.classList.add('wrong-item');
            wrongItem.innerHTML = `
                <div class="wrong-question">
                    <strong>第${index + 1}题</strong>
                    <p>${question.question}</p>
                </div>
                <div class="wrong-answer">
                    <p>你的答案: <span class="user-wrong">${userAnswer || '未作答'}</span></p>
                    <p>正确答案: <span class="correct-highlight">${correctAnswer}</span></p>
                </div>
                ${question.explanation ? `<div class="wrong-explanation">解析: ${question.explanation}</div>` : ''}
            `;
            wrongAnswersContainer.appendChild(wrongItem);
        }
    });
}

// 启动初始化
document.addEventListener('DOMContentLoaded', init);
