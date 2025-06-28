// 全局变量
let examData = {};
let currentExam = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let examTimer;
let examTimeLeft = 90 * 60; // 90分钟倒计时（单位：秒）
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
        
        if (!examData.single_choice || !examData.multiple_choice || !examData.true_false) {
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
    examTimeLeft = 90 * 60; // 重置倒计时为90分钟
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
    
    // 15分钟后允许交卷
    setTimeout(() => {
        canSubmit = true;
        submitBtn.disabled = false;
    }, 15 * 60 * 1000);
    
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
    
    // 随机选择100道单选题
    const shuffledSingleChoices = [...examData.single_choice].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledSingleChoices.slice(0, 100).map(q => ({
        ...q,
        type: 'single_choice',
        shuffledOptions: shuffleOptions([...q.options]),
        cleanAnswer: q.answer
    })));
    
    // 随机选择20道多选题
    const shuffledMultiChoices = [...examData.multiple_choice].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledMultiChoices.slice(0, 20).map(q => ({
        ...q,
        type: 'multiple_choice',
        shuffledOptions: shuffleOptions([...q.options]),
        cleanAnswer: q.answer.sort().join('、') // 将数组答案转换为排序后的字符串
    })));
    
    // 随机选择30道判断题
    const shuffledJudgments = [...examData.true_false].sort(() => 0.5 - Math.random());
    currentExam.push(...shuffledJudgments.slice(0, 30).map(q => ({
        ...q,
        type: 'true_false',
        shuffledOptions: ['正确', '错误'],
        cleanAnswer: q.answer ? '正确' : '错误',
        explanation: q.explanation || "暂无解析"
    })));
    
    // 打乱所有题目顺序
    currentExam = shuffleQuestions(currentExam);
    
    // 初始化用户答案数组
    userAnswers = new Array(currentExam.length).fill(null).map(() => []);
}

// 打乱题目顺序
function shuffleQuestions(questions) {
    return [...questions].sort(() => 0.5 - Math.random());
}

// 打乱选项顺序
function shuffleOptions(options) {
    return [...options].sort(() => 0.5 - Math.random());
}

// 显示当前题目
function showCurrentQuestion() {
    const question = currentExam[currentQuestionIndex];
    
    progressBar.style.width = `${(currentQuestionIndex + 1) / currentExam.length * 100}%`;
    
    // 设置题目类型显示
    let typeText = '';
    if (question.type === 'single_choice') typeText = '单选题';
    else if (question.type === 'multiple_choice') typeText = '多选题';
    else typeText = '判断题';
    
    questionTypeElement.textContent = typeText;
    questionTextElement.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    
    optionsContainer.innerHTML = '';
    question.shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        
        // 多选题和单选题的选择状态处理
        if (question.type === 'multiple_choice') {
            if (Array.isArray(userAnswers[currentQuestionIndex])) {
                optionElement.classList.toggle('selected', userAnswers[currentQuestionIndex].includes(option));
            }
        } else {
            if (userAnswers[currentQuestionIndex] === option) {
                optionElement.classList.add('selected');
            }
        }
        
        optionElement.addEventListener('click', () => selectOption(option));
        optionsContainer.appendChild(optionElement);
    });
    
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === currentExam.length - 1 ? '预览' : '下一题';
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
        
        // 更新选项选中状态
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.toggle('selected', 
                userAnswers[currentQuestionIndex].includes(opt.textContent));
        });
    } else {
        // 单选题和判断题处理
        userAnswers[currentQuestionIndex] = selectedOption;
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.toggle('selected', opt.textContent === selectedOption);
        });
    }
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
        const isAnswered = question.type === 'multiple_choice' 
            ? userAnswer && userAnswer.length > 0
            : userAnswer !== null && userAnswer !== undefined;

        // 添加未作答高亮样式
        if (!isAnswered) {
            previewItem.classList.add('unanswered');
        }

        // 格式化用户答案显示
        let formattedUserAnswer = '';
        if (question.type === 'multiple_choice') {
            formattedUserAnswer = Array.isArray(userAnswer) 
                ? userAnswer.join('、') 
                : '未选择';
        } else {
            formattedUserAnswer = userAnswer || '未选择';
        }

        previewItem.innerHTML = `
            <div class="question-header">
                <strong>第${index + 1}题 (${getQuestionTypeText(question.type)})</strong>
                ${!isAnswered ? '<span class="unanswered-tag">未作答</span>' : ''}
            </div>
            <p class="question-text">${question.question}</p>
            <p class="user-answer">你的答案: ${formattedUserAnswer}</p>
        `;
        previewContainer.appendChild(previewItem);
    });
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
    
    // 计算得分
    let singleChoiceScore = 0;
    let multiChoiceScore = 0;
    let judgmentScore = 0;
    
    currentExam.forEach((q, idx) => {
        const userAnswer = userAnswers[idx];
        
        if (q.type === 'single_choice') {
            // 单选题计分逻辑：正确得0.5分
            singleChoiceScore += (userAnswer === q.cleanAnswer ? 0.5 : 0);
        } 
        else if (q.type === 'multiple_choice') {
            // 多选题计分逻辑
            if (!Array.isArray(userAnswer)) return;
            
            const correctAnswers = q.answer.sort();
            const userSelected = [...userAnswer].sort();
            
            // 完全正确得1分，部分正确得0.5分
            if (arraysEqual(correctAnswers, userSelected)) {
                multiChoiceScore += 1;
            } else if (userSelected.some(ans => correctAnswers.includes(ans))) {
                multiChoiceScore += 0.5;
            }
        } 
        else if (q.type === 'true_false') {
            // 判断题计分逻辑：正确得1分
            judgmentScore += (userAnswer === q.cleanAnswer ? 1 : 0);
        }
    });
    
    score = singleChoiceScore + multiChoiceScore + judgmentScore;
    const isPassed = score >= 60;
    
    reviewScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    scoreContainer.innerHTML = `
        <h3>考试结果</h3>
        <p class="total-score">总分: <span>${score.toFixed(1)}</span> / 100</p>
        <p class="pass-status">${isPassed ? '合格' : '不合格'}</p>
        <div class="score-detail">
            <p>单选题: ${singleChoiceScore.toFixed(1)} / 50 (共100题)</p>
            <p>多选题: ${multiChoiceScore.toFixed(1)} / 20 (共20题)</p>
            <p>判断题: ${judgmentScore.toFixed(1)} / 30 (共30题)</p>
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
    wrongAnswersContainer.innerHTML = '<h3>错题回顾</h3>';
    
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
}

// 启动
document.addEventListener('DOMContentLoaded', init);
