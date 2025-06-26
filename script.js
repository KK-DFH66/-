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
        const response = await fetch('exam.json');
        if (!response.ok) throw new Error('题库加载失败');
        examData = await response.json();
        
        if (!examData.single_choice || !examData.true_false) {
            throw new Error('题库格式错误');
        }

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
    }
}

// 开始考试
function startExam() {
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    generateRandomExam();
    
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
    
    // 处理选择题
    const shuffledChoices = [...examData.single_choice].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledChoices.slice(0, 40).map(q => {
        // 找到完整答案内容（如"A、选项内容"）
        const fullAnswer = q.options.find(opt => 
            opt.startsWith(q.answer.includes('、') ? q.answer : `${q.answer}、`)
        ) || q.answer;
        
        return {
            ...q,
            type: 'choice',
            shuffledOptions: shuffleOptions([...q.options]),
            cleanAnswer: fullAnswer  // 存储完整答案内容
        };
    }));
    
    // 处理判断题
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

// 显示预览（不显示正确答案）
function showPreview() {
    examScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    previewContainer.innerHTML = '';
    
    currentExam.forEach((question, index) => {
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        
        previewItem.innerHTML = `
            <div class="question-header">
                <strong>第${index + 1}题 (${question.type === 'choice' ? '选择题' : '判断题'})</strong>
            </div>
            <p class="question-text">${question.question}</p>
            <p class="user-answer">你的答案: ${userAnswers[index] || '未作答'}</p>
        `;
        previewContainer.appendChild(previewItem);
    });
}

// 显示结果
function showResult() {
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

// 显示错题（显示完整正确答案）
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
