package com.quizplatform;

import com.quizplatform.config.AzureAdProperties;
import com.quizplatform.config.CorsProperties;
import com.quizplatform.config.PlatformProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({ AzureAdProperties.class, CorsProperties.class, PlatformProperties.class })
public class QuizPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(QuizPlatformApplication.class, args);
    }
}
