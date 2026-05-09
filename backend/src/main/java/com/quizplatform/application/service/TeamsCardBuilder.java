package com.quizplatform.application.service;

import com.quizplatform.domain.Achievement;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Pure builder. Mirrors buildAdaptiveCard in lib/teams.ts. Returns an Object
// graph Jackson can serialize directly; we use ordered maps to keep the card
// JSON deterministic (helpful for parity testing with the original output).
public final class TeamsCardBuilder {
    private TeamsCardBuilder() {}

    public static Object build(Achievement ach, String userName, String quizTitle,
                               Integer scorePct, Integer totalPoints, String platformUrl) {
        var facts = new ArrayList<Map<String, Object>>();
        if (quizTitle != null && !quizTitle.isBlank()) facts.add(fact("Quiz", quizTitle));
        if (scorePct != null) facts.add(fact("Score", scorePct + "%"));
        if (totalPoints != null) facts.add(fact("Total points", String.valueOf(totalPoints)));

        var body = new ArrayList<Map<String, Object>>();
        body.add(orderedMap(
            "type", "TextBlock",
            "text", ach.getIcon() + "  Achievement unlocked",
            "weight", "Bolder",
            "size", "Medium",
            "color", "Accent"));
        body.add(orderedMap(
            "type", "TextBlock",
            "text", "**" + userName + "** earned **" + ach.getName() + "**",
            "wrap", true));
        body.add(orderedMap(
            "type", "TextBlock",
            "text", ach.getDescription(),
            "wrap", true,
            "isSubtle", true,
            "size", "Small"));
        if (!facts.isEmpty()) {
            body.add(orderedMap("type", "FactSet", "facts", facts));
        }

        var actions = List.of(orderedMap(
            "type", "Action.OpenUrl",
            "title", "View on platform",
            "url", platformUrl + "/me/achievements"));

        var content = orderedMap(
            "$schema", "http://adaptivecards.io/schemas/adaptive-card.json",
            "type", "AdaptiveCard",
            "version", "1.4",
            "body", body,
            "actions", actions);

        var attachment = orderedMap(
            "contentType", "application/vnd.microsoft.card.adaptive",
            "content", content);

        return orderedMap("type", "message", "attachments", List.of(attachment));
    }

    private static Map<String, Object> fact(String title, String value) {
        return orderedMap("title", title, "value", value);
    }

    private static Map<String, Object> orderedMap(Object... kv) {
        var m = new LinkedHashMap<String, Object>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }
}
