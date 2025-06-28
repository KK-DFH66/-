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

        // 添加触摸事件监听（移动端）
        questionContainer.addEventListener('touchstart', handleTouchStart, false);
        questionContainer.addEventListener('touchend', handleTouchEnd, false);
        
        // 添加滚轮事件监听（电脑端）
        questionContainer.addEventListener('wheel', handleWheel, { passive: false });

    } catch (error) {
        console.error('初始化错误:', error);
        startBtn.disabled = true;
        startBtn.textContent = '系统初始化失败';
        alert(`系统初始化失败：${error.message}`);
    }
}

// 电脑端滚轮事件处理
function handleWheel(event) {
    // 阻止默认滚动行为
    event.preventDefault();
    
    // 向下滚动 - 下一题
    if (event.deltaY > 0) {
        if (currentQuestionIndex < currentExam.length - 1) {
            currentQuestionIndex++;
            showCurrentQuestion();
        }
    } 
    // 向上滚动 - 上一题
    else if (event.deltaY < 0) {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showCurrentQuestion();
        }
    }
}

// 触摸开始事件处理（移动端）
function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

// 触摸结束事件处理（移动端）
function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
}

// 处理滑动动作（移动端）
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

// ...（其余所有函数保持不变，无需修改）...

// 启动
document.addEventListener('DOMContentLoaded', init);
