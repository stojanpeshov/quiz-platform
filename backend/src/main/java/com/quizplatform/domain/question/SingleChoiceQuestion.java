package com.quizplatform.domain.question;

import java.util.List;

public final class SingleChoiceQuestion extends Question {
    private List<String> options;
    private int correctAnswer;

    public List<String> getOptions() { return options; }
    public void setOptions(List<String> options) { this.options = options; }

    public int getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(int correctAnswer) { this.correctAnswer = correctAnswer; }
}
