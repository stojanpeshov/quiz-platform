package com.quizplatform.domain.question;

public final class TrueFalseQuestion extends Question {
    private boolean correctAnswer;

    public boolean getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(boolean correctAnswer) { this.correctAnswer = correctAnswer; }
}
