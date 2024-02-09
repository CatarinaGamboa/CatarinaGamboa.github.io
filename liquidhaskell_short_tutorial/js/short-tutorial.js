function checkAnswer(questionNumber) {
    const selectedAnswer = document.querySelector(`input[name=q${questionNumber}]:checked`).value;
    const correctAnswer = document.getElementById(`correctAnswer${questionNumber}`).value;
    const resultElement = document.getElementById(`result${questionNumber}`);

    if (selectedAnswer === correctAnswer) {
       resultElement.textContent = 'Correct!';
    } else {
       resultElement.textContent = 'Incorrect. Please try again.';
    }
}

function toggleCollapsibleDiv() {
    var div = document.getElementById('collapsibleDiv');
    div.style.display = (div.style.display === 'none') ? 'block' : 'none';
}



function toggleCollapsible(number) {
    var div = document.getElementById(`collapsibleDiv${number}`);
    div.style.display = (div.style.display === 'none') ? 'block' : 'none';
}
