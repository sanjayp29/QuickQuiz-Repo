# 🚀 QuickQuiz

QuickQuiz is a dynamic, AI-powered web application that allows users to create, take, and share quizzes. It features a clean, user-friendly interface and leverages modern web technologies to provide a seamless and interactive experience for both quiz creators and takers.

## ✨ Features

* **🔐 User Authentication:** Secure user sign-up and sign-in using email/password or Google accounts, powered by Firebase Authentication.
* **🤖 AI-Powered Quiz Generation:** Automatically generate quiz questions on any topic using the Google Gemini API. This includes generating entire quizzes or just providing answers and distractor options for manually created questions.
* **🛠️ Full CRUD Functionality:** Users can create, read, update, and delete their own quizzes.
* **✍️ Manual Quiz Creation:** Manually add, edit, and remove questions with custom options and correct answers.
* **⏱️ Timed Quizzes:** Set optional time limits for quizzes to challenge users.
* **📊 Interactive Dashboard:** View and manage your own quizzes, as well as discover and take quizzes created by other users on the platform.
* **📈 Results Tracking:** Instantly see your score, percentage, and performance after completing a quiz.
* **📱 Responsive Design:** A fully responsive and mobile-first layout built with Bootstrap 5 ensures a great experience on all devices.

## 💻 Technologies Used

* **Frontend:**
    * HTML5
    * CSS3 (with Bootstrap 5 for styling and components)
    * JavaScript (ES6 Modules)
* **Backend & Database:**
    * Firebase Authentication for user management.
    * Firebase Firestore for a real-time, NoSQL database.
* **AI:**
    * Google Gemini API for intelligent question and answer generation.

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### ✅ Prerequisites

You will need to have a Firebase project and a Google Gemini API key.

* **Firebase:** Create a new project at the [Firebase Console](https://console.firebase.google.com/).
* **Gemini API:** Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### ⚙️ Installation

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/sanjayp29/quickquiz-repo.git](https://github.com/sanjayp29/quickquiz-repo.git)
    ```

2.  **Configure Firebase**
    * Open `script.js`.
    * Find the `firebaseConfig` object and replace the placeholder values with your own Firebase project's configuration keys. You can find these in your Firebase project settings.
    ```javascript
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID"
    };
    ```

3.  **Configure Gemini API Key**
    * In `script.js`, find the `callGemini` function.
    * Replace `"YOUR_GEMINI_API_KEY"` with your actual Gemini API key.
    ```javascript
    async function callGemini(prompt, expectJson = true) {
        // IMPORTANT: For production, this key should be secured on a backend server,
        // not exposed in client-side JavaScript.
        const apiKey = "YOUR_GEMINI_API_KEY";
        // ...
    }
    ```

4.  **Run the application**
    * Simply open the `index.html` file in your web browser. A local server (like the Live Server extension in VS Code) is recommended for development.

## 📁 File Structure

```
.
├── index.html      # The main HTML structure of the single-page application.
├── script.js       # All application logic, Firebase integration, and API calls.
├── style.css       # Custom styles, theme, and animations for the application.
└── README.md       # This file.
```
<img width="2048" height="1720" alt="quickquiz-homescreen" src="https://github.com/user-attachments/assets/fc3f04a8-6188-464e-a9db-ef67043fc433" />

