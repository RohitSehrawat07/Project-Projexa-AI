// js/questions.js
const QUIZ_QUESTIONS = {
  easy: [
    { q: "What does HTML stand for?", options: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Multi Language"], correct: 0, difficulty: "easy" },
    { q: "Choose the correct HTML element for the largest heading:", options: ["<heading>", "<h1>", "<head>", "<h6>"], correct: 1, difficulty: "easy" },
    { q: "What is the correct HTML element for inserting a line break?", options: ["<break>", "<lb>", "<br>", "<b>"], correct: 2, difficulty: "easy" },
    { q: "Inside which HTML element do we put the JavaScript?", options: ["<scripting>", "<js>", "<javascript>", "<script>"], correct: 3, difficulty: "easy" },
    { q: "Which character is used to indicate an end tag?", options: ["*", "^", "/", "<"], correct: 2, difficulty: "easy" }
  ],
  medium: [
    { q: "How do you write 'Hello World' in an alert box?", options: ["msg('Hello World');", "alertBox('Hello World');", "alert('Hello World');", "msgBox('Hello World');"], correct: 2, difficulty: "medium" },
    { q: "How do you create a function in JavaScript?", options: ["function myFunction()", "function:myFunction()", "function = myFunction()", "let myFunction = function"], correct: 0, difficulty: "medium" },
    { q: "How to write an IF statement in JavaScript?", options: ["if i = 5 then", "if i == 5 then", "if (i == 5)", "if i = 5"], correct: 2, difficulty: "medium" },
    { q: "How does a WHILE loop start?", options: ["while (i <= 10)", "while i = 1 to 10", "while (i <= 10; i++)", "while i <= 10"], correct: 0, difficulty: "medium" },
    { q: "How can you add a comment in a JavaScript?", options: ["'This is a comment", "<!--This is a comment-->", "//This is a comment", "/*This is a comment"], correct: 2, difficulty: "medium" }
  ],
  hard: [
    { q: "What is the correct way to write a JavaScript array?", options: ["var colors = 1 = ('red'), 2 = ('green'), 3 = ('blue')", "var colors = ['red', 'green', 'blue']", "var colors = (1:'red', 2:'green', 3:'blue')", "var colors = 'red', 'green', 'blue'"], correct: 1, difficulty: "hard" },
    { q: "What is the algorithmic time complexity of a purely linear search?", options: ["O(log n)", "O(n)", "O(1)", "O(n^2)"], correct: 1, difficulty: "hard" },
    { q: "Which event occurs when the user clicks on an HTML element?", options: ["onchange", "onmouseover", "onmouseclick", "onclick"], correct: 3, difficulty: "hard" },
    { q: "How do you declare a JavaScript variable safely in ES6?", options: ["v carName;", "variable carName;", "let carName;", "declare carName;"], correct: 2, difficulty: "hard" },
    { q: "Which operator is used to assign a strict equality comparison?", options: ["==", "+=", "===", "="], correct: 2, difficulty: "hard" }
  ]
};
