package com.quizplatform.domain.answer;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;

// Answer payload submitted with an attempt and stored verbatim in attempts.answers
// (JSONB). Mirrors the Answer discriminated union in lib/grading.ts.

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = Answer.SingleChoice.class,   name = "single_choice"),
    @JsonSubTypes.Type(value = Answer.MultipleChoice.class, name = "multiple_choice"),
    @JsonSubTypes.Type(value = Answer.TrueFalse.class,      name = "true_false"),
    @JsonSubTypes.Type(value = Answer.ShortText.class,      name = "short_text"),
})
public abstract sealed class Answer
    permits Answer.SingleChoice, Answer.MultipleChoice, Answer.TrueFalse, Answer.ShortText {

    public static final class SingleChoice extends Answer {
        private int value;
        public int getValue() { return value; }
        public void setValue(int value) { this.value = value; }
    }

    public static final class MultipleChoice extends Answer {
        private List<Integer> value;
        public List<Integer> getValue() { return value; }
        public void setValue(List<Integer> value) { this.value = value; }
    }

    public static final class TrueFalse extends Answer {
        private boolean value;
        public boolean getValue() { return value; }
        public void setValue(boolean value) { this.value = value; }
    }

    public static final class ShortText extends Answer {
        private String value;
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
    }
}
