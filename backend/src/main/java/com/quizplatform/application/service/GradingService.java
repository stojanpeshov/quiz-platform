package com.quizplatform.application.service;

import com.quizplatform.application.dto.QuizDtos.PerQuestionResult;
import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.answer.Answer;
import com.quizplatform.domain.question.MultipleChoiceQuestion;
import com.quizplatform.domain.question.Question;
import com.quizplatform.domain.question.ShortTextQuestion;
import com.quizplatform.domain.question.SingleChoiceQuestion;
import com.quizplatform.domain.question.TrueFalseQuestion;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.regex.Pattern;

// Pure port of lib/grading.ts. Identical behaviour:
//   * type mismatch (or missing answer) → false
//   * single_choice / true_false → exact match
//   * multiple_choice → set equality (order-independent)
//   * short_text → normalized comparison (trim, lowercase, collapse whitespace)
//   * scorePct = round((correct / total) * 100), JS-compatible (HALF_AWAY_FROM_ZERO)
@Service
public class GradingService {

    public record GradedResult(int correctCount, int totalCount, int scorePct, List<PerQuestionResult> perQuestion) {}

    private static final Pattern WS = Pattern.compile("\\s+");

    public GradedResult grade(Quiz quiz, List<Answer> answers) {
        var per = new ArrayList<PerQuestionResult>(quiz.getQuestions().size());
        int correct = 0;
        for (int i = 0; i < quiz.getQuestions().size(); i++) {
            var q = quiz.getQuestions().get(i);
            var a = i < answers.size() ? answers.get(i) : null;
            boolean ok = isCorrect(q, a);
            per.add(new PerQuestionResult(ok, expectedOf(q)));
            if (ok) correct++;
        }
        int total = quiz.getQuestions().size();
        int scorePct = total == 0
            ? 0
            : (int) Math.round(correct * 100.0 / total);
        return new GradedResult(correct, total, scorePct, per);
    }

    private static boolean isCorrect(Question q, Answer a) {
        if (a == null) return false;
        return switch (q) {
            case SingleChoiceQuestion sc ->
                a instanceof Answer.SingleChoice sca && sca.getValue() == sc.getCorrectAnswer();
            case MultipleChoiceQuestion mc when a instanceof Answer.MultipleChoice mca ->
                mca.getValue() != null
                    && mca.getValue().size() == mc.getCorrectAnswers().size()
                    && new HashSet<>(mca.getValue()).equals(new HashSet<>(mc.getCorrectAnswers()));
            case TrueFalseQuestion tf ->
                a instanceof Answer.TrueFalse tfa && tfa.getValue() == tf.getCorrectAnswer();
            case ShortTextQuestion st ->
                a instanceof Answer.ShortText sta
                    && normalize(sta.getValue()).equals(normalize(st.getCorrectAnswer()));
            default -> false;
        };
    }

    private static Object expectedOf(Question q) {
        return switch (q) {
            case SingleChoiceQuestion sc -> sc.getCorrectAnswer();
            case MultipleChoiceQuestion mc -> mc.getCorrectAnswers();
            case TrueFalseQuestion tf -> tf.getCorrectAnswer();
            case ShortTextQuestion st -> st.getCorrectAnswer();
        };
    }

    private static String normalize(String s) {
        if (s == null) return "";
        return WS.matcher(s.trim().toLowerCase()).replaceAll(" ");
    }
}
