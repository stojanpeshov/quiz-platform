package com.quizplatform.domain.question;

import java.util.List;

public final class MultipleChoiceQuestion extends Question {
    private List<String> options;
    private List<Integer> correctAnswers;

    public List<String> getOptions() { return options; }
    public void setOptions(List<String> options) { this.options = options; }

    public List<Integer> getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(List<Integer> correctAnswers) { this.correctAnswers = correctAnswers; }
}
