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
    // 加载考试数据
    const response = await fetch('exam.json');
    examData = await response.json();
    
    // 设置事件监听器
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
}

// 开始考试
function startExam() {
    // 重置状态
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    
    // 生成随机试卷
    generateRandomExam();
    
    // 显示考试界面
    startScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');
    reviewScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.add('hidden');
    
    // 显示第一题
    showCurrentQuestion();
}

// 生成随机试卷
function generateRandomExam() {
    currentExam = [];
    
    // 随机选择40道选择题
    const shuffledChoices = [...examData.choices].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledChoices.slice(0, 40).map(q => ({
        ...q,
        type: 'choice',
        shuffledOptions: shuffleOptions([...q.options, q.answer])
    })));
    
    // 随机选择10道判断题
    const shuffledJudgments = [...examData.judgments].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledJudgments.slice(0, 10).map(q => ({
        ...q,
        type: 'judgment',
        shuffledOptions: ['正确', '错误']
    })));
    
    // 初始化用户答案数组
    userAnswers = new Array(currentExam.length).fill(null);
}

// 打乱选项顺序
function shuffleOptions(options) {
    return options.sort(() => 0.5 - Math.random());
}

// 显示当前题目
function showCurrentQuestion() {
    const question = currentExam[currentQuestionIndex];
    
    // 更新进度条
    progressBar.style.width = `${(currentQuestionIndex + 1) / currentExam.length * 100}%`;
    
    // 显示题目类型和内容
    questionTypeElement.textContent = question.type === 'choice' ? '选择题' : '判断题';
    questionTextElement.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    
    // 显示选项
    optionsContainer.innerHTML = '';
    question.shuffledOptions.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        
        // 如果用户已经选择了这个选项，添加选中样式
        if (userAnswers[currentQuestionIndex] === option) {
            optionElement.classList.add('selected');
        }
        
        optionElement.addEventListener('click', () => selectOption(option));
        optionsContainer.appendChild(optionElement);
    });
    
    // 更新导航按钮状态
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === currentExam.length - 1;
    
    // 如果是最后一题，将"下一题"改为"预览"
    if (currentQuestionIndex === currentExam.length - 1) {
        nextBtn.textContent = '预览';
    } else {
        nextBtn.textContent = '下一题';
    }
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

// 显示上一题
function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showCurrentQuestion();
    }
}

// 显示下一题
function showNextQuestion() {
    if (currentQuestionIndex < currentExam.length - 1) {
        currentQuestionIndex++;
        showCurrentQuestion();
    } else {
        // 显示预览界面
        showPreview();
    }
}

// 显示预览界面
function showPreview() {
    examScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    
    // 生成预览内容
    previewContainer.innerHTML = '';
    currentExam.forEach((question, index) => {
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.answer;
        
        if (userAnswer !== null) {
            previewItem.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        
        previewItem.innerHTML = `
            <p><strong>${index + 1}. ${question.question}</strong></p>
            <p>你的答案: ${userAnswer || '未作答'}</p>
            ${userAnswer !== null ? `<p>正确答案: ${question.answer}</p>` : ''}
        `;
        
        previewContainer.appendChild(previewItem);
    });
}

// 显示考试结果
function showResult() {
    // 计算分数
    score = 0;
    currentExam.forEach((question, index) => {
        if (userAnswers[index] === question.answer) {
            score += 2;
        }
    });
    
    // 显示结果界面
    reviewScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    // 显示分数
    scoreContainer.innerHTML = `
        <p>你的得分: <strong>${score} / 100</strong></p>
        <p>选择题: ${score / 2} / 50 题</p>
    `;
}

// 显示错题
function showWrongAnswers() {
    resultScreen.classList.add('hidden');
    wrongAnswersScreen.classList.remove('hidden');
    
    // 生成错题内容
    wrongAnswersContainer.innerHTML = '';
    currentExam.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        if (userAnswer !== question.answer) {
            const wrongAnswerItem = document.createElement('div');
            wrongAnswerItem.classList.add('wrong-answer-item');
            wrongAnswerItem.classList.add('incorrect');
            
            wrongAnswerItem.innerHTML = `
                <p><strong>${index + 1}. ${question.question}</strong></p>
                <p>你的答案: ${userAnswer || '未作答'}</p>
                <p>正确答案: ${question.answer}</p>
                ${question.explanation ? `<p>解析: ${question.explanation}</p>` : ''}
            `;
            
            wrongAnswersContainer.appendChild(wrongAnswerItem);
        }
    });
}

// 初始化应用
init();