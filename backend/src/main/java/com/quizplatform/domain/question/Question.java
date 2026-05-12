package com.quizplatform.domain.question;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

// Polymorphic JSON tree stored inside Quiz.questions (JSONB column). The wire
// shape mirrors lib/schema.ts:
//   { "type": "single_choice", "question": "...", "options": ["a","b"], "correctAnswer": 0, "explanation": "..." }
//
// Hibernate 6 maps List<Question> to JSONB via @JdbcTypeCode(SqlTypes.JSON) on
// the Quiz entity field; Jackson handles the polymorphic discriminator below.

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = SingleChoiceQuestion.class,   name = "single_choice"),
    @JsonSubTypes.Type(value = MultipleChoiceQuestion.class, name = "multiple_choice"),
    @JsonSubTypes.Type(value = TrueFalseQuestion.class,      name = "true_false"),
    @JsonSubTypes.Type(value = ShortTextQuestion.class,      name = "short_text"),
})
public abstract sealed class Question
    permits SingleChoiceQuestion, MultipleChoiceQuestion, TrueFalseQuestion, ShortTextQuestion {

    protected String question;
    protected String explanation;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
}
