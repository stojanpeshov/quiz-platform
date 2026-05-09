package com.quizplatform.domain.question;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;

// "Public" question hierarchy with the answer keys removed. Sent to non-author
// takers so the FE can render the quiz without knowing the answers. Mirrors
// stripAnswers() in lib/schema.ts.

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = PublicQuestion.PublicSingleChoice.class,   name = "single_choice"),
    @JsonSubTypes.Type(value = PublicQuestion.PublicMultipleChoice.class, name = "multiple_choice"),
    @JsonSubTypes.Type(value = PublicQuestion.PublicTrueFalse.class,      name = "true_false"),
    @JsonSubTypes.Type(value = PublicQuestion.PublicShortText.class,      name = "short_text"),
})
public abstract sealed class PublicQuestion
    permits PublicQuestion.PublicSingleChoice, PublicQuestion.PublicMultipleChoice,
            PublicQuestion.PublicTrueFalse, PublicQuestion.PublicShortText {

    protected String question;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public static final class PublicSingleChoice extends PublicQuestion {
        private List<String> options;
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
    }

    public static final class PublicMultipleChoice extends PublicQuestion {
        private List<String> options;
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
    }

    public static final class PublicTrueFalse extends PublicQuestion {}
    public static final class PublicShortText extends PublicQuestion {}

    /** Strip answer fields from a Question into the corresponding PublicQuestion. */
    public static PublicQuestion from(Question q) {
        return switch (q) {
            case SingleChoiceQuestion sc -> {
                var p = new PublicSingleChoice();
                p.setQuestion(sc.getQuestion());
                p.setOptions(sc.getOptions());
                yield p;
            }
            case MultipleChoiceQuestion mc -> {
                var p = new PublicMultipleChoice();
                p.setQuestion(mc.getQuestion());
                p.setOptions(mc.getOptions());
                yield p;
            }
            case TrueFalseQuestion tf -> {
                var p = new PublicTrueFalse();
                p.setQuestion(tf.getQuestion());
                yield p;
            }
            case ShortTextQuestion st -> {
                var p = new PublicShortText();
                p.setQuestion(st.getQuestion());
                yield p;
            }
        };
    }
}
