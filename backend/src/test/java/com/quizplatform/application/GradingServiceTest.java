package com.quizplatform.application;

import com.quizplatform.application.service.GradingService;
import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.answer.Answer;
import com.quizplatform.domain.question.MultipleChoiceQuestion;
import com.quizplatform.domain.question.Question;
import com.quizplatform.domain.question.ShortTextQuestion;
import com.quizplatform.domain.question.SingleChoiceQuestion;
import com.quizplatform.domain.question.TrueFalseQuestion;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Parity with lib/grading.ts. Each case here was hand-checked against the
// TypeScript implementation. If you change either side, update both.
class GradingServiceTest {

    private final GradingService grader = new GradingService();

    @Test
    void singleChoice_correctAndWrong() {
        var quiz = quiz(sc("Pick B", List.of("A", "B", "C"), 1));
        var graded = grader.grade(quiz, List.of(answerSc(1)));
        assertTrue(graded.perQuestion().get(0).correct());
        assertEquals(100, graded.scorePct());

        var wrong = grader.grade(quiz, List.of(answerSc(0)));
        assertFalse(wrong.perQuestion().get(0).correct());
        assertEquals(0, wrong.scorePct());
    }

    @Test
    void multipleChoice_setEqualityIgnoresOrder() {
        var q = mc("Pick A and C", List.of("A", "B", "C"), List.of(0, 2));
        var quiz = quiz(q);

        var inOrder = grader.grade(quiz, List.of(answerMc(List.of(0, 2))));
        var reversed = grader.grade(quiz, List.of(answerMc(List.of(2, 0))));
        var subset = grader.grade(quiz, List.of(answerMc(List.of(0))));
        var superset = grader.grade(quiz, List.of(answerMc(List.of(0, 1, 2))));

        assertTrue(inOrder.perQuestion().get(0).correct());
        assertTrue(reversed.perQuestion().get(0).correct());
        assertFalse(subset.perQuestion().get(0).correct());
        assertFalse(superset.perQuestion().get(0).correct());
    }

    @Test
    void trueFalse() {
        var quiz = quiz(tf("The sky is blue", true));
        assertTrue(grader.grade(quiz, List.of(answerTf(true))).perQuestion().get(0).correct());
        assertFalse(grader.grade(quiz, List.of(answerTf(false))).perQuestion().get(0).correct());
    }

    @Test
    void shortText_normalizesWhitespaceAndCase() {
        var quiz = quiz(st("Capital of New York?", "New York"));
        // case-insensitive
        assertTrue(grader.grade(quiz, List.of(answerSt("new york"))).perQuestion().get(0).correct());
        // leading/trailing whitespace stripped
        assertTrue(grader.grade(quiz, List.of(answerSt("  NEW YORK  "))).perQuestion().get(0).correct());
        // multiple internal whitespace collapsed to single space
        assertTrue(grader.grade(quiz, List.of(answerSt("New   York"))).perQuestion().get(0).correct());
        // missing internal space is NOT treated equal (original normalize collapses, not removes)
        assertFalse(grader.grade(quiz, List.of(answerSt("NewYork"))).perQuestion().get(0).correct());
        assertFalse(grader.grade(quiz, List.of(answerSt("Boston"))).perQuestion().get(0).correct());
    }

    @Test
    void typeMismatchAlwaysFalse() {
        var quiz = quiz(sc("Pick B", List.of("A", "B"), 1));
        var graded = grader.grade(quiz, List.of(answerTf(true)));
        assertFalse(graded.perQuestion().get(0).correct());
    }

    @Test
    void scorePct_roundsHalfAwayFromZero() {
        // 1 correct out of 3 = 33.33...% → rounds to 33
        var quiz = quiz(
            tf("a", true), tf("b", true), tf("c", true));
        var graded = grader.grade(quiz, List.of(answerTf(true), answerTf(false), answerTf(false)));
        assertEquals(33, graded.scorePct());

        // 2 correct out of 3 = 66.66...% → rounds to 67
        var graded2 = grader.grade(quiz, List.of(answerTf(true), answerTf(true), answerTf(false)));
        assertEquals(67, graded2.scorePct());
    }

    // ---- builders ----
    private static Quiz quiz(Question... qs) {
        var q = new Quiz();
        q.setQuestions(new ArrayList<>(List.of(qs)));
        return q;
    }
    private static SingleChoiceQuestion sc(String text, List<String> options, int correct) {
        var q = new SingleChoiceQuestion();
        q.setQuestion(text); q.setOptions(options); q.setCorrectAnswer(correct);
        return q;
    }
    private static MultipleChoiceQuestion mc(String text, List<String> options, List<Integer> correct) {
        var q = new MultipleChoiceQuestion();
        q.setQuestion(text); q.setOptions(options); q.setCorrectAnswers(correct);
        return q;
    }
    private static TrueFalseQuestion tf(String text, boolean correct) {
        var q = new TrueFalseQuestion();
        q.setQuestion(text); q.setCorrectAnswer(correct);
        return q;
    }
    private static ShortTextQuestion st(String text, String correct) {
        var q = new ShortTextQuestion();
        q.setQuestion(text); q.setCorrectAnswer(correct);
        return q;
    }
    private static Answer.SingleChoice answerSc(int v) {
        var a = new Answer.SingleChoice(); a.setValue(v); return a;
    }
    private static Answer.MultipleChoice answerMc(List<Integer> v) {
        var a = new Answer.MultipleChoice(); a.setValue(v); return a;
    }
    private static Answer.TrueFalse answerTf(boolean v) {
        var a = new Answer.TrueFalse(); a.setValue(v); return a;
    }
    private static Answer.ShortText answerSt(String v) {
        var a = new Answer.ShortText(); a.setValue(v); return a;
    }
}
