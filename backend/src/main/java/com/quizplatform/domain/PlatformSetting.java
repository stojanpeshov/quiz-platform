package com.quizplatform.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "platform_settings")
public class PlatformSetting {

    @Id
    @Column(name = "key", nullable = false)
    private String key;

    @Column(name = "value", nullable = false)
    private String value = "";

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
