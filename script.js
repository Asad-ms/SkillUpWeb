// --- Wait for the HTML to load before running the script ---
document.addEventListener('DOMContentLoaded', () => {

    // --- TOPIC METADATA ---
    const topics = {
        javascript: { name: "JavaScript", icon: 'JS', color: 'bg-yellow-400' },
        python: { name: "Python", icon: 'Py', color: 'bg-blue-500' },
        java: { name: "Java", icon: 'J', color: 'bg-red-500' },
        c: { name: "C", icon: 'C', color: 'bg-gray-600' },
        cpp: { name: "C++", icon: 'C++', color: 'bg-sky-600' },
        html: { name: "HTML", icon: '</>', color: 'bg-orange-500' },
        sql: { name: "SQL", icon: 'DB', color: 'bg-teal-500' }
    };

    // --- DOM ELEMENT REFERENCES ---
    const screens = {
        'selection-screen': document.getElementById('selection-screen'),
        'difficulty-screen': document.getElementById('difficulty-screen'),
        'quiz-screen': document.getElementById('quiz-screen'),
        'results-screen': document.getElementById('results-screen')
    };
    const topicButtonsContainer = document.getElementById('topic-buttons');
    const difficultyTopicName = document.getElementById('difficulty-topic-name');
    const difficultyButtons = document.getElementById('difficulty-buttons');
    const loadingContainer = document.getElementById('loading-container');
    const quizHeader = document.getElementById('quiz-header');
    const scoreDisplay = document.getElementById('score-display');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const nextBtn = document.getElementById('next-btn');
    const finalScore = document.getElementById('final-score');
    const feedbackAnalysis = document.getElementById('feedback-analysis');
    const feedbackList = document.getElementById('feedback-list');
    const perfectScoreFeedback = document.getElementById('perfect-score-feedback');
    const backToTopicsBtn = document.getElementById('back-to-topics-btn');
    const changeDifficultyBtn = document.getElementById('change-difficulty-btn');
    const restartBtn = document.getElementById('restart-btn');

    // --- STATE VARIABLES ---
    let currentTopic = '';
    let currentDifficulty = '';
    let currentQuestionIndex = 0;
    let score = 0;
    let questions = [];
    let wrongAnswers = [];

    // --- FUNCTIONS ---
    
    /**
     * Hides all screens and shows the one with the specified ID.
     * @param {string} screenId - The ID of the screen to show.
     */
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        screens[screenId].classList.remove('hidden');
    }

    /**
     * Sets the current topic and navigates to the difficulty selection screen.
     * @param {string} topicKey - The key of the selected topic (e.g., 'javascript').
     */
    function selectTopic(topicKey) {
        currentTopic = topicKey;
        difficultyTopicName.textContent = `For ${topics[topicKey].name}`;
        showScreen('difficulty-screen');
    }

    /**
     * Generates quiz questions by calling our own Netlify Function.
     * @param {string} topic - The programming language/topic.
     * @param {string} difficulty - The chosen difficulty.
     * @returns {Promise<Array|null>} A promise that resolves to an array of question objects.
     */
    async function generateQuestions(topic, difficulty) {
        // This is the endpoint for our Netlify Function.
        const functionUrl = '/.netlify/functions/generate-questions';

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, difficulty }) // Send topic and difficulty to our function
            });

            if (!response.ok) {
                throw new Error(`Request to Netlify Function failed with status ${response.status}`);
            }

            const result = await response.json();

            // The structure from Google is nested inside the 'body' of our function's response.
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                const generatedData = JSON.parse(result.candidates[0].content.parts[0].text);
                return generatedData.questions;
            } else {
                // If the structure is not as expected, log the actual result for debugging
                console.error("Unexpected API response structure:", result);
                throw new Error("Invalid response structure from API.");
            }
        } catch (error) {
            console.error("Error generating questions:", error);
            alert("Sorry, we couldn't generate questions at the moment. Please try again later.");
            return null;
        }
    }

    /**
     * Starts the quiz by fetching questions and displaying the quiz screen.
     * @param {string} difficulty - The selected difficulty level.
     */
    async function startQuiz(difficulty) {
        currentDifficulty = difficulty;
        
        loadingContainer.classList.remove('hidden');
        difficultyButtons.querySelectorAll('button').forEach(b => b.disabled = true);

        const generatedQuestions = await generateQuestions(topics[currentTopic].name, difficulty);

        loadingContainer.classList.add('hidden');
        difficultyButtons.querySelectorAll('button').forEach(b => b.disabled = false);

        if (!generatedQuestions || generatedQuestions.length === 0) {
            showScreen('difficulty-screen');
            return;
        }

        questions = generatedQuestions;
        currentQuestionIndex = 0;
        score = 0;
        wrongAnswers = [];
        
        showScreen('quiz-screen');
        displayQuestion();
    }

    /**
     * Displays the current question and its answer options.
     */
    function displayQuestion() {
        optionsContainer.innerHTML = '';
        feedbackContainer.innerHTML = '';
        nextBtn.classList.add('hidden');

        const question = questions[currentQuestionIndex];
        quizHeader.textContent = `${topics[currentTopic].name} (${currentDifficulty})`;
        scoreDisplay.textContent = `Score: ${score} / ${questions.length}`;
        questionText.textContent = question.question;

        question.options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-btn w-full text-left p-4 bg-slate-100 border border-slate-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all';
            button.onclick = () => checkAnswer(option, button);
            optionsContainer.appendChild(button);
        });
    }

    /**
     * Checks the selected answer, provides feedback, and updates the score.
     * @param {string} selectedOption - The text of the selected option.
     * @param {HTMLElement} selectedButton - The button element that was clicked.
     */
    function checkAnswer(selectedOption, selectedButton) {
        const question = questions[currentQuestionIndex];
        const correctAnswer = question.answer;
        const isCorrect = selectedOption === correctAnswer;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === correctAnswer) {
                btn.className += ' bg-green-200 border-green-400';
            }
        });

        if (isCorrect) {
            score++;
            selectedButton.className += ' bg-green-200 border-green-400';
            feedbackContainer.innerHTML = `<p class="text-green-600 font-bold text-lg">Correct!</p>`;
        } else {
            wrongAnswers.push(question.subtopic);
            selectedButton.className += ' bg-red-200 border-red-400';
            feedbackContainer.innerHTML = `<p class="text-red-600 font-bold text-lg">Wrong! Correct answer: ${correctAnswer}</p>`;
        }
        
        scoreDisplay.textContent = `Score: ${score} / ${questions.length}`;
        nextBtn.classList.remove('hidden');
    }
    
    /**
     * Moves to the next question or shows the results if the quiz is over.
     */
    function handleNextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            displayQuestion();
        } else {
            showResults();
        }
    }

    /**
     * Displays the final results screen with feedback.
     */
    function showResults() {
        showScreen('results-screen');
        finalScore.textContent = `You scored ${score} out of ${questions.length}!`;
        
        if (wrongAnswers.length > 0) {
            feedbackAnalysis.classList.remove('hidden');
            perfectScoreFeedback.classList.add('hidden');
            
            const topicCounts = wrongAnswers.reduce((acc, topic) => {
                acc[topic] = (acc[topic] || 0) + 1;
                return acc;
            }, {});

            const sortedTopics = Object.keys(topicCounts).sort((a, b) => topicCounts[b] - topicCounts[a]);
            
            feedbackList.innerHTML = '';
            sortedTopics.forEach(topic => {
                const li = document.createElement('li');
                li.textContent = topic;
                feedbackList.appendChild(li);
            });
        } else {
             feedbackAnalysis.classList.add('hidden');
             perfectScoreFeedback.classList.remove('hidden');
        }
    }

    /**
     * Initializes the application by creating topic buttons and showing the selection screen.
     */
    function initialize() {
        topicButtonsContainer.innerHTML = '';
        for (const topicKey in topics) {
            const topic = topics[topicKey];
            const button = document.createElement('button');
            button.className = `topic-btn p-5 rounded-lg text-white text-xl font-bold flex flex-col items-center justify-center transition-all hover:scale-105 ${topic.color}`;
            button.innerHTML = `<span class="text-3xl mb-2 font-mono">${topic.icon}</span> ${topic.name}`;
            button.onclick = () => selectTopic(topicKey);
            topicButtonsContainer.appendChild(button);
        }
        showScreen('selection-screen');
    }

    // --- EVENT LISTENERS ---
    nextBtn.addEventListener('click', handleNextQuestion);
    restartBtn.addEventListener('click', initialize);
    backToTopicsBtn.addEventListener('click', () => showScreen('selection-screen'));
    changeDifficultyBtn.addEventListener('click', () => showScreen('difficulty-screen'));
    
    difficultyButtons.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const difficulty = button.dataset.difficulty;
            if (difficulty) {
                startQuiz(difficulty);
            }
        });
    });

    // --- INITIALIZE THE APP ---
    initialize();
});
