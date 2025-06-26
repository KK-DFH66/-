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

// 全局函数定义
window.selectOption = function(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.textContent === selectedOption) {
            option.classList.add('selected');
        }
    });
};

// 去除选项前缀的辅助函数
function cleanOptionText(option) {
    return option.replace(/^[A-Z]、/, '').trim();
}

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

        // 检查第一道题格式
        const sampleChoice = examData.single_choice[0];
        if (!sampleChoice.options || !sampleChoice.answer) {
            throw new Error('选择题缺少必要字段');
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

        startBtn.disabled = false;
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
        shuffledOptions: shuffleOptions([...q.options].map(cleanOptionText)),
        cleanAnswer: cleanOptionText(q.answer)
    })));
    
    // 随机选择10道判断题
    const shuffledJudgments = [...examData.true_false].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledJudgments.slice(0, 10).map(q => ({
        ...q,
        type: 'judgment',
        shuffledOptions: ['正确', '错误'],
        cleanAnswer: q.answer ? '正确' : '错误',
        explanation: q.explanation || '暂无解析'
    })));
    
    userAnswers = new Array(currentExam.length).fill(null);
}

function shuffleOptions(options) {
    return options.sort(() => 0.5 - Math.random());
}

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
    nextBtn.disabled = currentQuestionIndex === currentExam.length - 1;
    nextBtn.textContent = currentQuestionIndex === currentExam.length - 1 ? '预览' : '下一题';
}

function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showCurrentQuestion();
    }
}

function showNextQuestion() {
    if (currentQuestionIndex < currentExam.length - 1) {
        currentQuestionIndex++;
        showCurrentQuestion();
    } else {
        showPreview();
    }
}

function showPreview() {
    examScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    previewContainer.innerHTML = '';
    currentExam.forEach((question, index) => {
        const previewItem = document.createElement('div');
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === (question.type === 'choice' ? question.cleanAnswer : question.cleanAnswer);
        
        previewItem.classList.add('preview-item');
        if (userAnswer !== null) {
            previewItem.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        
        previewItem.innerHTML = `
            <p><strong>${index + 1}. ${question.question}</strong></p>
            <p>你的答案: ${userAnswer || '未作答'}</p>
            ${userAnswer !== null ? `<p>正确答案: ${question.type === 'choice' ? question.cleanAnswer : question.cleanAnswer}</p>` : ''}
        `;
        previewContainer.appendChild(previewItem);
    });
}

function showResult() {
    score = currentExam.reduce((total, question, index) => {
        const correctAnswer = question.type === 'choice' ? question.cleanAnswer : question.cleanAnswer;
        return total + (userAnswers[index] === correctAnswer ? 2 : 0);
    }, 0);
    
    reviewScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    scoreContainer.innerHTML = `
        <p>你的得分: <strong>${score} / 100</strong></p>
        <p>答对题数: ${score / 2} / 50</p>
    `;
}

function showWrongAnswers() {
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.remove('hidden');
    wrongAnswersContainer.innerHTML = '';
    
    currentExam.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.type === 'choice' ? question.cleanAnswer : question.cleanAnswer;
        
        if (userAnswer !== correctAnswer) {
            const wrongAnswerItem = document.createElement('div');
            wrongAnswerItem.classList.add('wrong-answer-item', 'incorrect');
            wrongAnswerItem.innerHTML = `
                <p><strong>${index + 1}. ${question.question}</strong></p>
                <p>你的答案: ${userAnswer || '未作答'}</p>
                <p>正确答案: ${correctAnswer}</p>
                ${question.explanation ? `<p>解析: ${question.explanation}</p>` : ''}
            `;
            wrongAnswersContainer.appendChild(wrongAnswerItem);
        }
    });
}

// 启动初始化
document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('系统启动失败:', error);
        startBtn.textContent = '点击重试';
        startBtn.onclick = () => window.location.reload();
    });
});
