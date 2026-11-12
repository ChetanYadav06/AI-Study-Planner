package com.aistudyplanner.dto;

import java.util.List;
import java.util.Map;

public class DayTopicsAndExpansionsResponse {

    private int dayNumber;
    private List<RoadmapResponse.DailyTopic> baseTopics;
    private List<DayExtraTopicResponse> extraTopics;
    private Map<String, Map<Integer, String>> expansions;

    public DayTopicsAndExpansionsResponse() {
    }

    public DayTopicsAndExpansionsResponse(int dayNumber,
                                          List<RoadmapResponse.DailyTopic> baseTopics,
                                          List<DayExtraTopicResponse> extraTopics,
                                          Map<String, Map<Integer, String>> expansions) {
        this.dayNumber = dayNumber;
        this.baseTopics = baseTopics;
        this.extraTopics = extraTopics;
        this.expansions = expansions;
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(int dayNumber) {
        this.dayNumber = dayNumber;
    }

    public List<RoadmapResponse.DailyTopic> getBaseTopics() {
        return baseTopics;
    }

    public void setBaseTopics(List<RoadmapResponse.DailyTopic> baseTopics) {
        this.baseTopics = baseTopics;
    }

    public List<DayExtraTopicResponse> getExtraTopics() {
        return extraTopics;
    }

    public void setExtraTopics(List<DayExtraTopicResponse> extraTopics) {
        this.extraTopics = extraTopics;
    }

    public Map<String, Map<Integer, String>> getExpansions() {
        return expansions;
    }

    public void setExpansions(Map<String, Map<Integer, String>> expansions) {
        this.expansions = expansions;
    }
}
