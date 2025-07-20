import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
    getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc,
    deleteDoc, writeBatch, query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

//firebase config(replace with your config)
const firebaseConfig = {
    apiKey: "  ",
    authDomain: "  ",
    projectId: "   ",
    storageBucket: "   ",
    messagingSenderId:"",
    appId: "   ",
    measurementId: "   ",
};

//initialise firebase app and services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//global state variables
let currentUser = null;
let quizQuestions = [];
let activeQuiz = {};
let quizTimer = null;
let quizToDeleteId = null;

// DOM Elements
const DOMElements = {
    appLoader: document.getElementById('app-loader'),
    views: document.querySelectorAll('.container > section'),
    userDisplayNameNav: document.getElementById('user-display-name'),
    logoutBtnNav: document.getElementById('logout-btn-nav'),
    welcomeMsg: document.getElementById('welcome-message'),
    yourQuizList: document.getElementById('your-quiz-list'),
    otherQuizList: document.getElementById('other-quiz-list'),
};

//this function runs once the entire HTML document has been loaded
//it is the main entry point for the application's js
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            //if a user is logged in
            currentUser = user;
            updateUIForUser(user);
            switchView('dashboard-view');
            loadQuizzes();
        } else {
            //if no user is logged in
            currentUser = null;
            updateUIForUser(null);
            switchView('login-view');
        }
        //it hides the main app loader once auth state is confirmed
        DOMElements.appLoader.style.opacity = '0';
        setTimeout(() => { DOMElements.appLoader.classList.add('d-none'); }, 300);
    });
    addEventListeners();
});

//attaching event listeners to make the html interactive
//onclick="" in the html itself
function addEventListeners() {
    document.getElementById('toggle-auth-mode-link').addEventListener('click', e => {
        e.preventDefault();
        toggleAuthMode();
    });
    document.getElementById('email-signup-btn').addEventListener('click', handleSignUp);
    document.getElementById('email-signin-btn').addEventListener('click', handleSignIn);
    document.getElementById('login-google-btn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('logout-btn-nav').addEventListener('click', handleLogout);
    document.getElementById('create-quiz-btn').addEventListener('click', showCreateQuizView);
    document.getElementById('back-to-dashboard-btn').addEventListener('click', navigateToDashboard);
    document.getElementById('cancel-edit-btn').addEventListener('click', navigateToDashboard);
    document.getElementById('save-quiz-btn').addEventListener('click', saveQuiz);
    document.getElementById('save-manual-question-btn').addEventListener('click', addManualQuestion);
    document.getElementById('confirm-delete-btn').addEventListener('click', executeDeleteQuiz);
    document.getElementById('submit-quiz-btn').addEventListener('click', submitQuiz);
    document.getElementById('generate-questions-btn').addEventListener('click', generateAiQuestions);
    document.getElementById('generate-answer-btn').addEventListener('click', generateAiAnswerAndOptions);

    DOMElements.yourQuizList.addEventListener('click', handleDashboardCardClick);
    DOMElements.otherQuizList.addEventListener('click', handleDashboardCardClick);
}

function handleDashboardCardClick(e) {
    const target = e.target;
    const quizCard = target.closest('.quiz-card-main');
    const quizId = quizCard?.dataset.quizId;

    if (!quizId) return;

    if (target.matches('.btn-edit')) {
        showEditQuizView(quizId);
    } else if (target.matches('.btn-delete')) {
        confirmDeleteQuiz(quizId);
    } else if (quizCard) {
        startQuiz(quizId);
    }
}

//ui management
function switchView(viewId) {
    DOMElements.views.forEach(view => view.classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');
}

//updates the navigation bar and welcome messages based on user login state
function updateUIForUser(user) {
    if (user) {
        const displayName = user.displayName || 'User';
        DOMElements.userDisplayNameNav.textContent = displayName;
        DOMElements.welcomeMsg.textContent = `Welcome, ${displayName}!`;
        DOMElements.userDisplayNameNav.classList.remove('d-none');
        DOMElements.logoutBtnNav.classList.remove('d-none');
    } else {
        DOMElements.userDisplayNameNav.classList.add('d-none');
        DOMElements.logoutBtnNav.classList.add('d-none');
    }
}

//it toggles the authentication form between sign up and sign in mode
function toggleAuthMode() {
    const link = document.getElementById('toggle-auth-mode-link');
    const isSignUp = link.textContent.includes('Sign Up');

    document.getElementById('auth-error').textContent = '';
    document.getElementById('display-name-container').classList.toggle('d-none', !isSignUp);
    document.getElementById('email-signin-btn').classList.toggle('d-none', isSignUp);
    document.getElementById('email-signup-btn').classList.toggle('d-none', !isSignUp);
    document.getElementById('login-title').textContent = isSignUp ? 'Create an Account' : 'Welcome to QuickQuiz';
    link.textContent = isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
}

function toggleButtonSpinner(btn, show) {
    if (show) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
        btn.disabled = true;
    } else {
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
        }
        btn.disabled = false;
    }
}

//authentication functions
//handles the user sign-up process with email,password,and display name
async function handleSignUp() {
    const displayName = document.getElementById('display-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authError = document.getElementById('auth-error');
    const signupBtn = document.getElementById('email-signup-btn');

    if (!displayName || !email || !password) {
        authError.textContent = 'Please fill in all fields.';
        return;
    }

    toggleButtonSpinner(signupBtn, true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
    } catch (error) {
        authError.textContent = getFriendlyAuthError(error.code);
    } finally {
        toggleButtonSpinner(signupBtn, false);
    }
}

//handles the user sign-in process with email and password
async function handleSignIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authError = document.getElementById('auth-error');
    const signinBtn = document.getElementById('email-signin-btn');

    if (!email || !password) {
        authError.textContent = 'Please enter email and password.';
        return;
    }

    toggleButtonSpinner(signinBtn, true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        authError.textContent = getFriendlyAuthError(error.code);
    } finally {
        toggleButtonSpinner(signinBtn, false);
    }
}

//handles the google sign in process using a popup
async function handleGoogleSignIn() {
    const googleBtn = document.getElementById('login-google-btn');
    toggleButtonSpinner(googleBtn, true);
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
        document.getElementById('auth-error').textContent = getFriendlyAuthError(error.code);
    } finally {
        toggleButtonSpinner(googleBtn, false);
    }
}

//handles the user logout process
function handleLogout() {
    signOut(auth).catch(error => console.error("Logout Error:", error));
}

//converts firebase auth error codes into user-friendly messages
function getFriendlyAuthError(code) {
    const errors = {
        'auth/email-already-in-use': 'This email address is already in use.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-not-found': 'Invalid email or password.',
        'auth/wrong-password': 'Invalid email or password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/popup-closed-by-user': 'Sign-in process cancelled.'
    };
    return errors[code] || 'An unknown error occurred. Please try again.';
}

//dashboard and quiz loading
//fetches all quizzes from firestore and renders them on the dashboard and separating them into your quizzes and other quizzes
async function loadQuizzes() {
    if (!currentUser) return;

    DOMElements.yourQuizList.innerHTML = '<div class="text-center w-100"><div class="spinner-border text-white"></div></div>';
    DOMElements.otherQuizList.innerHTML = '<div class="text-center w-100"><div class="spinner-border text-white"></div></div>';

    try {
        //fetch quizzes and user's past attempts in parallel for efficiency
        const quizzesPromise = getDocs(collection(db, "quizzes"));
        const attemptsPromise = getDocs(query(collection(db, "quizAttempts"), where("userId", "==", currentUser.uid)));
        const [quizzesSnapshot, attemptsSnapshot] = await Promise.all([quizzesPromise, attemptsPromise]);
        //process attempts into an easily searchable map
        const userAttempts = {};
        attemptsSnapshot.forEach(doc => {
            const attempt = doc.data();
            if (!userAttempts[attempt.quizId] || attempt.attemptedAt.toMillis() > userAttempts[attempt.quizId].attemptedAt.toMillis()) {
                userAttempts[attempt.quizId] = attempt;
            }
        });

        let yourQuizzesHtml = '';
        let otherQuizzesHtml = '';

        //sort quizzes by creation date, newest first
        const sortedQuizzes = quizzesSnapshot.docs.sort((a, b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));

        sortedQuizzes.forEach(doc => {
            const quiz = { id: doc.id, ...doc.data() };
            const attempt = userAttempts[quiz.id];
            const isCreator = currentUser.uid === quiz.creatorId;
            const cardHtml = createQuizCardHTML(quiz, attempt, isCreator);
            if (isCreator) yourQuizzesHtml += cardHtml;
            else otherQuizzesHtml += cardHtml;
        });

        DOMElements.yourQuizList.innerHTML = yourQuizzesHtml || '<p class="text-center text-white-50 w-100">You haven\'t created any quizzes yet.</p>';
        DOMElements.otherQuizList.innerHTML = otherQuizzesHtml || '<p class="text-center text-white-50 w-100">No other quizzes available.</p>';

    } catch (error) {
        console.error("Error loading quizzes: ", error);
        DOMElements.yourQuizList.innerHTML = '<p class="text-center text-danger w-100">Could not load quizzes.</p>';
        DOMElements.otherQuizList.innerHTML = '';
    }
}

//generates the HTML for a single quiz card
//it returns the HTML string for the quiz card
function createQuizCardHTML(quiz, attempt, isCreator) {
    const attemptInfo = attempt ?
        `<p class="card-text fw-bold mb-0 mt-2">Last Score: ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)</p>` :
        `<p class="card-text text-muted mb-0 mt-2">Not attempted yet</p>`;

    const controls = isCreator ? `
        <div class="mt-3 pt-2 px-3 pb-3 border-top d-flex justify-content-end gap-2">
            <button class="btn btn-secondary btn-sm btn-edit">Edit</button>
            <button class="btn btn-danger btn-sm btn-delete">Delete</button>
        </div>
    ` : '';

    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 quiz-card-main" data-quiz-id="${quiz.id}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${quiz.title}</h5>
                    <p class="card-text flex-grow-1">${quiz.description}</p>
                    <p class="card-text mt-auto mb-0"><small class="text-muted">By: ${isCreator ? 'You' : (quiz.creatorName || 'Anonymous')}</small></p>
                    ${attemptInfo}
                </div>
                ${controls}
            </div>
        </div>
    `;
}

//generates the HTML for a single quiz card
//it returns the HTML string for the quiz card
function showCreateQuizView() {
    switchView('create-quiz-view');
    document.getElementById('create-edit-title').textContent = 'Create a New Quiz';
    document.getElementById('editing-quiz-id').value = '';
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-description').value = '';
    document.getElementById('quiz-time-limit').value = '0';
    document.getElementById('cancel-edit-btn').classList.add('d-none');
    quizQuestions = [];
    renderCreatorQuestions();
}

//fetches quiz data and displays the view for editing an existing quiz
async function showEditQuizView(quizId) {
    switchView('create-quiz-view');
    document.getElementById('create-edit-title').textContent = 'Edit Quiz';
    document.getElementById('cancel-edit-btn').classList.remove('d-none');

    try {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        const quizData = quizDoc.data();

        document.getElementById('editing-quiz-id').value = quizId;
        document.getElementById('quiz-title').value = quizData.title;
        document.getElementById('quiz-description').value = quizData.description;
        document.getElementById('quiz-time-limit').value = quizData.timeLimit || 0;

        const questionsSnapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));
        quizQuestions = questionsSnapshot.docs.map(d => d.data());
        renderCreatorQuestions();
    } catch (error) {
        console.error("Error loading quiz for editing:", error);
        alert("Could not load the quiz for editing.");
        navigateToDashboard();
    }
}

//saves a new quiz or updates an existing one in Firestore
async function saveQuiz() {
    const quizId = document.getElementById('editing-quiz-id').value;
    const isEditing = !!quizId;
    const saveBtn = document.getElementById('save-quiz-btn');

    const quizData = {
        title: document.getElementById('quiz-title').value,
        description: document.getElementById('quiz-description').value,
        timeLimit: parseInt(document.getElementById('quiz-time-limit').value) || 0,
        creatorId: currentUser.uid,
        creatorName: currentUser.displayName
    };

    if (!quizData.title || quizQuestions.length === 0) {
        alert('Please provide a title and at least one question.');
        return;
    }

    toggleButtonSpinner(saveBtn, true);
    try {
        if (isEditing) {
            //saves a new quiz or updates an existing one in firestore
            const quizDocRef = doc(db, 'quizzes', quizId);
            await updateDoc(quizDocRef, { title: quizData.title, description: quizData.description, timeLimit: quizData.timeLimit });

            //overwrite the questions subcollection
            const oldQuestions = await getDocs(collection(db, `quizzes/${quizId}/questions`));
            const batch = writeBatch(db);
            oldQuestions.forEach(d => batch.delete(d.ref));
            quizQuestions.forEach(q => {
                const newQuestionRef = doc(collection(db, `quizzes/${quizId}/questions`));
                batch.set(newQuestionRef, q);
            });
            await batch.commit();
            alert('Quiz updated!');
        } else {
            //create new quiz
            quizData.createdAt = Timestamp.now();
            const quizDocRef = await addDoc(collection(db, 'quizzes'), quizData);
            //add questions to the subcollection
            const batch = writeBatch(db);
            quizQuestions.forEach(q => {
                const newQuestionRef = doc(collection(db, `quizzes/${quizDocRef.id}/questions`));
                batch.set(newQuestionRef, q);
            });
            await batch.commit();
            alert('Quiz saved!');
        }
        navigateToDashboard();
    } catch (error) {
        console.error("Error saving quiz:", error);
        alert("Failed to save the quiz.");
    } finally {
        toggleButtonSpinner(saveBtn, false);
    }
}

// this fn adds a manually entered question to the temporary questions array
function addManualQuestion() {
    const questionText = document.getElementById('manual-question-text').value;
    const options = Array.from(document.querySelectorAll('.manual-option')).map(input => input.value);
    const correctAnswer = document.getElementById('manual-correct-answer').value;

    if (!questionText || !correctAnswer || options.some(opt => !opt)) {
        alert('Please fill out the question, the correct answer, and all four option fields.');
        return;
    }

    const correctAnswerIndex = options.indexOf(correctAnswer);
    if (correctAnswerIndex === -1) {
        alert('The correct answer must match one of the options.');
        return;
    }

    quizQuestions.push({ question: questionText, options, correctAnswerIndex });
    renderCreatorQuestions();

    //hide modal and reset form
    const addQuestionModal = bootstrap.Modal.getInstance(document.getElementById('add-question-modal'));
    addQuestionModal.hide();

    //manually reset fields since there is no form element
    document.getElementById('manual-question-text').value = '';
    document.getElementById('manual-correct-answer').value = '';
    document.querySelectorAll('.manual-option').forEach(input => input.value = '');
}

//renders the list of questions in the quiz creator view
function renderCreatorQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    if (quizQuestions.length === 0) {
        container.innerHTML = '<p class="text-center text-muted mt-3">No questions added yet.</p>';
        return;
    }
    quizQuestions.forEach((q, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'card mb-3 bg-light';
        questionCard.innerHTML = `
            <div class="card-body position-relative">
                 <button type="button" class="btn-close" data-index="${index}" style="position: absolute; top: 10px; right: 10px;"></button>
                <p class="mb-2"><strong>Q${index + 1}:</strong> ${q.question}</p>
                <ul class="list-group">
                    ${q.options.map((opt, i) => `<li class="list-group-item ${i === q.correctAnswerIndex ? 'list-group-item-success fw-bold' : ''}">${opt}</li>`).join('')}
                </ul>
            </div>
        `;
        questionCard.querySelector('.btn-close').addEventListener('click', (e) => {
            const questionIndex = parseInt(e.target.dataset.index);
            quizQuestions.splice(questionIndex, 1);
            renderCreatorQuestions();
        });
        container.appendChild(questionCard);
    });
}

//quiz deletion
//shows a confirmation modal before deleting a quiz
function confirmDeleteQuiz(quizId) {
    quizToDeleteId = quizId;
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
    deleteModal.show();
}

//deleting a quiz document, its questions subcollection, and all associated attempts
async function executeDeleteQuiz() {
    if (!quizToDeleteId) return;
    const deleteBtn = document.getElementById('confirm-delete-btn');
    toggleButtonSpinner(deleteBtn, true);

    try {
        const quizId = quizToDeleteId; //use local copy

        //delete associated attempts
        const attemptsQuery = query(collection(db, 'quizAttempts'), where("quizId", "==", quizId));
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const questionsSnapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));

        const batch = writeBatch(db);
        attemptsSnapshot.forEach(doc => batch.delete(doc.ref));
        questionsSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(doc(db, 'quizzes', quizId));
        await batch.commit();

        alert('Quiz deleted successfully.');
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('delete-confirm-modal'));
        deleteModal.hide();
        loadQuizzes();
    } catch (error) {
        console.error("Error deleting quiz:", error);
        alert("Failed to delete the quiz.");
    } finally {
        toggleButtonSpinner(deleteBtn, false);
        quizToDeleteId = null;
    }
}

//quiz taking
//fetches quiz data and starts the quiz-taking process
async function startQuiz(quizId) {
    try {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        const questionsSnapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));

        activeQuiz = {
            id: quizId,
            ...quizDoc.data(),
            questions: questionsSnapshot.docs.map(d => d.data())
        };

        document.getElementById('quiz-title-display').innerText = activeQuiz.title;
        document.getElementById('quiz-description-display').innerText = activeQuiz.description;
        renderQuizForTaking();
        startTimer();
        switchView('take-quiz-view');
    } catch (error) {
        console.error("Error starting quiz:", error);
        alert("Could not start the quiz. It may have been deleted.");
    }
}

//renders the questions and options for the user to answer
function renderQuizForTaking() {
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = activeQuiz.questions.map((q, index) => `
        <div class="card mb-3">
            <div class="card-body">
                <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
                ${q.options.map((option, optionIndex) => `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${index}" id="q-${index}-o-${optionIndex}" value="${optionIndex}">
                        <label class="form-check-label" for="q-${index}-o-${optionIndex}">${option}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

//starts the countdown timer for a timed quiz
function startTimer() {
    clearInterval(quizTimer);
    const timerContainer = document.getElementById('timer-container');
    if (activeQuiz.timeLimit <= 0) {
        timerContainer.innerHTML = '';
        return;
    }

    let timeRemaining = activeQuiz.timeLimit * 60;
    const updateTimerDisplay = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerContainer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    updateTimerDisplay();
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            document.getElementById('results-title').textContent = "Time's Up!";
            submitQuiz();
        }
    }, 1000);
}

//submits the user's answers, calculates the score, and displays the results
async function submitQuiz() {
    clearInterval(quizTimer);
    let score = 0;
    activeQuiz.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="question-${index}"]:checked`);
        if (selected && parseInt(selected.value) === q.correctAnswerIndex) {
            score++;
        }
    });

    const totalQuestions = activeQuiz.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    try {
        await addDoc(collection(db, 'quizAttempts'), {
            userId: currentUser.uid,
            quizId: activeQuiz.id,
            quizTitle: activeQuiz.title,
            score,
            totalQuestions,
            percentage,
            attemptedAt: Timestamp.now()
        });

        document.getElementById('score-display').innerText = `Your Score: ${score} / ${totalQuestions}`;
        const progressBar = document.getElementById('score-progress-bar');
        progressBar.style.width = `${percentage}%`;
        progressBar.innerText = `${percentage}%`;
        switchView('results-view');
    } catch (error) {
        console.error("Error submitting quiz attempt:", error);
        alert("There was an error saving your score.");
    }
}

//ai powered features
//calls the Gemini API to generate content
//takes parameter 'prompt' to send to the AI model
//takes parameter 'expectJson' to to expect a JSON response
//returns the parsed response from api
async function callGemini(prompt, expectJson = true) {
    //replace with your gemini api key(api key must be secured and should never be exposed in js, put it here for experimenting)
    const apiKey = "YOUR_GEMINI_API_KEY";
    
    if (apiKey === "YOUR_GEMINI_API_KEY") {
        throw new Error("API Key for Gemini is missing.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    };
    if (expectJson) {
        payload.generationConfig = { responseMimeType: "application/json" };
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`API call failed: ${response.status}`);

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    return expectJson ? JSON.parse(text) : text;
}

//handles the ai question generation button click
async function generateAiQuestions() {
    const topic = document.getElementById('ai-topic').value;
    const numQuestions = document.getElementById('ai-num-questions').value;
    const genBtn = document.getElementById('generate-questions-btn');

    if (!topic) {
        alert("Please enter a topic.");
        return;
    }

    toggleButtonSpinner(genBtn, true);
    try {
        const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}". Each question must have 4 options. Format it as a JSON array of objects, where each object has "question" (string), "options" (array of 4 strings), and "correctAnswerIndex" (integer 0-3).`;
        const generated = await callGemini(prompt);
        quizQuestions.push(...generated);
        renderCreatorQuestions();
    } catch (error) {
        console.error("AI Generation Error:", error);
        alert("Failed to generate questions. The AI may be unavailable or the API key is invalid.");
    } finally {
        toggleButtonSpinner(genBtn, false);
    }
}

//handles the ai answer and options generation button click
async function generateAiAnswerAndOptions() {
    const question = document.getElementById('manual-question-text').value;
    const genBtn = document.getElementById('generate-answer-btn');

    if (!question) {
        alert("Please provide the question first.");
        return;
    }

    toggleButtonSpinner(genBtn, true);
    try {
        const prompt = `For the question "${question}", provide the correct answer and three plausible incorrect options. Return a JSON object with "correctAnswer" (string) and "distractors" (array of 3 strings).`;
        const result = await callGemini(prompt);

        if (!result.correctAnswer || !Array.isArray(result.distractors)) {
            throw new Error("AI returned data in an unexpected format.");
        }

        document.getElementById('manual-correct-answer').value = result.correctAnswer;
        //shuffling the correct answer with the distractors
        const allOptions = [result.correctAnswer, ...result.distractors].sort(() => Math.random() - 0.5);

        document.querySelectorAll('.manual-option').forEach((input, i) => {
            if (allOptions[i]) input.value = allOptions[i];
        });

    } catch (error) {
        console.error("Answer Generation Error:", error);
        alert("Failed to generate an answer and options.");
    } finally {
        toggleButtonSpinner(genBtn, false);
    }
}

//navigation function to return to the dashboard and refresh the quiz list
function navigateToDashboard() {
    switchView('dashboard-view');
    loadQuizzes();
}