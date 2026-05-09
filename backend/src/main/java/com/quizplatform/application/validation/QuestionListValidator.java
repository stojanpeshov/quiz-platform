package com.quizplatform.application.validation;

import com.quizplatform.domain.question.MultipleChoiceQuestion;
import com.quizplatform.domain.question.Question;
import com.quizplatform.domain.question.ShortTextQuestion;
import com.quizplatform.domain.question.SingleChoiceQuestion;

import java.util.HashSet;
import java.util.List;

// Validates a list of polymorphic Question instances against the same rules
// as lib/schema.ts (the FE Zod schema). Called from QuizService before saving.
// Throws AppException.BadRequest on the first violation.
public final class QuestionListValidator {
    private QuestionListValidator() {}

    public static void validate(List<Question> questions) {
        if (questions == null || questions.isEmpty() || questions.size() > 50) {
            throw new com.quizplatform.application.exception.AppException.BadRequest(
                "Quiz must have between 1 and 50 questions");
        }
        for (var q : questions) validateOne(q);
    }

    private static void validateOne(Question q) {
        var text = q.getQuestion();
        if (text == null || text.length() < 3 || text.length() > 1000) {
            throw bad("question text must be 3..1000 chars");
        }
        if (q.getExplanation() != null && q.getExplanation().length() > 1000) {
            throw bad("explanation must be at most 1000 chars");
        }

        switch (q) {
            case SingleChoiceQuestion sc -> {
                checkOptions(sc.getOptions());
                if (sc.getCorrectAnswer() < 0 || sc.getCorrectAnswer() >= sc.getOptions().size()) {
                    throw bad("correctAnswer index out of range");
                }
            }
            case MultipleChoiceQuestion mc -> {
                checkOptions(mc.getOptions());
                var ans = mc.getCorrectAnswers();
                if (ans == null || ans.isEmpty()) {
                    throw bad("correctAnswers must have at least one entry");
                }
                for (var i : ans) {
                    if (i < 0 || i >= mc.getOptions().size()) throw bad("correctAnswers index out of range");
                }
                if (new HashSet<>(ans).size() != ans.size()) {
                    throw bad("duplicate indices in correctAnswers");
                }
            }
            case ShortTextQuestion st -> {
                if (st.getCorrectAnswer() == null
                    || st.getCorrectAnswer().isEmpty()
                    || st.getCorrectAnswer().length() > 200) {
                    throw bad("short_text correctAnswer must be 1..200 chars");
                }
            }
            default -> { /* TrueFalseQuestion has no extra checks */ }
        }
    }

    private static void checkOptions(List<String> options) {
        if (options == null || options.size() < 2 || options.size() > 6) {
            throw bad("options must have 2..6 entries");
        }
        for (var s : options) {
            if (s == null || s.isEmpty() || s.length() > 500) {
                throw bad("each option must be 1..500 chars");
            }
        }
    }

    private static com.quizplatform.application.exception.AppException.BadRequest bad(String m) {
        return new com.quizplatform.application.exception.AppException.BadRequest(m);
    }
}
